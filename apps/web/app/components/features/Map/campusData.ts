import type { Place, Project, ProjectCategory } from 'api';
import {
  compareRoom,
  countProjects,
  groupProjectsByPlace,
  type PlaceEntry,
} from '~/lib/places';
import { boothCenter, boothShapes } from './booths';
import { ACCENT, CATEGORY_COLORS } from './campusStyle';
import buildingsRaw from './data/buildings.geojson?raw';
import campusBuildingIds from './data/campus-building-ids.json';
import { type LngLat, ringCenter, ringContains } from './geo';
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
  return { name, ring: data.features[0].geometry.coordinates[0] };
});

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

function majorityColor(entries: PlaceEntry[]): string {
  const counts = new Map<ProjectCategory, number>();
  for (const { project } of entries) {
    counts.set(project.category, (counts.get(project.category) ?? 0) + 1);
  }
  const [category] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  return category ? CATEGORY_COLORS[category] : ACCENT;
}

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
    const primary = placesById.get(project.locations[0]?.placeId ?? '');
    const area =
      primary &&
      areaPolygons.find(({ ring }) => ringContains(ring, primary.point));
    if (area) areaCounts.set(area.name, (areaCounts.get(area.name) ?? 0) + 1);
  }

  const areaFeatures = areaPolygons.map(({ name, ring }) =>
    point(ringCenter(ring), {
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
    .filter(
      ({ id, kind }) =>
        kind === 'building' ||
        kind === 'stage' ||
        // 企画の無い屋外の場所は地図に出しても意味がない。
        (kind === 'outdoor' && byPlace.has(id)),
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
        color: majorityColor(entries),
        preview: place.kind === 'building' ? projectPreview(entries) : '',
      });
    });

  return {
    areas: collection(areaFeatures),
    buildings: collection(buildingFeatures),
    places: collection(placeFeatures),
    booths: collection(booths.points),
    boothShapes: collection(booths.shapes),
  };
}

/** 地図の各ソースに流すデータ。 */
export type CampusData = ReturnType<typeof buildCampusData>;
