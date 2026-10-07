import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createDb } from '../db/client';
import { users } from '../db/schema';
import type { AppEnv } from '../env';
import {
  exchangeCodeForIdToken,
  getAuthorizationUrl,
  LineAuthError,
  verifyIdToken,
} from '../services/line-auth';
import {
  createSession,
  destroySession,
  randomHex,
  SESSION_COOKIE_NAME,
} from './session';

const OAUTH_STATE_COOKIE = 'line_oauth_state';
const OAUTH_NONCE_COOKIE = 'line_oauth_nonce';
const OAUTH_REDIRECT_COOKIE = 'line_oauth_redirect';
const OAUTH_COOKIE_MAX_AGE = 600; // 10分
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

type AppContext = Context<{ Bindings: AppEnv }>;

// ローカル開発は http のため、Secure 属性は https で配信されているときだけ付ける。
function isSecureRequest(c: AppContext): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

/** オープンリダイレクト対策。相対パス以外は許可しない。 */
function sanitizeRedirectPath(raw: string | undefined): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export const authRoutes = new Hono<{ Bindings: AppEnv }>();

authRoutes.get('/line/login', (c) => {
  const state = randomHex(16);
  const nonce = randomHex(16);
  const redirect = sanitizeRedirectPath(c.req.query('redirect'));

  const oauthCookieOptions = {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Lax' as const,
    maxAge: OAUTH_COOKIE_MAX_AGE,
    path: '/auth/line',
  };
  setCookie(c, OAUTH_STATE_COOKIE, state, oauthCookieOptions);
  setCookie(c, OAUTH_NONCE_COOKIE, nonce, oauthCookieOptions);
  setCookie(c, OAUTH_REDIRECT_COOKIE, redirect, oauthCookieOptions);

  return c.redirect(getAuthorizationUrl(c.env, state, nonce));
});

authRoutes.get('/line/callback', async (c) => {
  const code = c.req.query('code');
  const returnedState = c.req.query('state');
  const savedState = getCookie(c, OAUTH_STATE_COOKIE);
  const nonce = getCookie(c, OAUTH_NONCE_COOKIE);
  const redirect = sanitizeRedirectPath(getCookie(c, OAUTH_REDIRECT_COOKIE));

  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/auth/line' });
  deleteCookie(c, OAUTH_NONCE_COOKIE, { path: '/auth/line' });
  deleteCookie(c, OAUTH_REDIRECT_COOKIE, { path: '/auth/line' });

  if (
    !code ||
    !returnedState ||
    !savedState ||
    !nonce ||
    returnedState !== savedState
  ) {
    return c.text(
      'ログインに失敗しました（不正なリクエストです）。もう一度お試しください。',
      400,
    );
  }

  try {
    const db = createDb(c.env.DB);
    const idToken = await exchangeCodeForIdToken(c.env, code);
    const profile = await verifyIdToken(c.env, idToken, nonce);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.lineUserId, profile.sub))
      .get();

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
      if (profile.name && profile.name !== existingUser.displayName) {
        await db
          .update(users)
          .set({ displayName: profile.name })
          .where(eq(users.id, userId));
      }
    } else {
      userId = crypto.randomUUID();
      await db.insert(users).values({
        id: userId,
        lineUserId: profile.sub,
        displayName: profile.name,
      });
    }

    const { token } = await createSession(db, userId);
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecureRequest(c),
      sameSite: 'Lax',
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: '/',
    });

    return c.redirect(redirect);
  } catch (error) {
    console.error('LINE login failed', error);
    const message =
      error instanceof LineAuthError
        ? error.message
        : 'ログインに失敗しました。';
    return c.text(message, 400);
  }
});

authRoutes.get('/logout', async (c) => {
  await destroySession(createDb(c.env.DB), getCookie(c, SESSION_COOKIE_NAME));
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.redirect(sanitizeRedirectPath(c.req.query('redirect')));
});
