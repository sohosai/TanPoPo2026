# デプロイ（Cloudflare Workers）

1 つの Worker（`apps/api/wrangler.jsonc` の `tanpopo`）が以下をまとめて配信する。

```
tanpopo Worker
├─ /trpc/*, /auth/*  → Hono（apps/api/index.ts）
├─ それ以外          → Static Assets（apps/web/build/client、SPA フォールバックあり）
└─ binding: DB       → D1（tanpopo）
```

Web と API が同一オリジンになるため、CORS や cookie のクロスサイト設定は不要。

## 初回のみ必要な準備

1. D1 データベースを作成し、出力された `database_id` を `apps/api/wrangler.jsonc` の `d1_databases[0].database_id` に書く。

   ```bash
   cd apps/api
   bunx wrangler d1 create tanpopo
   ```

2. `apps/api/wrangler.jsonc` の `vars` に本番値を設定する（`LINE_CHANNEL_ID`, `LINE_CALLBACK_URL` など）。各値の意味は [environment-variables.md](./environment-variables.md)。
3. LINE のチャネルシークレットを登録する。

   ```bash
   bunx wrangler secret put LINE_CHANNEL_SECRET
   ```

4. LINE Developers Console に本番のコールバックURL（`https://<本番のドメイン>/auth/line/callback`）を登録する。
5. MapTiler の API キーを `apps/web/.env` の `VITE_MAPTILER_KEY` に書く（Web のビルド時に埋め込まれる。詳細は [web/environment-variables.md](../web/environment-variables.md)）。

## デプロイ

リポジトリのルートで実行する。

```bash
bun run deploy
```

Web のビルド → 本番 D1 へのマイグレーション適用（`wrangler d1 migrations apply DB --remote`）→ `wrangler deploy` の順に実行される。

CI から実行する場合は、環境変数 `CLOUDFLARE_API_TOKEN`（Workers Scripts と D1 の編集権限）と `CLOUDFLARE_ACCOUNT_ID`、Web のビルド用に `VITE_MAPTILER_KEY` を渡す。

## 注意点

- Windows では `wrangler dev` の実行中に `apps/web` をビルドすると、`build/client` がロックされて削除に失敗する。ビルド前に `wrangler dev` を止める。
- SOS の企画一覧は Worker の isolate 内で 30 秒キャッシュする。isolate をまたいだ共有はしない。
