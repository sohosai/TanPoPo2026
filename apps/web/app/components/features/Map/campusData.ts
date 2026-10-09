import type { Place, Project } from 'api';
import {
  compareRoom,
  countProjects,
  groupProjectsByPlace,
  type PlaceEntry,
} from '~/lib/places';
import { boothCenter, boothShapes } from './booths';
import { CATEGORY_COLORS } from './campusStyle';
import buildingsRaw from './data/buildings.geojson?raw';
import campusBuildingIds from './data/campus-building-ids.json';
import {
  type LngLat,
  offsetRing,
  ringBounds,
  ringCenter,
  ringContains,
} from './geo';
import sohosaiMap from './sohosai-map.json';

// 地図スタイルに塗り分けとして入っている会場エリア。
const AREAS = [
  { source: 'area-1', name: '第一エリア' },
  { source: 'area-2-3', name: '第二・第三エリア' },
  { source: 'area-kaikan', name: '大学会館エリア' },
  { source: 'area-taigei', name: '体芸エリア' },
] as const;

const PREVIEW_COUNT = 3;

const areaPolygons = AREAS.map(({ source, name }) => {
  const data = (
    sohosaiMap.sources as unknown as Record<
      string,
      { data: { features: { geometry: { coordinates: LngLat[][] } }[] } }
    >
  )[source].data;
  const ring = data.features[0].geometry.coordinates[0];
  return { id: source, name, ring, bounds: ringBounds(ring) };
});

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
      osmId: number;
      levels: number;
    };
    geometry: { type: 'Polygon'; coordinates: LngLat[][] };
  }[];
};

const venueBuildingIds = new Set(
  buildings.features.map((feature) => feature.properties.osmId),
);

/**
 * 地図タイルの建物のうち 3D 表示で立体にするもの（学内の、会場以外の建物）の OSM way id。
 * 会場の建物は階数から別に立てるため、同じ輪郭が二重に立って壁がちらつかないよう除く。
 */
export const otherCampusBuildingIds = campusBuildingIds.filter(
  (id) => !venueBuildingIds.has(id),
);

// 地図タイルは同じ高さの建物を 1 つの地物にまとめて別の棟の id を付けることがあり（5C・大学会館など）、
// id では除ききれない。3D の会場の建物はタイルの座標の丸め誤差（ズーム 14 で最大約 0.3m）より外へ広げ、
// 二重に立った同じ輪郭の壁をその内側に隠す。
const SHELL_OFFSET = 0.5;
const buildingShells = buildings.features.map(({ geometry }) => ({
  type: 'Polygon' as const,
  coordinates: [offsetRing(geometry.coordinates[0], SHELL_OFFSET)],
}));

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

/** 屋外ブースごとの点（ラベル用）とテントの形。日替わりで複数の企画が入るブースは1つにまとめる。 */
function boothFeatures(
  projects: Project[],
  placesById: ReadonlyMap<string, Place>,
) {
  const booths = new Map<
    string,
    { placeId: string; center: LngLat; projects: Project[] }
  >();
  for (const project of projects) {
    for (const { placeId, room } of project.locations) {
      const center = boothCenter(placesById.get(placeId), room);
      if (!room || !center) continue;
      const booth = booths.get(room) ?? { placeId, center, projects: [] };
      booth.projects.push(project);
      booths.set(room, booth);
    }
  }
  const entries = [...booths].map(
    ([room, { placeId, center, projects: list }]) => {
      const [first] = list;
      const name = truncate(first.name, 12);
      const properties = {
        booth: room,
        placeId,
        count: list.length,
        // 1企画だけのブースはタップで企画詳細を開く。
        projectNumber: list.length === 1 ? first.number : '',
        label: list.length > 1 ? `${name} ほか${list.length - 1}件` : name,
        color: CATEGORY_COLORS[first.category],
        // テントの形をタップしたときに、タップ位置との近さを測る基準点。
        center,
      };
      return { room, center, properties };
    },
  );
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

  const areaFeatures = areaPolygons.map(({ id, name, ring }) =>
    point(ringCenter(ring), {
      areaId: id,
      name,
      countLabel: `${areaCounts.get(name) ?? 0}企画`,
    }),
  );

  const buildingFeatures = buildings.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      count: countProjects(byPlace.get(feature.properties.placeId) ?? []),
    },
  }));

  const placeFeatures = places
    // 屋外のテントは引いているときにまとめて出さず、寄ったところでテントそのものを出す。
    .filter(({ kind }) => kind === 'building' || kind === 'stage')
    .map((place) => {
      const entries = byPlace.get(place.id) ?? [];
      const count = countProjects(entries);
      return point(place.point, {
        placeId: place.id,
        kind: place.kind,
        name: place.name,
        count,
        countLabel: count > 0 ? `${count}企画` : '',
        preview: place.kind === 'building' ? projectPreview(entries) : '',
      });
    });

  return {
    areas: collection(areaFeatures),
    buildings: collection(buildingFeatures),
    buildingShells: collection(
      buildingFeatures.map((feature, i) => ({
        ...feature,
        geometry: buildingShells[i],
      })),
    ),
    places: collection(placeFeatures),
    booths: collection(booths.points),
    boothShapes: collection(booths.shapes),
  };
}

/** 地図の各ソースに流すデータ。 */
export type CampusData = ReturnType<typeof buildCampusData>;
