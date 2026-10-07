import { defineConfig } from 'drizzle-kit';

// マイグレーションSQLの生成専用。適用は wrangler d1 migrations apply で行う。
export default defineConfig({
  dialect: 'sqlite',
  schema: './db/schema.ts',
  out: './db/migrations',
});
