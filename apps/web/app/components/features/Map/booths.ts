import type { Place } from 'api';
import boothsRaw from './data/booths.geojson?raw';
import { type LngLat, ringCenter } from './geo';

type BoothShape = { type: 'Polygon'; coordinates: LngLat[][] };

const features = (
  JSON.parse(boothsRaw) as {
    features: { properties: { booth: string }; geometry: BoothShape }[];
  }
).features;

/** ブース番号 → テントの形。 */
export const boothShapes: ReadonlyMap<string, BoothShape> = new Map(
  features.map(({ properties, geometry }) => [properties.booth, geometry]),
);

/** ブース番号 → テントの中心。 */
const boothCenters: ReadonlyMap<string, LngLat> = new Map(
  features.map(({ properties, geometry }) => [
    properties.booth,
    ringCenter(geometry.coordinates[0]),
  ]),
);

/** 屋外の場所でのブースのテントの中心。屋外ブースでなければ undefined。 */
export function boothCenter(
  place: Place | undefined,
  room: string | undefined,
): LngLat | undefined {
  return place?.kind === 'outdoor' && room ? boothCenters.get(room) : undefined;
}
