import type { D1Database } from '@cloudflare/workers-types';
import { ALL_AREAS_ID, areaIdAt } from '../domain/crowd';

const MINUTE_MS = 60_000;
// 端末は30秒ごとにまとめて送るため、少し待ってから集計する。通信が途切れて後から届いた分は、
// しばらく後にもう一度集計し直して拾う。
const AGGREGATE_DELAYS_MIN = [2, 15];

/** 1分間に各会場エリアにいた端末の数を数え、crowd_area_minutes に書く（書き直しを含む）。 */
async function aggregateMinute(db: D1Database, minute: number) {
  const { results } = await db
    .prepare(
      'SELECT device_hash AS device, lat, lng FROM location_points WHERE measured_at >= ? AND measured_at < ?',
    )
    .bind(minute, minute + MINUTE_MS)
    .all<{ device: string; lat: number; lng: number }>();

  const devicesByArea = new Map<string, Set<string>>([
    [ALL_AREAS_ID, new Set()],
  ]);
  for (const { device, lat, lng } of results) {
    devicesByArea.get(ALL_AREAS_ID)?.add(device);
    const areaId = areaIdAt([lng, lat]);
    if (!areaId) continue;
    const devices = devicesByArea.get(areaId) ?? new Set();
    devices.add(device);
    devicesByArea.set(areaId, devices);
  }

  const upsert = db.prepare(
    `INSERT INTO crowd_area_minutes (minute, area_id, devices) VALUES (?, ?, ?)
     ON CONFLICT (minute, area_id) DO UPDATE SET devices = excluded.devices`,
  );
  await db.batch(
    [...devicesByArea].map(([areaId, devices]) =>
      upsert.bind(minute, areaId, devices.size),
    ),
  );
}

/** Cron Trigger（毎分）から呼ぶ。 */
export async function aggregateCrowd(db: D1Database, scheduledTime: number) {
  const current = Math.floor(scheduledTime / MINUTE_MS) * MINUTE_MS;
  for (const delay of AGGREGATE_DELAYS_MIN) {
    await aggregateMinute(db, current - delay * MINUTE_MS);
  }
}
