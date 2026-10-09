import type { Place } from 'api';
import boothsRaw from './data/booths.geojson?raw';
import { type LngLat, ringCenter } from './geo';

type BoothShape = { type: 'Polygon'; coordinates: LngLat[][] };

// 隣り合うテントは辺を共有しているため、そのままだと 3D で同じ色の立体がつながり境界が消える。
// 中心に向けて縮め、テントの間にすき間を空ける（約 3m 四方のテントで 40〜50cm）。
const BOOTH_SCALE = 0.85;

const booths = (
  JSON.parse(boothsRaw) as {
    features: { properties: { booth: string }; geometry: BoothShape }[];
  }
).features.map(({ properties, geometry }) => {
  const ring = geometry.coordinates[0];
  const [cx, cy] = ringCenter(ring);
  const shape: BoothShape = {
    type: 'Polygon',
    coordinates: [
      ring.map(([x, y]) => [
        cx + (x - cx) * BOOTH_SCALE,
        cy + (y - cy) * BOOTH_SCALE,
      ]),
    ],
  };
  return { booth: properties.booth, center: [cx, cy] as LngLat, shape };
});

/** ブース番号 → テントの形。 */
export const boothShapes: ReadonlyMap<string, BoothShape> = new Map(
  booths.map(({ booth, shape }) => [booth, shape]),
);

/** ブース番号 → テントの中心。 */
const boothCenters: ReadonlyMap<string, LngLat> = new Map(
  booths.map(({ booth, center }) => [booth, center]),
);

/** 屋外の場所でのブースのテントの中心。屋外ブースでなければ undefined。 */
export function boothCenter(
  place: Place | undefined,
  room: string | undefined,
): LngLat | undefined {
  return place?.kind === 'outdoor' && room ? boothCenters.get(room) : undefined;
}
