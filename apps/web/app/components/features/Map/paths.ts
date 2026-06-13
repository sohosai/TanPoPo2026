import pathRaw from './data/path-network.geojson?raw';

/**
 * 通路ネットワークの参照ユーティリティ。
 * 道は path-network.geojson に集約し、建物との紐づけは feature の placeId で明示する
 * （kind='entrance' かつ placeId を持つ feature が、その建物に接続する入口/接続路）。
 */

export type PathFeature = {
  type: 'Feature';
  properties: {
    kind?: 'walkway' | 'entrance';
    placeId?: string;
    name?: string;
  };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
};

export type PathNetwork = {
  type: 'FeatureCollection';
  features: PathFeature[];
};

export const pathNetwork: PathNetwork = JSON.parse(pathRaw);

/** 指定建物に接続する入口/接続路（複数可）を返す。 */
export function entrancesForBuilding(placeId: string): PathFeature[] {
  return pathNetwork.features.filter(
    (f) => f.properties.kind === 'entrance' && f.properties.placeId === placeId,
  );
}

/**
 * 指定建物の入口点（各入口の建物側端点 = coordinates[0]）を返す。
 * ルート探索の目的地候補に使う。
 */
export function entrancePointsForBuilding(placeId: string): [number, number][] {
  return entrancesForBuilding(placeId).map((f) => f.geometry.coordinates[0]);
}
