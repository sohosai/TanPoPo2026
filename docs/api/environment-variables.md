# API Environment Variables

Worker の環境変数は、本番では `apps/api/wrangler.jsonc` の `vars`（秘密情報は `wrangler secret`）、ローカルでは `apps/api/.dev.vars` で渡す。型は `apps/api/env.ts` の `AppEnv`。

| 名前 | 種別 | 説明 |
| --- | --- | --- |
| `DB` | D1 binding | アプリのデータベース。詳細は [database.md](./database.md) |
| `SOS_API_URL` | var | SOS公開APIのベースURL。空の場合はダミーの企画データを返す |
| `GRANDPRIX_WIN_RATE` | var | 雙峰祭グランプリ抽選の当選率（0〜1の小数） |
| `LINE_CHANNEL_ID` | var | LINEログインチャネルのChannel ID（[LINE Developers Console](https://developers.line.biz/console/)で発行） |
| `LINE_CHANNEL_SECRET` | secret | LINEログインチャネルのChannel Secret。**非公開情報**。本番は `wrangler secret put LINE_CHANNEL_SECRET` で登録する |
| `LINE_CALLBACK_URL` | var | LINEログインのコールバックURL（`<Webのオリジン>/auth/line/callback`）。LINE Developers Console側にも同じ値を登録する |

ローカルでは Web（`http://localhost:5173`）の Vite プロキシ経由で API を受けるため、`LINE_CALLBACK_URL` は `http://localhost:5173/auth/line/callback` にする。
