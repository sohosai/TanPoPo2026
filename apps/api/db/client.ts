import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// DB を使わない地図データ系スクリプトからも router 経由で import されるため、
// ここでは DATABASE_URL を必須にしない。サーバー起動時の検証は index.ts で行う。
const pool = mysql.createPool({ uri: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema, mode: 'default' });
