import { jwtVerify } from 'jose';
import { z } from 'zod';
import { requireEnv } from '../env';

const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_ISSUER = 'https://access.line.me';

export class LineAuthError extends Error {}

export function getAuthorizationUrl(state: string, nonce: string): string {
  const url = new URL(LINE_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', requireEnv('LINE_CHANNEL_ID'));
  url.searchParams.set('redirect_uri', requireEnv('LINE_CALLBACK_URL'));
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'profile openid');
  url.searchParams.set('nonce', nonce);
  return url.toString();
}

const TokenResponseSchema = z.object({
  access_token: z.string(),
  id_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

export async function exchangeCodeForIdToken(code: string): Promise<string> {
  const response = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: requireEnv('LINE_CALLBACK_URL'),
      client_id: requireEnv('LINE_CHANNEL_ID'),
      client_secret: requireEnv('LINE_CHANNEL_SECRET'),
    }),
  });

  if (!response.ok) {
    throw new LineAuthError(
      `LINEトークンエンドポイントへのリクエストに失敗しました: ${response.status}`,
    );
  }

  const json = await response.json();
  const parsed = TokenResponseSchema.parse(json);
  return parsed.id_token;
}

export type LineProfile = {
  sub: string;
  name?: string;
};

/**
 * LINEのID TokenはHS256（チャネルシークレットを鍵とする対称鍵署名）で発行されるため、
 * JWKS（公開鍵）ではなくチャネルシークレットで検証する。
 */
export async function verifyIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<LineProfile> {
  const secretKey = new TextEncoder().encode(requireEnv('LINE_CHANNEL_SECRET'));

  const { payload } = await jwtVerify(idToken, secretKey, {
    issuer: LINE_ISSUER,
    audience: requireEnv('LINE_CHANNEL_ID'),
    algorithms: ['HS256'],
  });

  if (payload.nonce !== expectedNonce) {
    throw new LineAuthError('ID Tokenのnonceが一致しません');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new LineAuthError('ID Tokenにsubがありません');
  }

  return {
    sub: payload.sub,
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };
}
