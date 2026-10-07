import { getSessionUser, type SessionUser } from '../auth/session';

export type TRPCContext = {
  env: NodeJS.ProcessEnv;
  user: SessionUser | null;
};

export async function createTRPCContext(
  sessionToken?: string,
): Promise<TRPCContext> {
  return {
    env: process.env,
    user: await getSessionUser(sessionToken),
  };
}
