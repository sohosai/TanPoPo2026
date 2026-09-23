import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { db } from '../db/client';
import { users } from '../db/schema';
import {
  exchangeCodeForIdToken,
  getAuthorizationUrl,
  LineAuthError,
  verifyIdToken,
} from '../services/line-auth';
import { createSession, destroySession, SESSION_COOKIE_NAME } from './session';

const OAUTH_STATE_COOKIE = 'line_oauth_state';
const OAUTH_NONCE_COOKIE = 'line_oauth_nonce';
const OAUTH_REDIRECT_COOKIE = 'line_oauth_redirect';
const OAUTH_COOKIE_MAX_AGE = 600; // 10分
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

const isProd = process.env.NODE_ENV === 'production';

function getWebAppUrl(): string {
  return process.env.WEB_APP_URL ?? 'http://localhost:5173';
}

/** オープンリダイレクト対策。相対パス以外は許可しない。 */
function sanitizeRedirectPath(raw: string | undefined): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export const authRoutes = new Hono();

authRoutes.get('/line/login', (c) => {
  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');
  const redirect = sanitizeRedirectPath(c.req.query('redirect'));

  const oauthCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax' as const,
    maxAge: OAUTH_COOKIE_MAX_AGE,
    path: '/auth/line',
  };
  setCookie(c, OAUTH_STATE_COOKIE, state, oauthCookieOptions);
  setCookie(c, OAUTH_NONCE_COOKIE, nonce, oauthCookieOptions);
  setCookie(c, OAUTH_REDIRECT_COOKIE, redirect, oauthCookieOptions);

  return c.redirect(getAuthorizationUrl(state, nonce));
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
    const idToken = await exchangeCodeForIdToken(code);
    const profile = await verifyIdToken(idToken, nonce);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.lineUserId, profile.sub))
      .limit(1);

    let userId: string;
    const existingUser = existing[0];
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

    const { token } = await createSession(userId);
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: '/',
    });

    return c.redirect(`${getWebAppUrl()}${redirect}`);
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
  const token = getCookie(c, SESSION_COOKIE_NAME);
  await destroySession(token);
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.redirect(
    `${getWebAppUrl()}${sanitizeRedirectPath(c.req.query('redirect'))}`,
  );
});
