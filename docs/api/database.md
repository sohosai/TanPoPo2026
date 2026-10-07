# データベース（Cloudflare D1 / Drizzle ORM）

LINEログイン・雙峰祭グランプリ投票・来場者アンケートの永続化に Cloudflare D1（SQLite）を使う。

- ORM: [Drizzle ORM](https://orm.drizzle.team/)（`drizzle-orm/d1`）
- スキーマ定義: `apps/api/db/schema.ts`
- マイグレーション: `apps/api/db/migrations`（`drizzle-kit` で生成し、`wrangler d1 migrations apply` で適用）
- Worker からは binding `DB` として参照する（`apps/api/wrangler.jsonc`）

Place（建物・ステージ等）や Shop（企画）は DB 化せず、インメモリ／外部 SOS API から配信する。グランプリ投票の `shopId` / ステージ選択などは文字列として保存するのみで、外部キー制約は持たない。

## ローカル開発

ローカルの D1 は `wrangler dev` が `apps/api/.wrangler/state` に作る SQLite ファイルで、Cloudflare アカウントは不要。

```bash
bun run db:migrate   # 未適用のマイグレーションを適用
bun run db:reset     # ローカルDBを削除し、マイグレーションを最初から適用し直す
```

中身を直接見たいときは `wrangler d1 execute` を使う。

```bash
cd apps/api
bunx wrangler d1 execute DB --local --command "SELECT * FROM users"
```

## スキーマを変更したとき

`apps/api/db/schema.ts` を編集したら、マイグレーションファイルを生成してから適用する。

```bash
bun run --cwd apps/api db:generate   # db/migrations/ に SQL を生成
bun run db:migrate                   # ローカルDBに適用
```

生成された `apps/api/db/migrations/*.sql` はコミット対象。本番DBへの適用は `apps/api` の `deploy` スクリプトがデプロイ前に行う。

## 注意点

- D1 は対話的なトランザクション（`db.transaction`）に対応していない。複数の書き込みを原子的に行う場合は `db.batch([...])` を使う。
- 日時は UNIX 秒の整数（`integer({ mode: 'timestamp' })`）として保存する。
- 一意制約違反はエラーコードではなくメッセージ（`UNIQUE constraint failed`）で判定する（`apps/api/db/errors.ts`）。
