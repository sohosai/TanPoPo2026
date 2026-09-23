import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';

// drizzle-kit の `migrate` CLI は環境によって適用後にクラッシュし、
// __drizzle_migrations への記録が抜けることがあるため、
// drizzle-orm のマイグレーター関数を直接呼ぶスクリプトで代替する。

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(pool);

await migrate(db, { migrationsFolder: './db/migrations' });
console.log('Migrations applied.');

await pool.end();
