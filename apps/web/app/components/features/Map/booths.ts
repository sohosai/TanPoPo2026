import type { Place } from 'api';
import boothsRaw from './data/booths.geojson?raw';

type Position = [number, number];
type BoothShape = { type: 'Polygon'; coordinates: Position[][] };

const features = (
  JSON.parse(boothsRaw) as {
    features: { properties: { booth: string }; geometry: BoothShape }[];
  }
).features;

/** ブース番号 → テントの形。 */
export const boothShapes: ReadonlyMap<string, BoothShape> = new Map(
  features.map(({ properties, geometry }) => [properties.booth, geometry]),
);

/** ブース番号 → テントの中心 [経度, 緯度]。 */
const boothCenters: ReadonlyMap<string, Position> = new Map(
  features.map(({ properties, geometry }) => {
    const ring = geometry.coordinates[0].slice(0, -1);
    return [
      properties.booth,
      [
        ring.reduce((sum, [x]) => sum + x, 0) / ring.length,
        ring.reduce((sum, [, y]) => sum + y, 0) / ring.length,
      ],
    ];
  }),
);

/** 屋外の場所でのブースのテントの中心。屋外ブースでなければ undefined。 */
export function boothCenter(
  place: Place | undefined,
  room: string | undefined,
): Position | undefined {
  return place?.kind === 'outdoor' && room ? boothCenters.get(room) : undefined;
}
