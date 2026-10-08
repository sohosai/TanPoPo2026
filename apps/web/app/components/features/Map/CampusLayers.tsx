import type { Place, Project } from 'api';
import type {
  GeoJSONSource,
  MapGeoJSONFeature,
  Map as MlMap,
} from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router';
import { usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { boothCenter } from './booths';
import { buildCampusData, otherCampusBuildingIds } from './campusData';
import {
  addCampusLayers,
  applySelection,
  INTERACTIVE_LAYERS,
  type Selection,
  SOURCES,
  setExtrusionVisible,
} from './campusStyle';
import type { LngLat } from './geo';
import { useMap } from './MapController';

/** 現在のページ（場所ページ・企画詳細）で強調すべき場所とブース。 */
function useSelection(
  projects: Project[] | undefined,
  placesById: ReadonlyMap<string, Place>,
): Selection {
  const { pathname } = useLocation();
  return useMemo(() => {
    const place = matchPath('/place/:placeId', pathname);
    if (place?.params.placeId) {
      return { placeIds: [place.params.placeId], booths: [] };
    }
    const project = matchPath('/project/:number', pathname);
    const found = projects?.find((s) => s.number === project?.params.number);
    return {
      placeIds: found?.locations.map((location) => location.placeId) ?? [],
      booths:
        found?.locations.flatMap(({ placeId, room }) =>
          room && boothCenter(placesById.get(placeId), room) ? [room] : [],
        ) ?? [],
    };
  }, [pathname, projects, placesById]);
}

/** 地図上の対象の基準点（テントの形は中心、点はその位置）。基準点が無ければ null。 */
function featureCenter(feature: MapGeoJSONFeature): LngLat | null {
  // 地図から取り出したプロパティの配列は JSON 文字列になっている。
  const raw = feature.properties.center;
  if (raw) return (typeof raw === 'string' ? JSON.parse(raw) : raw) as LngLat;
  return feature.geometry.type === 'Point'
    ? (feature.geometry.coordinates as LngLat)
    : null;
}

/** タップ位置にある対象から、開くページのパスを返す。対象が無ければ null。 */
function tapTarget(map: MlMap, { x, y }: { x: number; y: number }) {
  // 指でのタップでも小さなピンに当たるよう、タップ位置の周囲も拾う。
  const features = map.queryRenderedFeatures(
    [
      [x - 10, y - 10],
      [x + 10, y + 10],
    ],
    { layers: INTERACTIVE_LAYERS.filter((id) => map.getLayer(id)) },
  );
  // ブースは数メートル間隔で並ぶため、拾えた中でタップ位置に最も近いものを選ぶ。
  // 建物の塗りなど基準点の無いものは、他に無いときだけ使う。
  const distance = (feature: MapGeoJSONFeature) => {
    const center = featureCenter(feature);
    if (!center) return Number.POSITIVE_INFINITY;
    const p = map.project(center);
    return Math.hypot(p.x - x, p.y - y);
  };
  const props = features.sort((a, b) => distance(a) - distance(b))[0]
    ?.properties;
  if (typeof props?.projectNumber === 'string' && props.projectNumber !== '') {
    return `/project/${props.projectNumber}`;
  }
  if (typeof props?.placeId === 'string' && Number(props.count) > 0) {
    return `/place/${props.placeId}`;
  }
  if (typeof props?.areaId === 'string') return `/area/${props.areaId}`;
  return null;
}

/**
 * 会場エリア・建物・屋外のテント・ステージを地図に重ね、タップで企画詳細や場所の企画一覧を開く。
 * ズームに応じて、エリア名 → 建物・テント列のピン → 企画数・中の企画名・テントの形、と情報を増やす。
 */
export default function CampusLayers() {
  const { isReady, getMap } = useMap();
  const navigate = useNavigate();
  const { data: projects } = trpc.project.list.useQuery();
  const { places, byId: placesById } = usePlaces();
  const selected = useSelection(projects, placesById);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;

    // 'load' は登録前に発火済みのことがあり、styledata の時点ではまだ読み込み中のこともあるため、
    // 地図が落ち着いたとき（idle）にも試して一度だけ追加する。
    // 傾けている間（3D/2D ボタン、右ドラッグ・2本指での傾け）だけ建物とテントを立体にする。
    let extruded = false;
    const syncExtrusion = () => {
      const next = map.getPitch() > 0;
      if (next === extruded || !map.getSource(SOURCES.places)) return;
      extruded = next;
      setExtrusionVisible(map, next);
    };

    const setup = () => {
      if (!map.isStyleLoaded() || map.getSource(SOURCES.places)) return;
      addCampusLayers(map, otherCampusBuildingIds);
      syncExtrusion();
      setLoaded(true);
    };
    setup();
    map.on('styledata', setup);
    map.on('idle', setup);
    map.on('pitch', syncExtrusion);

    const onClick = (e: { point: { x: number; y: number } }) => {
      const target = tapTarget(map, e.point);
      if (target) navigate(target);
    };
    const setCursor = (cursor: string) => () => {
      map.getCanvas().style.cursor = cursor;
    };
    const pointer = setCursor('pointer');
    const reset = setCursor('');
    map.on('click', onClick);
    for (const id of INTERACTIVE_LAYERS) {
      map.on('mouseenter', id, pointer);
      map.on('mouseleave', id, reset);
    }
    return () => {
      map.off('styledata', setup);
      map.off('idle', setup);
      map.off('pitch', syncExtrusion);
      map.off('click', onClick);
      for (const id of INTERACTIVE_LAYERS) {
        map.off('mouseenter', id, pointer);
        map.off('mouseleave', id, reset);
      }
    };
  }, [isReady, getMap, navigate]);

  useEffect(() => {
    const map = getMap();
    if (!loaded || !map || !projects) return;
    const data = buildCampusData(projects, places);
    for (const key of Object.keys(SOURCES) as (keyof typeof SOURCES)[]) {
      (map.getSource(SOURCES[key]) as GeoJSONSource).setData(data[key]);
    }
  }, [loaded, getMap, projects, places]);

  useEffect(() => {
    const map = getMap();
    if (loaded && map) applySelection(map, selected);
  }, [loaded, getMap, selected]);

  return null;
}
