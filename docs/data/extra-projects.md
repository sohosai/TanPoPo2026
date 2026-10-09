# SOS に無い企画の追加

SOS に登録されていない企画（実行委員会の企画など）は、`apps/api/data/extra-projects.json` に書くと SOS の企画と同じように一覧・詳細・地図・検索に出る。反映には PR のマージとデプロイが要る。

## 書き方

キーは企画番号（**900〜999**）、値は企画の内容。

```jsonc
{
  "901": {
    "name": "雙峰祭グランプリ2026 結果発表",
    "organization": "雙峰祭実行委員会",
    "category": "ステージ",
    "tags": ["実委企画"],
    "description": "投票で選ばれた企画を発表します。",
    "thumbnail": "/projects/901/icon.webp",
    "images": ["/projects/901/1.webp"],
    "links": ["https://sohosai.com", "https://x.com/sohosai"],
    "locations": [{ "placeId": "stage-united", "days": ["Day2"] }]
  }
}
```

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `name` | ✅ | 企画名 |
| `organization` | ✅ | 団体名 |
| `category` | ✅ | `食品` `物販` `展示` `学術` `ステージ` `その他` のいずれか |
| `locations` | ✅ | 実施場所（1 件以上）。形式は [project-locations.json](./project-locations.md) と同じ（`placeId`・`room`・`days`） |
| `tags` | – | 絞り込みのタグ |
| `description` | – | 詳細ページの説明文 |
| `thumbnail` | – | 一覧・詳細のアイコン画像 |
| `images` | – | 詳細ページの画像 |
| `links` | – | 公式サイト・SNS の URL。X・Instagram・YouTube はドメインで判定して SNS として表示し、同じアカウントの重複はまとめる |
| `performances` | – | ステージの出演枠。形式は `stage-timetable.json` と同じ（`placeId`・`day`・`start`・`end`・`title`）。省略するとタイムテーブルを企画番号で引く |
| `cancelled` | – | 中止なら `true` |

上に無い項目を書くと、API が起動しない（書き間違いを見逃さないため）。

## 企画番号

900〜999 の 3 桁にする。

- 企画番号は URL（`/project/901`）と並び順に 3 桁の文字列で使うため、桁を揃える。
- 非表示の環境変数（`HIDDEN_PROJECT_NUMBERS`）は数字の番号しか受け付けない。
- SOS の企画番号と分けておく。万一 SOS の企画と番号が重なったら、API は SOS の企画を優先してこちらを出さない。

企画の id は `extra-<番号>`（例: `extra-901`）になる。お気に入りはこの id で端末に保存されるため、公開後に番号を変えるとお気に入りが外れる。

## 画像

`/` で始めると `apps/web/public` 配下のファイル、`https://` で始めると外部の画像になる。

`apps/web/public/projects/<番号>/` に webp で置くのがよい。

- アプリと同じ所から配信されるため、外部の都合で消えない。
- オフライン用に、アプリの初回ダウンロードにまとめて含まれる。初回の通信量が増えるため、1 枚数百 KB 以内に縮める。

## グランプリ投票

追加した企画はグランプリ投票の対象にならない（投票の一覧に出ず、投票も受け付けない）。

## 検証

`bun run check:map-data`（CI でも実行）が次を確かめる。

- `placeId` が実在し、屋外ブースならテントの形があり、実施日が正しいか
- SOS の企画と番号が重なっていないか
- `/` で始まる画像が `apps/web/public` にあるか

番号の範囲・必須項目・項目名は API の起動時に検証され、誤りがあると型チェックとこのスクリプトの実行も失敗する。
