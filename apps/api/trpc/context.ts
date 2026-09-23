import type { Context as HonoContext } from 'hono';
import { getCookie } from 'hono/cookie';
import {
  getSessionUser,
  SESSION_COOKIE_NAME,
  type SessionUser,
} from '../auth/session';

export type TRPCContext = {
  env: NodeJS.ProcessEnv;
  user: SessionUser | null;
};

export async function createTRPCContext(c: HonoContext): Promise<TRPCContext> {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = await getSessionUser(token);

  return {
    env: process.env,
    user,
  };
}
