import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { sessions, users } from '../db/schema';

export const SESSION_COOKIE_NAME = 'tanpopo_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30日

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

export function randomHex(byteLength: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** cookieには生トークンを、DBにはそのSHA-256ハッシュのみを保存する。 */
async function hashToken(token: string): Promise<string> {
  return toHex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
  );
}

export type SessionUser = {
  id: string;
  displayName: string | null;
};

export async function createSession(
  db: Database,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: await hashToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getSessionUser(
  db: Database,
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  const row = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, await hashToken(token)))
    .get();

  if (!row || row.expiresAt.getTime() < Date.now()) return null;

  return { id: row.id, displayName: row.displayName };
}

export async function destroySession(
  db: Database,
  token: string | undefined,
): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, await hashToken(token)));
}
