import type { D1Database } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createDb } from '../db/client';
import { locationPoints } from '../db/schema';
import {
  type CrowdAreaMinute,
  type CrowdPoint,
  LocationReportSchema,
} from '../domain/crowd';
import type { AppEnv } from '../env';

const MINUTE_MS = 60_000;
// 端末の時計のずれや、通信が途切れて後から送られた分を受け入れる範囲。
const ACCEPT_PAST_MS = 3 * 24 * 60 * MINUTE_MS;
const ACCEPT_FUTURE_MS = 5 * MINUTE_MS;
// D1 は1つの文に渡せる値が 100 個までのため、行を分けて入れる（1行 11 列）。
const ROWS_PER_INSERT = 9;
// プレビューで一度に返す範囲の上限。広すぎる範囲で D1 を読みすぎないようにする。
const POINTS_RANGE_MS = 5 * MINUTE_MS;
// エリアごとの人数は、雙峰祭の期間（3日）をまとめて返す。
const SERIES_RANGE_MS = 4 * 24 * 60 * MINUTE_MS;
const MAX_RANGE_MS = 24 * 60 * MINUTE_MS;
const MAX_DEVICE_POINTS = 20_000;

/**
 * 端末 ID をハッシュにして保存し、ID そのものは残さない。ID は乱数の UUID のため、
 * salt を混ぜなくてもハッシュから ID は戻せない。
 */
async function hashDevice(deviceId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(deviceId),
  );
  return [...new Uint8Array(digest).slice(0, 16)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 端末から位置を受け取る。来場者の端末が30秒ごとに呼ぶ。 */
export const telemetryRoutes = new Hono<{ Bindings: AppEnv }>();

telemetryRoutes.post('/location', async (c) => {
  const parsed = LocationReportSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return c.body(null, 400);

  const now = Date.now();
  const deviceHash = await hashDevice(parsed.data.deviceId);
  const rows = parsed.data.points
    .filter(({ t }) => t > now - ACCEPT_PAST_MS && t < now + ACCEPT_FUTURE_MS)
    .map((point) => ({
      deviceHash,
      measuredAt: point.t,
      receivedAt: now,
      lat: point.lat,
      lng: point.lng,
      accuracy: point.accuracy,
      altitude: point.altitude,
      altitudeAccuracy: point.altitudeAccuracy,
      heading: point.heading,
      speed: point.speed,
      isPrimary: point.primary,
    }));
  if (rows.length > 0) {
    const db = createDb(c.env.DB);
    const insert = (from: number) =>
      db
        .insert(locationPoints)
        .values(rows.slice(from, from + ROWS_PER_INSERT))
        .onConflictDoNothing();
    const rest = [];
    for (let i = ROWS_PER_INSERT; i < rows.length; i += ROWS_PER_INSERT) {
      rest.push(insert(i));
    }
    await db.batch([insert(0), ...rest]);
  }
  return c.body(null, 204);
});

// Cloudflare Access のチーム。秘密の値ではないため、設定にせずここに書く。
const ACCESS_ISSUER = 'https://sohosai.cloudflareaccess.com';
const accessJwks = createRemoteJWKSet(
  new URL(`${ACCESS_ISSUER}/cdn-cgi/access/certs`),
);

/**
 * Cloudflare Access を通ったリクエストかを、Access が付ける JWT で確かめる。
 * パスの保護は Access 側で行うが、設定の漏れがあってもデータを出さないよう Worker でも検証する。
 * アプリケーション（AUD）は見ない。同じチームの別のアプリの JWT も通るが、持てるのは実行委員会だけのため。
 */
async function isAccessAllowed(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, accessJwks, { issuer: ACCESS_ISSUER });
    return true;
  } catch {
    return false;
  }
}

// ローカルの開発サーバーには Access が無いため、localhost からの読み出しだけは検証を省く。
const isLocalDev = (url: string) =>
  ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/** 人流のプレビュー（/crowd）が読むデータ。Cloudflare Access で保護する。 */
export const crowdApiRoutes = new Hono<{ Bindings: AppEnv }>();

crowdApiRoutes.use('*', async (c, next) => {
  const allowed =
    isLocalDev(c.req.url) ||
    (await isAccessAllowed(c.req.header('Cf-Access-Jwt-Assertion')));
  if (!allowed) return c.body(null, 403);
  // 個人の移動を含むため、途中のキャッシュに残さない。
  c.header('Cache-Control', 'no-store');
  await next();
});

const queryTime = (value: string | undefined) => {
  const time = Number(value);
  return Number.isFinite(time) ? time : null;
};

async function all<T>(
  db: D1Database,
  sql: string,
  ...values: unknown[]
): Promise<T[]> {
  return (
    await db
      .prepare(sql)
      .bind(...values)
      .all<T>()
  ).results;
}

/** 記録のある期間。スライダーの端に使う。 */
crowdApiRoutes.get('/range', async (c) => {
  const [range] = await all<{ from: number | null; to: number | null }>(
    c.env.DB,
    'SELECT MIN(measured_at) AS "from", MAX(measured_at) AS "to" FROM location_points',
  );
  return c.json(range ?? { from: null, to: null });
});

/**
 * 期間内の全端末のすべての位置（5秒刻み）。プレビューはこれを区切りごとに取り、
 * 点の間を補間してなめらかに動かす。読みすぎないよう、期間は最大 POINTS_RANGE_MS。
 */
crowdApiRoutes.get('/points', async (c) => {
  const from = queryTime(c.req.query('from'));
  const to = queryTime(c.req.query('to'));
  if (
    from === null ||
    to === null ||
    to < from ||
    to - from > POINTS_RANGE_MS
  ) {
    return c.body(null, 400);
  }
  const points = await all<CrowdPoint>(
    c.env.DB,
    `SELECT device_hash AS device, measured_at AS t, lat, lng, accuracy
     FROM location_points WHERE measured_at >= ? AND measured_at < ?
     ORDER BY device_hash, measured_at`,
    from,
    to,
  );
  return c.json(points);
});

/** 1台の端末の、期間内のすべての位置（5秒刻みの経路を含む）。 */
crowdApiRoutes.get('/device/:device', async (c) => {
  const from = queryTime(c.req.query('from'));
  const to = queryTime(c.req.query('to'));
  if (from === null || to === null || to - from > MAX_RANGE_MS) {
    return c.body(null, 400);
  }
  const points = await all<CrowdPoint>(
    c.env.DB,
    `SELECT device_hash AS device, measured_at AS t, lat, lng, accuracy
     FROM location_points WHERE device_hash = ? AND measured_at >= ? AND measured_at <= ?
     ORDER BY measured_at LIMIT ?`,
    c.req.param('device'),
    from,
    to,
    MAX_DEVICE_POINTS,
  );
  return c.json(points);
});

/** 会場エリアごとの1分ごとの人数。 */
crowdApiRoutes.get('/series', async (c) => {
  const from = queryTime(c.req.query('from'));
  const to = queryTime(c.req.query('to'));
  if (from === null || to === null || to - from > SERIES_RANGE_MS) {
    return c.body(null, 400);
  }
  const series = await all<CrowdAreaMinute>(
    c.env.DB,
    `SELECT minute, area_id AS areaId, devices FROM crowd_area_minutes
     WHERE minute >= ? AND minute <= ? ORDER BY minute`,
    from,
    to,
  );
  return c.json(series);
});
