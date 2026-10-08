import type { D1Database } from '@cloudflare/workers-types';

// wrangler.jsonc の vars / d1_databases と、`.env`（本番は wrangler secret）で渡す値。
// web 側の型チェックからも参照されるため、グローバル型に頼らず明示的に定義する。
export type AppEnv = {
  DB: D1Database;
  SOS_API_URL: string;
  GRANDPRIX_WIN_RATE: string;
  HIDDEN_PROJECT_NUMBERS: string;
  GRANDPRIX_HIDDEN_PROJECT_NUMBERS: string;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  LINE_CALLBACK_URL: string;
};
