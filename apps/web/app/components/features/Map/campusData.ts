import type { Place, Shop, ShopCategory } from 'api';
import {
  compareRoom,
  countShops,
  groupShopsByPlace,
  type PlaceEntry,
} from '~/lib/places';
import { boothCenter, boothShapes } from './booths';
import { ACCENT, CATEGORY_COLORS } from './campusStyle';
import buildingsRaw from './data/buildings.geojson?raw';
import sohosaiMap from './sohosai-map.json';

export type Position = [number, number];

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
      { data: { features: { geometry: { coordinates: Position[][] } }[] } }
    >
  )[source].data;
  return { name, ring: data.features[0].geometry.coordinates[0] };
});

const buildings = JSON.parse(buildingsRaw) as {
  features: {
    type: 'Feature';
    properties: { placeId: string; name: string };
    geometry: { type: 'Polygon'; coordinates: Position[][] };
  }[];
};

function contains(ring: Position[], [x, y]: Position): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function centroid(ring: Position[]): Position {
  const sum = ring.reduce<Position>(
    (acc, [x, y]) => [acc[0] + x, acc[1] + y],
    [0, 0],
  );
  return [sum[0] / ring.length, sum[1] / ring.length];
}

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

const point = (coordinates: Position, properties: Record<string, unknown>) => ({
  type: 'Feature' as const,
  properties,
  geometry: { type: 'Point' as const, coordinates },
});

const collection = <F>(features: F[]) => ({
  type: 'FeatureCollection' as const,
  features,
});

function majorityColor(entries: PlaceEntry[]): string {
  const counts = new Map<ShopCategory, number>();
  for (const { shop } of entries) {
    counts.set(shop.category, (counts.get(shop.category) ?? 0) + 1);
  }
  const [category] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  return category ? CATEGORY_COLORS[category] : ACCENT;
}

/** 建物を開く前に中身の見当がつくよう、部屋番号順に企画名をいくつか並べる。 */
function shopPreview(entries: PlaceEntry[]): string {
  const names = [
    ...new Map(
      [...entries]
        .sort((a, b) => compareRoom(a.location.room, b.location.room))
        .map(({ shop }) => [shop.id, shop.name]),
    ).values(),
  ];
  const lines = names.slice(0, PREVIEW_COUNT).map((name) => truncate(name, 11));
  if (names.length > PREVIEW_COUNT) {
    lines.push(`ほか${names.length - PREVIEW_COUNT}件`);
  }
  return lines.join('\n');
}

/** 屋外ブースごとの点（ラベル用）とテントの形。日替わりで複数の企画が入るブースは1つにまとめる。 */
function boothFeatures(shops: Shop[], placesById: ReadonlyMap<string, Place>) {
  const booths = new Map<
    string,
    { placeId: string; center: Position; shops: Shop[] }
  >();
  for (const shop of shops) {
    for (const { placeId, room } of shop.locations) {
      const center = boothCenter(placesById.get(placeId), room);
      if (!room || !center) continue;
      const booth = booths.get(room) ?? { placeId, center, shops: [] };
      booth.shops.push(shop);
      booths.set(room, booth);
    }
  }
  const points = [...booths].map(([room, { placeId, center, shops: list }]) => {
    const [first] = list;
    const name = truncate(first.name, 12);
    return point(center, {
      booth: room,
      placeId,
      count: list.length,
      // 1企画だけのブースはタップで企画詳細を開く。
      shopNumber: list.length === 1 ? first.number : '',
      label: list.length > 1 ? `${name} ほか${list.length - 1}件` : name,
      color: CATEGORY_COLORS[first.category],
      // テントの形をタップしたときに、タップ位置との近さを測る基準点。
      center,
    });
  });
  const shapes = points.flatMap((feature) => {
    const geometry = boothShapes.get(feature.properties.booth as string);
    return geometry
      ? [{ type: 'Feature' as const, properties: feature.properties, geometry }]
      : [];
  });
  return { points, shapes };
}

/** 地図の各ソースに流すデータを、企画と場所から組み立てる。 */
export function buildCampusData(shops: Shop[], places: Place[]) {
  const byPlace = groupShopsByPlace(shops);
  const placesById = new Map(places.map((place) => [place.id, place]));
  const booths = boothFeatures(shops, placesById);

  const areaCounts = new Map<string, number>();
  for (const shop of shops) {
    const primary = placesById.get(shop.locations[0]?.placeId ?? '');
    const area =
      primary && areaPolygons.find(({ ring }) => contains(ring, primary.point));
    if (area) areaCounts.set(area.name, (areaCounts.get(area.name) ?? 0) + 1);
  }

  const areaFeatures = areaPolygons.map(({ name, ring }) =>
    point(centroid(ring), {
      name,
      countLabel: `${areaCounts.get(name) ?? 0}企画`,
    }),
  );

  const buildingFeatures = buildings.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      count: countShops(byPlace.get(feature.properties.placeId) ?? []),
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
      const count = countShops(entries);
      return point(place.point, {
        placeId: place.id,
        kind: place.kind,
        name: place.name,
        count,
        countLabel: count > 0 ? `${count}企画` : '',
        color: majorityColor(entries),
        preview: place.kind === 'building' ? shopPreview(entries) : '',
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
