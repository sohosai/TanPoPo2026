import maplibregl, { type Map as MlMap } from 'maplibre-gl';
import buildingsRaw from './data/buildings.geojson?raw';
import { type LngLat, ringCenter } from './geo';

/**
 * 現在判明している建物（buildings.geojson）を地図に重ねて可視化する。
 */
type BuildingFeature = {
  properties: { placeId: string; name?: string };
  geometry: { type: 'Polygon'; coordinates: LngLat[][] };
};

const buildingsData = JSON.parse(buildingsRaw);
const ACCENT = '#4a93d7'; // token('colors.brand.500')

/** 地図のデバッグ表示（URL に `?debug`）が有効か。 */
export function isMapDebug(): boolean {
  return new URLSearchParams(window.location.search).has('debug');
}

const AERIAL = 'debug-aerial';

/**
 * 航空写真（国土地理院のシームレス空中写真）の表示を切り替える。
 * テントや建物の位置を写真と見比べるためのものなので、背景の地図は覆い、会場の図形の下に敷く。
 */
export function setAerialVisible(map: MlMap, visible: boolean): void {
  if (!map.getSource(AERIAL)) {
    map.addSource(AERIAL, {
      type: 'raster',
      tiles: [
        'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>',
    });
    const firstOverlay = map
      .getStyle()
      .layers.find(
        ({ id }) => id.startsWith('campus-') || id.startsWith('debug-'),
      )?.id;
    map.addLayer({ id: AERIAL, type: 'raster', source: AERIAL }, firstOverlay);
  }
  map.setLayoutProperty(AERIAL, 'visibility', visible ? 'visible' : 'none');
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

  // 建物コードのラベル
  for (const f of buildingsData.features as BuildingFeature[]) {
    const el = document.createElement('div');
    el.textContent = f.properties.placeId.replace(/^bldg-/, '');
    el.style.cssText = `font-size:10px;font-weight:700;color:#0a6b6b;background:rgba(255, 255, 255, 0.82);padding:1px 4px;border-radius:4px;white-space:nowrap;pointer-events:none;`;
    new maplibregl.Marker({ element: el })
      .setLngLat(ringCenter(f.geometry.coordinates[0]))
      .addTo(map);
  }
}
