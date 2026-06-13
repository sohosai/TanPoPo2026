# 建物・場所データの扱い方

地図検索とルート機能で使う「場所(Place)」のデータ構造と、**建物を追加する手順**をまとめる。

建物を含む場所データは「**属性**」「**ジオメトリ**」「**入口/接続路**」の3つに分かれて保管され、すべて安定 ID（`placeId`）で結合される。

## データの所在と役割

| 種類 | ファイル | 役割 | 結合キー |
| --- | --- | --- | --- |
| 属性 | `apps/api/trpc/routers/place.ts` | id / 名前 / 種別 / 代表点。`place.list` で配信 | `Place.id` |
| 建物ジオメトリ | `apps/web/app/components/features/Map/data/buildings.geojson` | 建物ポリゴン | `properties.placeId` |
| 入口/接続路 | `apps/web/app/components/features/Map/data/path-network.geojson` | 通路網。`kind:"entrance"` の feature が建物への接続路 | `properties.placeId` |
| 店舗の紐付け | `apps/api/trpc/routers/shop.ts` | `Shop.locations[].placeId`（建物）＋ `room`（表示） | `placeId` |


## 各データの構造

### 場所属性（`place.ts`）

```ts
type PlaceKind =
  | 'building' | 'stage' | 'bus_stop'
  | 'information' | 'parking' | 'trash';

type Place = {
  id: string;              // 安定ID。例 'bldg-5c'
  name: string;            // 検索・表示名。建物は建物名（"5C"）
  reading?: string;        // よみがな（任意・かな検索の補助）
  kind: PlaceKind;
  point: [number, number]; // 代表点 [経度, 緯度]。地図フォーカス/ルート終点に使う
};
```

建物は `kind: 'building'`。`point` はポリゴンの重心（フォーカス位置）。

### 建物ポリゴン（`buildings.geojson`）

```jsonc
{
  "type": "Feature",
  "properties": { "placeId": "bldg-5c", "name": "5C" },
  "geometry": { "type": "Polygon", "coordinates": [[[lng, lat], ...]] }
}
```

`properties.placeId` が `place.ts` の `Place.id` と一致することで属性と結合する。

### 入口/接続路（`path-network.geojson`）

建物の入口は**複数**持てる。各入口は `kind:"entrance"` + `placeId` を持つ LineString で表す。
**先頭座標が建物側（＝入口点）**、もう一端は通路ノードと座標を共有して連結する。

```jsonc
{
  "type": "Feature",
  "properties": { "kind": "entrance", "placeId": "bldg-5c", "name": "5C 南口" },
  "geometry": {
    "type": "LineString",
    "coordinates": [[140.1030449, 36.1033899], [140.103, 36.10339]]
  }
}
```

- 「その建物に接続する道」は `placeId` で明示される（座標の近さに依存しない）。
- web からは `apps/web/app/components/features/Map/paths.ts` の
  `entrancesForBuilding(placeId)` / `entrancePointsForBuilding(placeId)` で取得できる。

## 参照・表示の流れ

- 取得: `apps/web/app/lib/places.ts` の `usePlaces()` が `place.list` を購読し `id → Place` の Map を作る。
- キャッシュ: react-query persister（`apps/web/app/lib/trpc-provider.tsx`）で IndexedDB に保存され、オフラインでも参照できる。
- 表示ラベル: `formatShopLocation(shop)` が建物名＋部屋番号（例 "5C305"）に整形する。
- 地図デバッグ表示: URL に `?debug` を付けると、建物ポリゴン・通路・入口（緑）・ノードが地図に重なる（`apps/web/app/components/features/Map/debugLayers.ts`）。

```
place.ts ──place.list──> usePlaces() ──> 一覧/詳細/検索/地図フォーカス
      ▲ placeId
buildings.geojson / path-network.geojson(ジオメトリ・入口) ─┘ placeId で結合
shop.ts: Shop.locations[{ placeId, room }] ──────────────────┘
```

## 建物を追加する手順

例として建物コード `7A`（id `bldg-7a`）を追加する場合。

1. **placeId を決める** — `bldg-<コードを小文字>`（例 `bldg-7a`）。既存と重複しないこと。

2. **属性を追加** — `apps/api/trpc/routers/place.ts` の `places` 配列に1件足す。
   `point` はポリゴンの重心 `[経度, 緯度]`（経度が先）。

   ```ts
   { id: 'bldg-7a', name: '7A', kind: 'building', point: [140.xxxx, 36.xxxx] },
   ```

3. **ポリゴンを追加** — `buildings.geojson` の `features` に建物の輪郭を足す。
   `properties.placeId` は手順1の id と一致させる。

   ```jsonc
   {
     "type": "Feature",
     "properties": { "placeId": "bldg-7a", "name": "7A" },
     "geometry": { "type": "Polygon", "coordinates": [[[lng, lat], ...]] }
   }
   ```

4. **（任意）入口を追加** — ルート対応する場合は `path-network.geojson` に入口を足す。
   建物側の点から最寄りの通路ノードへ伸ばし、**ノード側の座標は既存通路と一致**させて連結する。
   入口が複数あれば同じ `placeId` で複数 feature を置く。

   ```jsonc
   {
     "type": "Feature",
     "properties": { "kind": "entrance", "placeId": "bldg-7a", "name": "7A 正面口" },
     "geometry": { "type": "LineString", "coordinates": [[建物側 lng, lat], [通路ノード lng, lat]] }
   }
   ```

5. **店舗を紐付ける**（必要なら） — `apps/api/trpc/routers/shop.ts` の `Shop.locations` で参照する。

   ```ts
   locations: [{ placeId: 'bldg-7a', room: '101' }]
   ```

6. **確認**
   - データ整合性: `bun run check:map-data`（id 重複・placeId 参照切れ・座標の取り違え・通路の連結性などを検査）
   - 型チェック: `bun run check`
   - 目視: `bun run dev` → `http://localhost:5173/?debug` で建物・入口が表示されるか
   - 検索: 建物名（"7A"）でヒットするか。部屋番号（"101"）は検索対象外（表示専用）。

## 注意点

- **座標の順序は `[経度, 緯度]`**（GeoJSON 準拠。緯度経度を逆にしない）。
- `placeId` は全 Place で一意。`bldg-` 接頭辞は建物に限る（ステージは `stage-`、バス停は `bus-` など）。
- `point`（重心）の算出例（外周座標の単純平均）:

  ```python
  ring = polygon[0]
  if ring[0] == ring[-1]: ring = ring[:-1]
  cx = sum(p[0] for p in ring) / len(ring)
  cy = sum(p[1] for p in ring) / len(ring)
  ```

- 現状、場所の点データは旧 `sohosai-map.json` 内にも埋め込みが残っている（移行元）。**正は `place.ts`** であり、地図スタイル側の旧データは将来撤去予定。建物の追加・更新は本ドキュメントの3ファイル（`place.ts` / `buildings.geojson` / `path-network.geojson`）で行う。
- データは現状すべて**モック**。将来データ側提供の正データに差し替える前提。
