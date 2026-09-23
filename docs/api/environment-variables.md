# API Environment Variables

| 環境変数名 | デフォルト値 | 説明 |
| --- | --- | --- |
| `PORT` | `3001` | APIサーバーの待受ポート |
| `ORIGIN` | `http://localhost:5173` | CORSで許可するWeb側Origin |
| `SOS_API_URL` | - | SOS公開APIのベースURL |
| `DATABASE_URL` | - | MySQL接続文字列。`mysql://<user>:<password>@<host>:<port>/<database>`。詳細は [database.md](./database.md) |
| `WEB_APP_URL` | `http://localhost:5173` | LINEログイン完了後にリダイレクトするWeb側のベースURL |
| `LINE_CHANNEL_ID` | - | LINEログインチャネルのChannel ID（[LINE Developers Console](https://developers.line.biz/console/)で発行） |
| `LINE_CHANNEL_SECRET` | - | LINEログインチャネルのChannel Secret。**非公開情報** |
| `LINE_CALLBACK_URL` | - | LINEログインのコールバックURL。LINE Developers Console側にも同じ値を登録する必要がある |
| `GRANDPRIX_WIN_RATE` | `0.2` | 雙峰祭グランプリ抽選の当選率（0〜1の小数）。コード変更なしで調整できる |
