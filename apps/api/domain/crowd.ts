import { z } from 'zod';
import sohosaiMap from '../../web/app/components/features/Map/sohosai-map.json';
import { MAX_POINTS_PER_REPORT } from './crowdConstants';

export { ALL_AREAS_ID, MAX_POINTS_PER_REPORT } from './crowdConstants';

/** 端末が30秒ごとに送る位置の1点。値は Geolocation API のものを丸めずに送る。 */
export const LocationPointSchema = z.object({
  /** 端末で位置を測った時刻（UNIX ミリ秒） */
  t: z.number().int(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative(),
  altitude: z.number().nullable(),
  altitudeAccuracy: z.number().nonnegative().nullable(),
  heading: z.number().nullable(),
  speed: z.number().nullable(),
  /** 30秒ごとに選んだ代表の位置か */
  primary: z.boolean(),
});

export const LocationReportSchema = z.object({
  /** 端末内で作ったランダムな ID。サーバーには保存せず、ハッシュにしてから保存する */
  deviceId: z.uuid(),
  points: z.array(LocationPointSchema).min(1).max(MAX_POINTS_PER_REPORT),
});

export type LocationPoint = z.infer<typeof LocationPointSchema>;
export type LocationReport = z.infer<typeof LocationReportSchema>;

/** プレビューに返す位置。端末はハッシュで区別する。 */
export type CrowdPoint = {
  device: string;
  t: number;
  lat: number;
  lng: number;
  accuracy: number;
};

/** 会場エリアごとの、1分間にいた端末の数。 */
export type CrowdAreaMinute = {
  minute: number;
  areaId: string;
  devices: number;
};

// 会場エリアの形は地図スタイルの塗り分けを正とし、web と同じものを使う。
const AREA_IDS = ['area-1', 'area-2-3', 'area-kaikan', 'area-taigei'] as const;

type Ring = [number, number][];

const areaSources = sohosaiMap.sources as unknown as Record<
  string,
  { data: { features: { geometry: { coordinates: Ring[] } }[] } }
>;

const AREA_RINGS = AREA_IDS.map((id) => ({
  id,
  ring: areaSources[id]?.data.features[0]?.geometry.coordinates[0] ?? [],
}));

function ringContains(ring: Ring, [x, y]: [number, number]): boolean {
  let inside = false;
  ring.forEach(([xi, yi], i) => {
    const [xj, yj] = ring.at(i - 1) ?? [xi, yi];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  });
  return inside;
}

/** 点が入る会場エリアの id。どのエリアにも入らなければ undefined。 */
export const areaIdAt = (point: [number, number]) =>
  AREA_RINGS.find(({ ring }) => ringContains(ring, point))?.id;
