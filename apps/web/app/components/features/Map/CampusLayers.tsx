import type { Place, Project } from 'api';
import type {
  GeoJSONSource,
  MapGeoJSONFeature,
  MapMouseEvent,
  Map as MlMap,
} from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router';
import {
  type FromDetailState,
  lastListUrl,
  listPath,
} from '~/components/features/Detail/useDetailClose';
import { toAppPath, useOpenAppPath } from '~/lib/embed';
import { spreadFacilityKind, usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import BoothChooser, { type BoothChoice } from './BoothChooser';
import { boothCenter } from './booths';
import { buildCampusData } from './campusData';
import {
  addCampusLayers,
  applySelection,
  BUILDING_FLAT_SOURCE,
  highlightPlaceKind,
  INTERACTIVE_LAYERS,
  isTentView,
  type Selection,
  SOURCES,
  setExtrusionVisible,
  setTentView,
} from './campusStyle';
import type { LngLat } from './geo';
import { useMap } from './MapController';

/** 現在のページ（場所ページ・企画詳細）で強調すべき場所とブース。 */
function useSelection(
  projects: Project[] | undefined,
  placesById: ReadonlyMap<string, Place>,
): Selection {
  const pathname = toAppPath(useLocation().pathname);
  return useMemo(() => {
    const place = matchPath('/place/:placeId', pathname);
    if (place?.params.placeId) {
      const { placeId } = place.params;
      // 建物のページでは、中のステージも強調する。
      const stageIds = [...placesById.values()].flatMap(({ id, buildingId }) =>
        buildingId === placeId ? [id] : [],
      );
      return { placeIds: [placeId, ...stageIds], booths: [] };
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

/** 開いている企画詳細がごみ箱・駐輪場・駐車場の企画なら、その種類。吹き出しを並べる代わりにその種類を強調する。 */
function useProjectFacilityKind(
  projects: Project[] | undefined,
  placesById: ReadonlyMap<string, Place>,
) {
  const pathname = toAppPath(useLocation().pathname);
  return useMemo(() => {
    const number = matchPath('/project/:number', pathname)?.params.number;
    const project = projects?.find((p) => p.number === number);
    return project && spreadFacilityKind(project, placesById);
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

/** 複数の企画が入るテント。タップでページを開かず、企画を選ばせる。 */
type SharedBooth = { placeId: string; room: string; point: LngLat };

/** タップ位置にある対象から、開くページのパスか、企画を選ばせるテントを返す。対象が無ければ null。 */
function tapTarget(
  map: MlMap,
  { x, y }: { x: number; y: number },
): string | SharedBooth | null {
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
  const nearest = features.sort((a, b) => distance(a) - distance(b))[0];
  const props = nearest?.properties;
  if (typeof props?.projectNumber === 'string' && props.projectNumber !== '') {
    return `/project/${props.projectNumber}`;
  }
  const center = nearest && featureCenter(nearest);
  if (
    typeof props?.booth === 'string' &&
    typeof props.placeId === 'string' &&
    Number(props.count) > 1 &&
    center
  ) {
    return { placeId: props.placeId, room: props.booth, point: center };
  }
  if (
    typeof props?.placeId === 'string' &&
    (Number(props.count) > 0 || props.hasStage === true)
  ) {
    return `/place/${props.placeId}`;
  }
  if (typeof props?.areaId === 'string') return `/area/${props.areaId}`;
  return null;
}

/** 詳細を開いているときに、閉じて戻る一覧の URL。詳細を開いていなければ null。 */
function detailCloseUrl(pathname: string): string | null {
  if (matchPath('/project/:number', pathname)) return lastListUrl();
  if (matchPath('/place/:placeId', pathname)) return listPath();
  if (matchPath('/area/:areaId', pathname)) return listPath();
  return null;
}

/**
 * 会場エリア・建物・屋外のテント・ステージを地図に重ね、タップで企画詳細や場所の企画一覧を開く。
 * 埋め込みでは、埋め込み先のページを離れさせないよう、アプリ本体のページを新しいタブで開く。
 * ズームに応じて、エリア名 → 建物・テント列のピン → 企画数・中の企画名・テントの形、と情報を増やす。
 */
export default function CampusLayers({
  highlightKind,
}: {
  /** 指定すると、この種類の場所だけを強調し、ほかのピン・ラベルは隠す（埋め込み用）。 */
  highlightKind?: Parameters<typeof highlightPlaceKind>[1];
}) {
  const { isReady, getMap } = useMap();
  const openAppPath = useOpenAppPath();
  const navigate = useNavigate();
  // タップの処理は地図に一度だけ登録するため、最新の値は ref から読む。
  // 埋め込みでは詳細を新しいタブで開くので、埋め込みのパスのまま照合して閉じないようにする。
  const pathname = useRef('');
  pathname.current = useLocation().pathname;
  const { data: projects } = trpc.project.list.useQuery();
  const { places, byId: placesById } = usePlaces();
  const selected = useSelection(projects, placesById);
  const projectKind = useProjectFacilityKind(projects, placesById);
  const kind = highlightKind ?? projectKind;
  const [loaded, setLoaded] = useState(false);
  const [sharedBooth, setSharedBooth] = useState<SharedBooth | null>(null);
  const chooserOpen = useRef(false);
  chooserOpen.current = sharedBooth !== null;
  const closeChooser = useCallback(() => setSharedBooth(null), []);

  const boothChoice = useMemo((): BoothChoice | null => {
    if (!sharedBooth || !projects) return null;
    const entries = projects.flatMap((project) =>
      project.locations
        .filter(
          ({ placeId, room }) =>
            placeId === sharedBooth.placeId && room === sharedBooth.room,
        )
        .map(({ days }) => ({ project, days: days ?? project.schedule })),
    );
    return { point: sharedBooth.point, entries };
  }, [sharedBooth, projects]);

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
    let tentView: boolean | undefined;
    const syncTentView = () => {
      const next = isTentView(map);
      if (next === tentView || !map.getSource(SOURCES.places)) return;
      tentView = next;
      setTentView(map, next);
    };

    const setup = () => {
      if (!map.isStyleLoaded() || map.getSource(SOURCES.places)) return;
      addCampusLayers(map);
      syncExtrusion();
      syncTentView();
      setLoaded(true);
    };
    setup();
    map.on('styledata', setup);
    map.on('idle', setup);
    map.on('pitch', syncExtrusion);
    map.on('zoom', syncTentView);

    const closeDetail = () => {
      const to = detailCloseUrl(pathname.current);
      const state: FromDetailState = { fromDetail: true };
      if (to !== null) navigate(to, { state });
    };

    const onClick = (e: MapMouseEvent) => {
      // 地図の上に載せた吹き出し（MapCallouts）は、それ自身で開く先を持つ。
      if ((e.originalEvent.target as Element).closest('[data-map-callout]')) {
        return;
      }
      const target = tapTarget(map, e.point);
      // 何もない所のタップは、選択肢が出ていればそれだけを閉じ、無ければ開いている詳細を閉じる。
      if (target === null && !chooserOpen.current) closeDetail();
      // 選択肢を出している間に別の所をタップしたら、選択肢は閉じる。
      setSharedBooth(typeof target === 'object' ? target : null);
      if (typeof target === 'string') openAppPath(target);
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
      map.off('zoom', syncTentView);
      map.off('click', onClick);
      for (const id of INTERACTIVE_LAYERS) {
        map.off('mouseenter', id, pointer);
        map.off('mouseleave', id, reset);
      }
    };
  }, [isReady, getMap, openAppPath, navigate]);

  useEffect(() => {
    const map = getMap();
    if (!loaded || !map || !projects) return;
    const data = buildCampusData(projects, places);
    for (const key of Object.keys(SOURCES) as (keyof typeof SOURCES)[]) {
      (map.getSource(SOURCES[key]) as GeoJSONSource).setData(data[key]);
    }
    (map.getSource(BUILDING_FLAT_SOURCE) as GeoJSONSource).setData(
      data.buildings,
    );
  }, [loaded, getMap, projects, places]);

  useEffect(() => {
    const map = getMap();
    if (loaded && map) applySelection(map, selected);
  }, [loaded, getMap, selected]);

  useEffect(() => {
    const map = getMap();
    if (loaded && map) highlightPlaceKind(map, kind);
  }, [loaded, getMap, kind]);

  if (!boothChoice) return null;
  return (
    <BoothChooser
      choice={boothChoice}
      onSelect={(project) => {
        setSharedBooth(null);
        openAppPath(`/project/${project.number}`);
      }}
      onClose={closeChooser}
    />
  );
}
