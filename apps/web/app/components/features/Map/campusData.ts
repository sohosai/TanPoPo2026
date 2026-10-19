import type { Place, Project, ScheduleDay } from 'api';
import {
  compareSchedule,
  formatSchedule,
} from '~/components/features/Project/labels';
import {
  compareRoom,
  countProjects,
  groupProjectsByPlace,
  type PlaceEntry,
} from '~/lib/places';
import { boothCenter, boothShapes } from './booths';
import { CATEGORY_COLORS, INFORMATION_COLOR } from './campusStyle';
import buildingsRaw from './data/buildings.geojson?raw';
import informationRaw from './data/information.geojson?raw';
import { type LngLat, ringBounds, ringCenter, ringContains } from './geo';
import sohosaiMap from './sohosai-map.json';

// 地図スタイルに塗り分けとして入っている会場エリア。名前は既定でエリアの中心に出し、
// 中心が企画の集まる場所から外れるエリアだけ label で位置を指定する。
const AREAS: { source: string; name: string; label?: LngLat }[] = [
  { source: 'area-1', name: '第一エリア' },
  { source: 'area-2-3', name: '第二・第三エリア' },
  { source: 'area-kaikan', name: '大学会館エリア' },
  // 頂点の平均だと東側の体育施設に寄って見えるため、北西へずらす。
  { source: 'area-taigei', name: '体芸エリア', label: [140.1031, 36.1029] },
];

const PREVIEW_COUNT = 3;

const VISIBLE_PLACE_KINDS = new Set<Place['kind']>([
  'building',
  'stage',
  'information',
  'trash',
]);

const areaPolygons = AREAS.map(({ source, name, label }) => {
  const data = (
    sohosaiMap.sources as unknown as Record<
      string,
      { data: { features: { geometry: { coordinates: LngLat[][] } }[] } }
    >
  )[source].data;
  const ring = data.features[0].geometry.coordinates[0];
  return {
    id: source,
    name,
    ring,
    label: label ?? ringCenter(ring),
    bounds: ringBounds(ring),
  };
});

/** 会場エリアがすべて収まる範囲。地図の初期表示に使う。 */
export const CAMPUS_BOUNDS = ringBounds(
  areaPolygons.flatMap(({ bounds }) => bounds),
);

export const findCampusArea = (id: string | undefined) =>
  areaPolygons.find((area) => area.id === id);

/** 企画がいずれかの実施場所で属する会場エリア。エリア外・場所不明なら空配列。 */
export function areasOfProject(
  project: Project,
  placesById: ReadonlyMap<string, Place>,
) {
  return areaPolygons.filter(({ ring }) =>
    project.locations.some(({ placeId }) => {
      const place = placesById.get(placeId);
      return place && ringContains(ring, place.point);
    }),
  );
}

const buildings = JSON.parse(buildingsRaw) as {
  features: {
    type: 'Feature';
    properties: {
      placeId: string;
      name: string;
      levels: number;
    };
    geometry: { type: 'Polygon'; coordinates: LngLat[][] };
  }[];
};

const informationTents = (
  JSON.parse(informationRaw) as {
    features: {
      properties: { placeId: string };
      geometry: { type: 'Polygon'; coordinates: LngLat[][] };
    }[];
  }
).features;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

const point = (coordinates: LngLat, properties: Record<string, unknown>) => ({
  type: 'Feature' as const,
  properties,
  geometry: { type: 'Point' as const, coordinates },
});

const collection = <F>(features: F[]) => ({
  type: 'FeatureCollection' as const,
  features,
});

/** 建物を開く前に中身の見当がつくよう、部屋番号順に企画名をいくつか並べる。 */
function projectPreview(entries: PlaceEntry[]): string {
  const names = [
    ...new Map(
      [...entries]
        .sort((a, b) => compareRoom(a.location.room, b.location.room))
        .map(({ project }) => [project.id, project.name]),
    ).values(),
  ];
  const lines = names.slice(0, PREVIEW_COUNT).map((name) => truncate(name, 11));
  if (names.length > PREVIEW_COUNT) {
    lines.push(`ほか${names.length - PREVIEW_COUNT}件`);
  }
  return lines.join('\n');
}

// テントのラベルに企画名を並べる数。これより多いブースは残りを件数で示す。
const BOOTH_LABEL_COUNT = 2;

/**
 * テントのラベル。複数の企画が入るブースは、どれもあることが分かるよう1行ずつ並べる。
 * 日替わりのブースでは、いつの企画かも添える。
 */
function boothLabel(list: { project: Project; days: ScheduleDay[] }[]) {
  if (list.length === 1) return truncate(list[0].project.name, 12);
  const daysDiffer = new Set(list.map(({ days }) => days.join())).size > 1;
  const lines = list
    .toSorted((a, b) => compareSchedule(a.days, b.days))
    .slice(0, BOOTH_LABEL_COUNT)
    .map(({ project, days }) =>
      daysDiffer
        ? `${formatSchedule(days)} ${truncate(project.name, 9)}`
        : truncate(project.name, 12),
    );
  if (list.length > BOOTH_LABEL_COUNT) {
    lines.push(`ほか${list.length - BOOTH_LABEL_COUNT}件`);
  }
  return lines.join('\n');
}

/** 屋外ブースごとの点（ラベル用）とテントの形。日替わりで複数の企画が入るブースは1つにまとめる。 */
function boothFeatures(
  projects: Project[],
  placesById: ReadonlyMap<string, Place>,
) {
  const booths = new Map<
    string,
    {
      placeId: string;
      center: LngLat;
      list: { project: Project; days: ScheduleDay[] }[];
    }
  >();
  for (const project of projects) {
    for (const { placeId, room, days } of project.locations) {
      const center = boothCenter(placesById.get(placeId), room);
      if (!room || !center) continue;
      const booth = booths.get(room) ?? { placeId, center, list: [] };
      booth.list.push({ project, days: days ?? project.schedule });
      booths.set(room, booth);
    }
  }
  const entries = [...booths].map(([room, { placeId, center, list }]) => {
    const [{ project: first }] = list;
    const properties = {
      booth: room,
      placeId,
      count: list.length,
      // 1企画だけのブースはタップで企画詳細を開き、複数ならどれを開くか選ばせる。
      projectNumber: list.length === 1 ? first.number : '',
      label: boothLabel(list),
      color: CATEGORY_COLORS[first.category],
      // テントの形をタップしたときに、タップ位置との近さを測る基準点。
      center,
    };
    return { room, center, properties };
  });
  return {
    points: entries.map(({ center, properties }) => point(center, properties)),
    shapes: entries.flatMap(({ room, properties }) => {
      const geometry = boothShapes.get(room);
      return geometry
        ? [{ type: 'Feature' as const, properties, geometry }]
        : [];
    }),
  };
}

/** 地図の各ソースに流すデータを、企画と場所から組み立てる。 */
export function buildCampusData(projects: Project[], places: Place[]) {
  const byPlace = groupProjectsByPlace(projects);
  const placesById = new Map(places.map((place) => [place.id, place]));
  const booths = boothFeatures(projects, placesById);

  const areaCounts = new Map<string, number>();
  for (const project of projects) {
    for (const { name } of areasOfProject(project, placesById)) {
      areaCounts.set(name, (areaCounts.get(name) ?? 0) + 1);
    }
  }

  const areaFeatures = areaPolygons.map(({ id, name, label }) =>
    point(label, {
      areaId: id,
      name,
      countLabel: `${areaCounts.get(name) ?? 0}企画`,
    }),
  );

  const informationShapes = informationTents
    .filter(({ properties }) => placesById.has(properties.placeId))
    .map(({ properties, geometry }) => ({
      type: 'Feature' as const,
      properties: { placeId: properties.placeId, color: INFORMATION_COLOR },
      geometry,
    }));
  // 企画が建物ではなく中のステージに紐づく建物（1A棟・大学会館）も、押せば建物の企画一覧を開けるようにする。
  const stageBuildingIds = new Set(places.map(({ buildingId }) => buildingId));
  // 企画の無い建物は押しても開くページが無く紛らわしいため、地図に描かない。
  const hasProjects = (placeId: string) =>
    countProjects(byPlace.get(placeId) ?? []) > 0 ||
    stageBuildingIds.has(placeId);
  const buildingFeatures = buildings.features
    .filter(({ properties }) => hasProjects(properties.placeId))
    .map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        count: countProjects(byPlace.get(feature.properties.placeId) ?? []),
        hasStage: stageBuildingIds.has(feature.properties.placeId),
      },
    }));

  // 屋外のテントは引いているときにまとめて出さず、寄ったところでテントそのものを出す。
  // テントの形を持たない屋外の場所（池・グラウンドなど）は、建物と同じくピンで示す。
  const isTentlessOutdoor = (place: Place) =>
    place.kind === 'outdoor' &&
    (byPlace.get(place.id) ?? []).some(
      ({ location }) => !boothCenter(place, location.room),
    );
  const placeFeatures = places
    .filter(
      (place) =>
        (VISIBLE_PLACE_KINDS.has(place.kind) &&
          (place.kind !== 'building' || hasProjects(place.id))) ||
        isTentlessOutdoor(place),
    )
    .map((place) => {
      const entries = byPlace.get(place.id) ?? [];
      const count = countProjects(entries);
      return point(place.point, {
        placeId: place.id,
        kind: place.kind,
        name: place.name,
        count,
        countLabel: count > 0 ? `${count}企画` : '',
        preview: projectPreview(entries),
        hasStage: stageBuildingIds.has(place.id),
      });
    });

  return {
    areas: collection(areaFeatures),
    buildings: collection(buildingFeatures),
    places: collection(placeFeatures),
    booths: collection(booths.points),
    // 案内所もテントとして、屋外ブースのテントと同じレイヤで描く。
    boothShapes: collection([...booths.shapes, ...informationShapes]),
  };
}

/** 地図の各ソースに流すデータ。 */
export type CampusData = ReturnType<typeof buildCampusData>;
