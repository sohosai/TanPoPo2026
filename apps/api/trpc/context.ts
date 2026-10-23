import { getSessionUser, type SessionUser } from '../auth/session';
import { createDb, type Database } from '../db/client';
import { isLineLoginEnabled } from '../domain/features';
import type { AppEnv } from '../env';
import { getSosClient, type SosClient } from '../services/sos';

export type TRPCContext = {
  env: AppEnv;
  db: Database;
  sos: SosClient;
  user: SessionUser | null;
};

export async function createTRPCContext(
  env: AppEnv,
  sessionToken: string | undefined,
): Promise<TRPCContext> {
  const db = createDb(env.DB);
  return {
    env,
    db,
    sos: getSosClient(env.SOS_API_URL, env.HIDDEN_PROJECT_NUMBERS),
    // LINE ログインを無効にしている間は、残っているセッションの Cookie も読まない。
    user: isLineLoginEnabled(env)
      ? await getSessionUser(db, sessionToken)
      : null,
  };
}
