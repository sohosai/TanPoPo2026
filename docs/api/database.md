# データベース（MySQL / Drizzle ORM）

LINEログイン・雙峰祭グランプリ投票・来場者アンケートの永続化に MySQL を使う。ローカルでは Docker Compose で起動する。

- DB: MySQL 8.4（Docker）
- ORM: [Drizzle ORM](https://orm.drizzle.team/)（`mysql2` ドライバ）
- スキーマ定義: `apps/api/db/schema.ts`
- マイグレーション出力先: `apps/api/db/migrations`

Place（建物・ステージ等）や Shop（企画）は引き続き DB 化せず、現状どおりインメモリ／外部 SOS API から配信する。グランプリ投票の `shopId` / ステージ選択などは文字列として保存するのみで、外部キー制約は持たない。

## セットアップ手順

1. ルートの `.env.example` を `.env` にコピーし、必要なら値を変更する。

   ```bash
   cp .env.example .env
   ```

2. MySQL を起動する。

   ```bash
   docker compose up -d mysql
   ```

3. 依存関係をインストールする（未実施なら）。

   ```bash
   bun install
   ```

4. `apps/api/.env.example` を `apps/api/.env` にコピーし、`DATABASE_URL` を確認する（デフォルトのままで Docker Compose の設定と一致する）。

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

5. マイグレーションを実行する。

   ```bash
   bun run --cwd apps/api db:migrate
   ```

6. 通常どおり開発サーバーを起動する。

   ```bash
   bun run dev
   ```

## スキーマを変更したとき

`apps/api/db/schema.ts` を編集したら、マイグレーションファイルを生成してから適用する。

```bash
bun run --cwd apps/api db:generate   # db/migrations/ に SQL を生成
bun run --cwd apps/api db:migrate    # 生成された SQL を適用
```

生成された `apps/api/db/migrations/*.sql` はコミット対象。

## ローカルDBをリセットするとき

```bash
bun run db:reset
```

接続先DBの全テーブル（`__drizzle_migrations` を含む）を削除し、マイグレーションを最初から適用し直す。データはすべて消える。接続先ホストが `localhost` / `127.0.0.1` / `::1` 以外の場合は実行を拒否する（`--force` で解除できるが、本番DBには使わないこと）。

## 注意点

- `db:migrate` は `drizzle-kit migrate` CLI ではなく、`apps/api/db/migrate.ts`(`drizzle-orm` のマイグレーター関数を直接呼ぶ自前スクリプト)を使う。環境によっては `drizzle-kit migrate` CLI がテーブル作成後にクラッシュし、適用記録(`__drizzle_migrations`)が残らず次回以降 `already exists` エラーになるため。`db:generate`(マイグレーションSQLの生成)は通常どおり `drizzle-kit` を使う。
- `docker-compose.yml` の起動は turborepo の `dev` パイプラインには含まれない。`bun run dev` の前に手動で `docker compose up -d mysql` を実行すること。
- `docker-compose.yml` の `ports: 3306:3306` はローカル開発用。本番環境で同じ設定のままポートを公開しないこと。
- `.env` / `apps/api/.env` は `.gitignore` 済み。LINEログインのチャネルシークレットなど機密情報もここに置く（詳細は [line-login.md](./line-login.md) を参照）。
