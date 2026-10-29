import { eq, lt } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createDb } from '../db/client';
import { oauthStates, users } from '../db/schema';
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
const OAUTH_STATE_MAX_AGE = 600; // 10分
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

authRoutes.get('/line/login', async (c) => {
  const state = randomHex(16);
  const nonce = randomHex(16);
  const redirect = sanitizeRedirectPath(c.req.query('redirect'));

  const db = createDb(c.env.DB);
  await db.batch([
    db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date())),
    db.insert(oauthStates).values({
      state,
      nonce,
      redirect,
      expiresAt: new Date(Date.now() + OAUTH_STATE_MAX_AGE * 1000),
    }),
  ]);

  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Lax',
    maxAge: OAUTH_STATE_MAX_AGE,
    path: '/auth/line',
  });

  return c.redirect(getAuthorizationUrl(c.env, state, nonce));
});

authRoutes.get('/line/callback', async (c) => {
  const code = c.req.query('code');
  const returnedState = c.req.query('state');
  const cookieState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/auth/line' });

  const db = createDb(c.env.DB);
  // 使い回せないよう、検証の成否に関わらず取り出した時点で消す。
  const saved = returnedState
    ? await db
        .delete(oauthStates)
        .where(eq(oauthStates.state, returnedState))
        .returning()
        .get()
    : undefined;

  // 自動ログインで別のブラウザに戻ると Cookie は無いため、そのときはサーバーの記録だけで受け入れる。
  // Cookie があるのに食い違うのは、別のログインの途中に差し込まれたコールバックなので拒む。
  if (
    !code ||
    !saved ||
    saved.expiresAt.getTime() < Date.now() ||
    (cookieState !== undefined && cookieState !== returnedState)
  ) {
    return c.text(
      'ログインに失敗しました（不正なリクエストです）。もう一度お試しください。',
      400,
    );
  }
  const { nonce } = saved;
  const redirect = sanitizeRedirectPath(saved.redirect);

  try {
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

authRoutes.post('/line/liff', async (c) => {
  const { idToken } = await c.req.json<{ idToken?: string }>();
  if (!idToken) {
    return c.json({ error: 'idToken is required' }, 400);
  }

  try {
    const db = createDb(c.env.DB);
    // line-auth.ts に追記した verifyLiffIdToken を呼び出す
    const { verifyLiffIdToken } = await import('../services/line-auth');
    const profile = await verifyLiffIdToken(c.env, idToken);

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

    return c.json({ success: true });
  } catch (error) {
    console.error('LIFF login failed', error);
    return c.json({ error: 'ログインに失敗しました' }, 400);
  }
});

authRoutes.get('/logout', async (c) => {
  await destroySession(createDb(c.env.DB), getCookie(c, SESSION_COOKIE_NAME));
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.redirect(sanitizeRedirectPath(c.req.query('redirect')));
});
