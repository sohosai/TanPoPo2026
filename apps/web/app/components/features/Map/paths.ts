import pathRaw from './data/path-network.geojson?raw';
import type { LngLat } from './geo';

/**
 * 通路ネットワーク（path-network.geojson）。
 * 建物との紐づけは feature の placeId で明示する（kind='entrance' かつ placeId を持つ feature が、その建物の入口/接続路）。
 */

export type PathFeature = {
  type: 'Feature';
  properties: {
    kind?: 'walkway' | 'entrance';
    placeId?: string;
    name?: string;
  };
  geometry: { type: 'LineString'; coordinates: LngLat[] };
};

export type PathNetwork = {
  type: 'FeatureCollection';
  features: PathFeature[];
};

export const pathNetwork: PathNetwork = JSON.parse(pathRaw);
