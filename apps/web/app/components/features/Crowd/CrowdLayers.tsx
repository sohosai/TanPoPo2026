import type { CrowdPoint } from 'api';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  MapMouseEvent,
  Map as MlMap,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { useMap } from '../Map/MapController';
import { deviceHue } from './track';

const SOURCES = {
  tails: 'crowd-tails',
  points: 'crowd-points',
  device: 'crowd-device',
} as const;

const EMPTY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const deviceColor: ExpressionSpecification = [
  'concat',
  'hsl(',
  ['to-string', ['get', 'hue']],
  ', 70%, 42%)',
];

function addLayers(map: MlMap) {
  for (const id of Object.values(SOURCES)) {
    map.addSource(id, { type: 'geojson', data: EMPTY });
  }
  map.addLayer({
    id: 'crowd-tails',
    type: 'line',
    source: SOURCES.tails,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': deviceColor, 'line-width': 2, 'line-opacity': 0.6 },
  });
  map.addLayer({
    id: 'crowd-points',
    type: 'circle',
    source: SOURCES.points,
    paint: {
      'circle-radius': 5,
      'circle-color': deviceColor,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    },
  });
  map.addLayer({
    id: 'crowd-device-line',
    type: 'line',
    source: SOURCES.device,
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0d366b', 'line-width': 3 },
  });
  map.addLayer({
    id: 'crowd-device-dots',
    type: 'circle',
    source: SOURCES.device,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 3,
      'circle-color': '#0d366b',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1,
    },
  });
}

const pointFeature = ({ device, t, lng, lat, accuracy }: CrowdPoint) => ({
  type: 'Feature' as const,
  properties: { device, t, accuracy, hue: deviceHue(device) },
  geometry: { type: 'Point' as const, coordinates: [lng, lat] },
});

function tailFeatures(points: CrowdPoint[]) {
  const byDevice = new Map<string, [number, number][]>();
  for (const { device, lng, lat } of points) {
    const line = byDevice.get(device) ?? [];
    line.push([lng, lat]);
    byDevice.set(device, line);
  }
  return [...byDevice]
    .filter(([, line]) => line.length > 1)
    .map(([device, coordinates]) => ({
      type: 'Feature' as const,
      properties: { device, hue: deviceHue(device) },
      geometry: { type: 'LineString' as const, coordinates },
    }));
}

// 人流のレイヤ。下から順に並べ、通常の地図（CampusLayers）が後から足されても、この順で一番上に置き直す。
const CROWD_LAYERS = [
  'crowd-tails',
  'crowd-points',
  'crowd-device-line',
  'crowd-device-dots',
];

/** 人流のレイヤを一番上に置き直す。 */
function raiseLayers(map: MlMap) {
  if (map.getStyle().layers.at(-1)?.id === CROWD_LAYERS.at(-1)) return;
  for (const id of CROWD_LAYERS) if (map.getLayer(id)) map.moveLayer(id);
}

/**
 * 人流の点・軌跡の尾・選んだ端末の経路を、通常の地図（CampusLayers）の上に重ねる。
 * 点を押すと、その端末を選ぶ。
 */
export default function CrowdLayers({
  points,
  tails,
  devicePath,
  onSelectDevice,
}: {
  points: CrowdPoint[];
  tails: CrowdPoint[];
  devicePath: CrowdPoint[];
  onSelectDevice: (device: string | null) => void;
}) {
  const { isReady, getMap } = useMap();
  const [loaded, setLoaded] = useState(false);
  const select = useRef(onSelectDevice);
  select.current = onSelectDevice;

  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;
    const setup = () => {
      if (!map.isStyleLoaded() || map.getSource(SOURCES.points)) return;
      addLayers(map);
      setLoaded(true);
    };
    setup();
    map.on('styledata', setup);
    map.on('idle', setup);
    const onClick = (e: MapMouseEvent) => {
      const [feature] = map.queryRenderedFeatures(
        [
          [e.point.x - 8, e.point.y - 8],
          [e.point.x + 8, e.point.y + 8],
        ],
        { layers: ['crowd-points'] },
      );
      select.current(
        (feature?.properties.device as string | undefined) ?? null,
      );
    };
    const pointer = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const reset = () => {
      map.getCanvas().style.cursor = '';
    };
    map.on('click', onClick);
    map.on('mouseenter', 'crowd-points', pointer);
    map.on('mouseleave', 'crowd-points', reset);
    return () => {
      map.off('styledata', setup);
      map.off('idle', setup);
      map.off('click', onClick);
      map.off('mouseenter', 'crowd-points', pointer);
      map.off('mouseleave', 'crowd-points', reset);
    };
  }, [isReady, getMap]);

  useEffect(() => {
    const map = getMap();
    if (!loaded || !map) return;
    const source = (id: string) => map.getSource(id) as GeoJSONSource;
    source(SOURCES.points).setData({
      type: 'FeatureCollection',
      features: points.map(pointFeature),
    });
    source(SOURCES.tails).setData({
      type: 'FeatureCollection',
      features: tailFeatures(tails),
    });
    source(SOURCES.device).setData({
      type: 'FeatureCollection',
      features: [...tailFeatures(devicePath), ...devicePath.map(pointFeature)],
    });
  }, [loaded, getMap, points, tails, devicePath]);

  // 通常の地図は後から足されるため、地図が落ち着くたびに人流のレイヤを一番上に戻す。
  useEffect(() => {
    const map = getMap();
    if (!loaded || !map) return;
    const raise = () => raiseLayers(map);
    raise();
    map.on('idle', raise);
    return () => {
      map.off('idle', raise);
    };
  }, [loaded, getMap]);

  return null;
}
