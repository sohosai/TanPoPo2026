import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';

// 開発用: 接続先データベースの全テーブル（__drizzle_migrations を含む）を削除し、
// マイグレーションを最初から適用し直す。
// 誤って本番等を消さないよう、ローカルホスト以外への接続は --force なしでは拒否する。

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const url = new URL(process.env.DATABASE_URL);
const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]'];
if (!localHosts.includes(url.hostname) && !process.argv.includes('--force')) {
  throw new Error(
    `Refusing to reset non-local database (${url.hostname}). Pass --force to override.`,
  );
}

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 1,
});

const [rows] = await pool.query<mysql.RowDataPacket[]>(
  "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
);
const tables = rows.map((row) => row.name as string);

// connectionLimit: 1 なので FOREIGN_KEY_CHECKS の設定は後続の DROP と同じ接続に効く。
await pool.query('SET FOREIGN_KEY_CHECKS = 0');
for (const table of tables) {
  await pool.query(`DROP TABLE \`${table.replaceAll('`', '``')}\``);
}
await pool.query('SET FOREIGN_KEY_CHECKS = 1');
console.log(`Dropped ${tables.length} table(s).`);

await migrate(drizzle(pool), { migrationsFolder: './db/migrations' });
console.log('Migrations applied.');

await pool.end();
