import maplibregl, { type Map as MlMap } from 'maplibre-gl';
import { token } from '../../../../styled-system/tokens';
import buildingsRaw from './data/buildings.geojson?raw';
import { pathNetwork } from './paths';

/**
 * 現在判明している建物（buildings.geojson）と通路ネットワーク（path-network.geojson）を地図に重ねて可視化する。
 */
type BuildingFeature = {
  properties: { placeId: string; name?: string };
  geometry: { type: 'Polygon'; coordinates: number[][][] };
};

const buildingsData = JSON.parse(buildingsRaw);
const ACCENT = token('colors.accent');
const PATH_COLOR = '#ff5a36'; // 一般通路
const ENTRANCE_COLOR = '#2e9e5b'; // 入口/接続路

/** ポリゴン外周の平均座標（簡易重心）。ラベル設置位置に使う。 */
function ringCentroid(coords: number[][][]): [number, number] {
  const ring = coords[0];
  const pts = ring[0] === ring[ring.length - 1] ? ring.slice(0, -1) : ring;
  const sum = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [sum[0] / pts.length, sum[1] / pts.length];
}

/** 通路の全頂点を点として可視化するためのソースを作る（ノード接続の確認用）。 */
function buildNodeCollection() {
  const features = pathNetwork.features
    .flatMap((f) => f.geometry.coordinates)
    .map((c) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Point' as const, coordinates: c },
    }));
  return { type: 'FeatureCollection' as const, features };
}

/** デバッグレイヤを地図に追加する（多重追加はスキップ）。 */
export function addDebugLayers(map: MlMap): void {
  if (map.getSource('debug-buildings')) return;

  // 建物（面 + 外枠）
  map.addSource('debug-buildings', { type: 'geojson', data: buildingsData });
  map.addLayer({
    id: 'debug-buildings-fill',
    type: 'fill',
    source: 'debug-buildings',
    paint: {
      'fill-color': ACCENT,
      'fill-opacity': 0.18,
      'fill-outline-color': ACCENT,
    },
  });

  // 通路（線）。入口/接続路（kind='entrance'）は別色・太線で区別する。
  map.addSource('debug-path', { type: 'geojson', data: pathNetwork });
  map.addLayer({
    id: 'debug-path-line',
    type: 'line',
    source: 'debug-path',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': [
        'match',
        ['get', 'kind'],
        'entrance',
        ENTRANCE_COLOR,
        PATH_COLOR,
      ],
      'line-width': ['match', ['get', 'kind'], 'entrance', 5, 3],
    },
  });

  // 通路の頂点（ノード）
  map.addSource('debug-path-nodes', {
    type: 'geojson',
    data: buildNodeCollection(),
  });
  map.addLayer({
    id: 'debug-path-nodes-circle',
    type: 'circle',
    source: 'debug-path-nodes',
    paint: {
      'circle-radius': 4,
      'circle-color': PATH_COLOR,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    },
  });

  // 建物コードのラベル
  for (const f of buildingsData.features as BuildingFeature[]) {
    const el = document.createElement('div');
    el.textContent = f.properties.placeId.replace(/^bldg-/, '');
    el.style.cssText =
      'font-size:10px;font-weight:700;color:#0a6b6b;background:rgba(255,255,255,0.82);padding:1px 4px;border-radius:4px;white-space:nowrap;pointer-events:none;';
    new maplibregl.Marker({ element: el })
      .setLngLat(ringCentroid(f.geometry.coordinates))
      .addTo(map);
  }
}
