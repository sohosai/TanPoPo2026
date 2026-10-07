import type { Database } from '../apps/api/db/client';
import type { AppEnv } from '../apps/api/env';
import { getSosClient } from '../apps/api/services/sos';
import { appRouter } from '../apps/api/trpc/router';

// 地図データ系スクリプトは shop / place の公開プロシージャしか呼ばず、DB や LINE の設定を使わない。
// Workers の外（Bun）で実行するため、env と db は渡さず SOS クライアントだけを用意する。
export function createMapDataCaller() {
  return appRouter.createCaller({
    env: {} as AppEnv,
    db: {} as Database,
    sos: getSosClient(process.env.SOS_API_URL ?? ''),
    user: null,
  });
}
