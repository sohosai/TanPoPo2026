# 企画のマスターデータ

企画の情報は `apps/api/data/projects.json` に企画番号順でまとまっている。API はこのファイルを読んで企画一覧を返すため、サイトに出る企画の内容を確かめるときはここを見ればよい。

```jsonc
[
  {
    "number": "001",            // 3桁ゼロ埋めの企画番号（URL に使う）
    "id": "cmo6fjrq8002kqx01h8sfve0t", // SOS の企画 ID（お気に入り・グランプリ投票のキー）
    "name": "jsys25ごはん",
    "organization": "jsys25",
    "category": "食事",          // 絞り込みの分類
    "schedule": ["Day1", "Day2"],
    "locations": [{ "placeId": "booth-g", "room": "G1", "days": ["Day1", "Day2"] }],
    "performances": [],         // ステージの出演枠
    "description": "…",
    "links": [{ "kind": "x", "label": "@jsys25", "url": "https://x.com/jsys25" }]
  }
]
```

画像と公開状態（中止）は当日に変わりうるため、マスターには含めず API が実行時に SOS から取得して付け足す（SOS に無い手で追加した企画だけは、画像をマスターに持つ。下の「SOS に無い企画」）。それ以外の項目はマスターが優先され、実行時の SOS の内容では上書きしない。SOS に無い企画もマスターにあれば掲載し、マスターに無い企画は SOS にあっても掲載しない。

## SOS との同期

デプロイはコミット済みのマスターをそのまま使い、ビルド時に SOS から取り直さない。SOS の登録内容を取り込むときは次を実行し、表示された追加・削除・変更を確認してからコミットする。

```sh
bun run sync:projects
```

## 元データ

マスターは生成物で、直接は編集しない。取得元ごとの元データを `apps/api/data/sources/` に置き、`bun run build:projects` でまとめる。各 import スクリプトは元データを書き出した後にマスターを作り直す。

| 元データ | 内容 | 取得元 | 更新コマンド |
| --- | --- | --- | --- |
| `sos-projects.json` | 掲載する企画と、名前・団体・区分・説明文・リンク | SOS 公開 API | `bun run sync:projects` |
| `project-categories.json` | 分類 | 実行委員会の CSV。[project-categories.md](./project-categories.md) | `bun run import:project-categories <企画一覧.csv> <学術企画.csv>` |
| `committee-projects.json` | 委員会企画の企画番号 | 手で管理 | 直接編集して `bun run build:projects` |
| `manual-projects.json` | SOS に無い企画（マスターと同じ形の配列） | 手で管理 | 直接編集して `bun run build:projects` |
| `project-locations.json` | 屋内・屋外の実施場所と実施日 | 実行委員会の xlsx。[project-locations.md](./project-locations.md) | `bun run import:project-locations <屋内.xlsx> <屋外.xlsx>` |
| `stage-projects.json` | ステージ企画の実施ステージ | SOS 公開 API のカスタム項目 | `bun run import:stage-projects` |
| `stage-timetable.json` | ステージの出演枠 | 公式サイトのタイムテーブル | `bun run import:stage-timetable`（`apps/api` の build でも実行） |

元データとマスターはどちらもコミットする。

## SOS に無い企画

実行委員会の福引所のように SOS に登録の無い企画は、`manual-projects.json` にマスターと同じ形で書く。`bun run build:projects` がそのままマスターに足し、企画番号順に並べる。

- 企画番号は SOS の番号と重ならない値にする（今は 900 番台）。重なると `build:projects` がエラーで止まる。`id` は SOS の ID の代わりに `manual-<名前>` とする（お気に入り・グランプリ投票のキー）。
- 実施場所（`locations`）・実施日（`schedule`）もこのファイルに書く。屋外のテントは `place.ts` に Place、`booths.geojson` にテントの形を足す（[project-locations.md](./project-locations.md)）。`bun run check:map-data` がこのファイルの実施場所も確かめる。
- 画像は SOS から取れないため、`apps/web/public/projects/<名前>/` に WebP で置き、`thumbnail`・`images` に `src` と幅違いの `srcSet` を書く。アイコンは正方形にする。SOS に同じ番号の企画ができて画像が登録されれば、そちらが優先される。
