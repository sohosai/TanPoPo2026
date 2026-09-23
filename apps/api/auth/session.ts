import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { sessions, users } from '../db/schema';

export const SESSION_COOKIE_NAME = 'tanpopo_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30日

/** cookieには生トークンを、DBにはそのSHA-256ハッシュのみを保存する。 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type SessionUser = {
  id: string;
  lineUserId: string;
  displayName: string | null;
  isTsukubaStudent: boolean | null;
};

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getSessionUser(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      lineUserId: users.lineUserId,
      displayName: users.displayName,
      isTsukubaStudent: users.isTsukubaStudent,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, hashToken(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  return {
    id: row.id,
    lineUserId: row.lineUserId,
    displayName: row.displayName,
    isTsukubaStudent: row.isTsukubaStudent,
  };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}
