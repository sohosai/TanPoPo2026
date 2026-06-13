/**
 * Map 関連データの整合性検証スクリプト。
 *
 * 検証対象:
 *  - 場所属性（apps/api: place.list） … id 一意・kind・代表点の妥当性
 *  - 建物ポリゴン（buildings.geojson） … 形状・placeId の存在/一意・建物との対応
 *  - 通路ネットワーク（path-network.geojson） … 形状・kind・入口の placeId 参照・連結性
 *  - 店舗の場所参照（apps/api: shop.list） … locations[].placeId が存在するか
 *  - 座標が [経度, 緯度] の順かどうか（緯度経度の取り違え検出）
 *
 * 実行: bun run scripts/validate-map-data.ts
 * エラーがあれば終了コード 1 で終了する（CI に組み込み可能）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTRPCContext } from '../apps/api/trpc/context';
import { appRouter } from '../apps/api/trpc/router';

// place.ts の PlaceKind と一致させる（型は実行時に取れないためここで定義）。
const PLACE_KINDS = [
  'building',
  'stage',
  'bus_stop',
  'information',
  'parking',
  'trash',
] as const;

// つくば（雙峰祭会場）周辺のざっくり bbox。経度緯度の取り違え検出に使う。
const BBOX = { minLng: 139.9, maxLng: 140.3, minLat: 36.0, maxLat: 36.2 };

const DATA_DIR = join(
  import.meta.dir,
  '..',
  'apps/web/app/components/features/Map/data',
);

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

type Lng = number;
type Lat = number;
type Position = [Lng, Lat];

function inBbox([lng, lat]: Position): boolean {
  return (
    lng >= BBOX.minLng &&
    lng <= BBOX.maxLng &&
    lat >= BBOX.minLat &&
    lat <= BBOX.maxLat
  );
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'));
}

async function main() {
  const ctx = await createTRPCContext();
  const caller = appRouter.createCaller(ctx);
  const places = await caller.place.list();
  const shops = await caller.shop.list();

  const placeById = new Map(places.map((p) => [p.id, p]));

  // ---- 1. 場所属性 ----
  const seenIds = new Set<string>();
  for (const p of places) {
    if (seenIds.has(p.id)) err(`place: id が重複: ${p.id}`);
    seenIds.add(p.id);
    if (!(PLACE_KINDS as readonly string[]).includes(p.kind)) {
      err(`place ${p.id}: 不明な kind: ${p.kind}`);
    }
    if (!Array.isArray(p.point) || p.point.length !== 2) {
      err(`place ${p.id}: point が [lng,lat] でない`);
    } else if (!inBbox(p.point as Position)) {
      err(
        `place ${p.id}: point が範囲外（経度緯度の取り違え?）: ${JSON.stringify(p.point)}`,
      );
    }
  }

  // ---- 2. 建物ポリゴン ----
  const buildings = readJson('buildings.geojson') as {
    type: string;
    features: Array<{
      properties?: { placeId?: string };
      geometry?: { type?: string; coordinates?: Position[][] };
    }>;
  };
  if (buildings.type !== 'FeatureCollection') {
    err('buildings.geojson: FeatureCollection ではない');
  }
  const buildingPlaceIds = new Set<string>();
  for (const [i, f] of (buildings.features ?? []).entries()) {
    const where = `buildings[${i}]`;
    const placeId = f.properties?.placeId;
    if (!placeId) {
      err(`${where}: properties.placeId が無い`);
      continue;
    }
    if (buildingPlaceIds.has(placeId)) {
      err(`${where}: placeId が重複: ${placeId}`);
    }
    buildingPlaceIds.add(placeId);

    const place = placeById.get(placeId);
    if (!place) {
      err(`${where}: placeId が place に存在しない: ${placeId}`);
    } else if (place.kind !== 'building') {
      err(`${where}: placeId ${placeId} の kind が building でない（${place.kind}）`);
    }

    if (f.geometry?.type !== 'Polygon') {
      err(`${where} (${placeId}): geometry が Polygon でない`);
      continue;
    }
    const ring = f.geometry.coordinates?.[0];
    if (!ring || ring.length < 4) {
      err(`${where} (${placeId}): 外周リングの点が不足（4点以上必要）`);
      continue;
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      err(`${where} (${placeId}): 外周リングが閉じていない（先頭と末尾が不一致）`);
    }
    for (const pos of ring) {
      if (!inBbox(pos)) {
        err(`${where} (${placeId}): 座標が範囲外（取り違え?）: ${JSON.stringify(pos)}`);
        break;
      }
    }
  }

  // 建物 place なのにポリゴンが無いものは警告
  for (const p of places) {
    if (p.kind === 'building' && !buildingPlaceIds.has(p.id)) {
      warn(`place ${p.id}: kind=building だが buildings.geojson にポリゴンが無い`);
    }
  }

  // ---- 3. 通路ネットワーク ----
  const network = readJson('path-network.geojson') as {
    type: string;
    features: Array<{
      properties?: { kind?: string; placeId?: string };
      geometry?: { type?: string; coordinates?: Position[] };
    }>;
  };
  if (network.type !== 'FeatureCollection') {
    err('path-network.geojson: FeatureCollection ではない');
  }

  // 連結性チェック用の Union-Find（頂点を 6 桁丸めで同一視）。
  const nodeIndex = new Map<string, number>();
  const parent: number[] = [];
  const key = ([lng, lat]: Position) => `${lng.toFixed(6)},${lat.toFixed(6)}`;
  const nodeOf = (pos: Position) => {
    const k = key(pos);
    let idx = nodeIndex.get(k);
    if (idx === undefined) {
      idx = parent.length;
      nodeIndex.set(k, idx);
      parent.push(idx);
    }
    return idx;
  };
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  for (const [i, f] of (network.features ?? []).entries()) {
    const where = `path[${i}]`;
    const kind = f.properties?.kind;
    if (kind !== 'walkway' && kind !== 'entrance') {
      warn(`${where}: kind が walkway/entrance でない（${kind ?? 'なし'}）`);
    }
    if (f.geometry?.type !== 'LineString') {
      err(`${where}: geometry が LineString でない`);
      continue;
    }
    const coords = f.geometry.coordinates;
    if (!coords || coords.length < 2) {
      err(`${where}: 座標が 2 点未満`);
      continue;
    }
    for (const pos of coords) {
      if (!inBbox(pos)) {
        err(`${where}: 座標が範囲外（取り違え?）: ${JSON.stringify(pos)}`);
        break;
      }
    }
    // 入口は建物を参照していること
    if (kind === 'entrance') {
      const placeId = f.properties?.placeId;
      if (!placeId) {
        err(`${where}: kind=entrance だが placeId が無い`);
      } else {
        const place = placeById.get(placeId);
        if (!place) err(`${where}: entrance の placeId が place に存在しない: ${placeId}`);
        else if (place.kind !== 'building') {
          warn(`${where}: entrance の placeId ${placeId} が建物でない（${place.kind}）`);
        }
      }
    }
    // 連結性: 連続頂点を辺として union
    for (let j = 1; j < coords.length; j++) {
      union(nodeOf(coords[j - 1]), nodeOf(coords[j]));
    }
  }

  // 連結成分数（孤立した道/入口を検出）
  if (parent.length > 0) {
    const roots = new Set<number>();
    for (let i = 0; i < parent.length; i++) roots.add(find(i));
    if (roots.size > 1) {
      err(
        `path-network: 連結していない（${roots.size} 個の独立した塊）。入口や通路の端点座標が一致しているか確認（ルート探索が破綻する）`,
      );
    }
  }

  // ---- 4. 店舗の場所参照 ----
  for (const shop of shops) {
    if (!shop.locations || shop.locations.length === 0) {
      warn(`shop ${shop.id} (${shop.name}): locations が空`);
      continue;
    }
    for (const loc of shop.locations) {
      if (!placeById.has(loc.placeId)) {
        err(`shop ${shop.id} (${shop.name}): locations.placeId が存在しない: ${loc.placeId}`);
      }
    }
  }

  // ---- 結果 ----
  console.log(
    `検証対象: places=${places.length}, shops=${shops.length}, buildings=${buildings.features?.length ?? 0}, paths=${network.features?.length ?? 0}`,
  );
  for (const w of warnings) console.warn(`⚠️  ${w}`);
  if (errors.length === 0) {
    console.log(
      `✅ Map データは整合しています（警告 ${warnings.length} 件）。`,
    );
    process.exit(0);
  }
  for (const e of errors) console.error(`❌ ${e}`);
  console.error(`\n検証失敗: ${errors.length} 件のエラー、${warnings.length} 件の警告。`);
  process.exit(1);
}

main().catch((e) => {
  console.error('検証スクリプトの実行に失敗しました:', e);
  process.exit(1);
});
