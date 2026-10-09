/**
 * PLATEAU（国土交通省の 3D 都市モデル）から筑波大学の敷地内の建物を取り出し、3D 表示用の GeoJSON に書き出すスクリプト。
 *
 * - 輪郭は lod0RoofEdge、高さは lod1Solid の上端と下端の差（PLATEAU 自身が LOD1 で描く高さ）を使う。
 *   会場付近は LOD1 しか整備されていないため、屋根の形（LOD2）は無い。
 * - CityGML の zip は約 1GB あるため、HTTP の Range で zip の目次と敷地にかかる 3 次メッシュの建物ファイルだけを読む。
 * - PLATEAU は隣り合う棟を 1 つの建物にまとめていることがあり（1D と 1E など）、会場の建物と 1 対 1 に対応しない。
 *   そのため会場の建物は buildings.geojson の輪郭のまま、重なりが最も大きい PLATEAU の建物の計測高さ（最高高さ）で立て、
 *   それ以外の建物は PLATEAU の輪郭から会場の建物の部分を切り抜いて立てる。立体同士は重ならない。
 *
 * 実行: bun run ingest:plateau-buildings
 *
 * 出典: 「3D都市モデル（Project PLATEAU）つくば市（2023年度）」（国土交通省）を加工して作成。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import {
  type LngLat,
  ringCenter,
  ringContains,
} from '../apps/web/app/components/features/Map/geo';

// G 空間情報センターで公開されている最新版（標準製品仕様書 v4）。
// PLATEAU のデータカタログ API が返す URL は一つ前の版（citygml_1）のため使わない。
const CITYGML_URL =
  'https://assets.cms.plateau.reearth.io/assets/2a/a9a3a8-5830-48dc-991e-92c2b8939436/08220_tsukuba-shi_city_2023_citygml_2_op.zip';

const MAP_DIR = join(
  import.meta.dir,
  '..',
  'apps/web/app/components/features/Map',
);
const OUT_FILE = join(MAP_DIR, 'data/buildings-3d.geojson');

type Ring = LngLat[];
type Polygon = Ring[];

// 筑波大学（amenity=university）の敷地ポリゴン。地図スタイルの hongaku-area。
const style = JSON.parse(
  readFileSync(join(MAP_DIR, 'sohosai-map.json'), 'utf-8'),
) as {
  sources: Record<
    string,
    { data: { features: { geometry: { coordinates: Polygon } }[] } }
  >;
};
const campus =
  style.sources['hongaku-area'].data.features[0].geometry.coordinates[0];

const venue = (
  JSON.parse(
    readFileSync(join(MAP_DIR, 'data/buildings.geojson'), 'utf-8'),
  ) as {
    features: {
      properties: { placeId: string };
      geometry: { coordinates: Polygon };
    }[];
  }
).features.map(({ properties, geometry }) => ({
  placeId: properties.placeId,
  polygon: geometry.coordinates,
}));

/** 経緯度を含む 3 次メッシュ（約 1km 四方）のコード。 */
function meshCode([lng, lat]: LngLat): string {
  const p = Math.floor(lat * 1.5);
  const u = Math.floor(lng - 100);
  const q = Math.floor((lat * 1.5 - p) * 8);
  const v = Math.floor((lng - 100 - u) * 8);
  const r = Math.floor(((lat * 1.5 - p) * 8 - q) * 10);
  const w = Math.floor(((lng - 100 - u) * 8 - v) * 10);
  return `${p}${u}${q}${v}${r}${w}`;
}

/** 敷地の外接矩形にかかる 3 次メッシュ。 */
function campusMeshes(): Set<string> {
  const lngs = campus.map(([lng]) => lng);
  const lats = campus.map(([, lat]) => lat);
  const codes = new Set<string>();
  // 3 次メッシュは経度 45 秒・緯度 30 秒。それより細かく刻めば取りこぼさない。
  for (
    let lat = Math.min(...lats);
    lat <= Math.max(...lats) + 1 / 240;
    lat += 1 / 240
  ) {
    for (
      let lng = Math.min(...lngs);
      lng <= Math.max(...lngs) + 1 / 160;
      lng += 1 / 160
    ) {
      codes.add(
        meshCode([
          Math.min(lng, Math.max(...lngs)),
          Math.min(lat, Math.max(...lats)),
        ]),
      );
    }
  }
  return codes;
}

async function fetchRange(start: number, end: number): Promise<Uint8Array> {
  const res = await fetch(CITYGML_URL, {
    headers: { Range: `bytes=${start}-${end}` },
  });
  if (res.status !== 206) {
    throw new Error(`Range 取得に失敗: ${res.status} ${res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

type ZipEntry = { name: string; method: number; size: number; offset: number };

/** zip の末尾の目次（セントラルディレクトリ）を読む。4GB 未満の zip（ZIP64 でないもの）だけを扱う。 */
async function readZipEntries(): Promise<ZipEntry[]> {
  const head = await fetch(CITYGML_URL, { method: 'HEAD' });
  const total = Number(head.headers.get('content-length'));
  // 目次の終端レコードは末尾 22 バイト + コメント（最大 65535 バイト）以内にある。
  const tail = await fetchRange(Math.max(0, total - 65_557), total - 1);
  const tv = new DataView(tail.buffer);
  let eocd = tail.length - 22;
  while (eocd >= 0 && tv.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('zip の目次が見つからない');
  const count = tv.getUint16(eocd + 10, true);
  const size = tv.getUint32(eocd + 12, true);
  const offset = tv.getUint32(eocd + 16, true);

  const dir = await fetchRange(offset, offset + size - 1);
  const dv = new DataView(dir.buffer);
  const entries: ZipEntry[] = [];
  for (let p = 0, i = 0; i < count; i++) {
    const nameLength = dv.getUint16(p + 28, true);
    entries.push({
      name: new TextDecoder().decode(dir.subarray(p + 46, p + 46 + nameLength)),
      method: dv.getUint16(p + 10, true),
      size: dv.getUint32(p + 20, true),
      offset: dv.getUint32(p + 42, true),
    });
    p +=
      46 + nameLength + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  return entries;
}

async function readZipFile({
  method,
  size,
  offset,
}: ZipEntry): Promise<string> {
  // ローカルヘッダの長さは名前・拡張フィールドで変わるため、先に読んで本体の位置を求める。
  const header = new DataView((await fetchRange(offset, offset + 29)).buffer);
  const start =
    offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  const data = await fetchRange(start, start + size - 1);
  return new TextDecoder().decode(method === 8 ? inflateRawSync(data) : data);
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** posList（緯度 経度 標高 の繰り返し）を [経度, 緯度] の外周にする。標高も返す。 */
function parsePosList(text: string): { ring: Ring; heights: number[] } {
  const values = text.trim().split(/\s+/).map(Number);
  const ring: Ring = [];
  const heights: number[] = [];
  for (let i = 0; i + 2 < values.length; i += 3) {
    ring.push([round(values[i + 1]), round(values[i])]);
    heights.push(values[i + 2]);
  }
  return { ring, heights };
}

const POS_LIST = /<gml:posList[^>]*>([^<]+)<\/gml:posList>/g;

type Building = {
  polygons: Polygon[];
  /** LOD1 の高さ。つくば市のデータは点群の中央値で、まとめられた棟の高い部分は低めに出る */
  height: number;
  /** 計測高さ（点群の最高高さ）。取得できなかった建物は undefined */
  measured: number | undefined;
};

/** 1 棟の輪郭（穴を含む多角形の集まり）と高さ。 */
function parseBuilding(xml: string): Building | null {
  const roofEdge = xml.match(
    /<bldg:lod0RoofEdge>([\s\S]*?)<\/bldg:lod0RoofEdge>/,
  )?.[1];
  const solid = xml.match(/<bldg:lod1Solid>([\s\S]*?)<\/bldg:lod1Solid>/)?.[1];
  if (!roofEdge || !solid) return null;

  const polygons = [
    ...roofEdge.matchAll(/<gml:Polygon>([\s\S]*?)<\/gml:Polygon>/g),
  ].map(([, polygon]) =>
    [...polygon.matchAll(POS_LIST)].map(([, list]) => parsePosList(list).ring),
  );
  const heights = [...solid.matchAll(POS_LIST)].flatMap(
    ([, list]) => parsePosList(list).heights,
  );
  const height = Math.max(...heights) - Math.min(...heights);
  if (polygons.length === 0 || !(height > 0)) return null;
  // 取得できなかった計測高さは -9999 で入っている。
  const measured = Number(xml.match(/<bldg:measuredHeight[^>]*>([^<]+)</)?.[1]);
  return {
    polygons,
    height: Math.round(height * 10) / 10,
    measured: measured > 0 ? measured : undefined,
  };
}

// 切り抜きや面積の計算は、キャンパスの中心付近を原点にした平面（m）で行う。
const [originLng, originLat] = ringCenter(campus);
const M_PER_LNG = 111_320 * Math.cos((originLat * Math.PI) / 180);
const M_PER_LAT = 110_574;
const toPlane = (polygon: Polygon): Polygon =>
  polygon.map((ring) =>
    ring.map(([lng, lat]) => [
      (lng - originLng) * M_PER_LNG,
      (lat - originLat) * M_PER_LAT,
    ]),
  );
const toLngLat = (polygon: Polygon): Polygon =>
  polygon.map((ring) =>
    ring.map(([x, y]) => [
      round(x / M_PER_LNG + originLng),
      round(y / M_PER_LAT + originLat),
    ]),
  );

const ringArea = (ring: Ring) =>
  Math.abs(
    ring.reduce((sum, [x1, y1], i) => {
      const [x2, y2] = ring[(i + 1) % ring.length];
      return sum + x1 * y2 - x2 * y1;
    }, 0),
  ) / 2;
const polygonArea = ([outer, ...holes]: Polygon) =>
  ringArea(outer) - holes.reduce((sum, hole) => sum + ringArea(hole), 0);
const perimeter = ([outer]: Polygon) =>
  outer
    .slice(1)
    .reduce(
      (sum, [x, y], i) => sum + Math.hypot(x - outer[i][0], y - outer[i][1]),
      0,
    );

// PLATEAU の輪郭は屋根の縁（軒の出を含む）で、会場の建物の輪郭（OSM）より 1〜2.5m ほど外に広い。
// 会場の建物ちょうどで切り抜くと、その差が会場の建物に張り付いた細い壁として残り二重に見えるため、
// 会場の建物をこれだけ外へ広げた範囲で切り抜く。
const VENUE_MARGIN = 2;
// それでも残る細長い切れ端は、平均の幅がこれより狭ければ捨てる。
const MIN_WIDTH = 1.5;
// PLATEAU の輪郭は辺の途中にも頂点を細かく打っているため、直線上にある頂点を間引いて軽くする。
const COLLINEAR_TOLERANCE = 0.1;

/** 前後の頂点を結ぶ線からの距離が許容値未満の頂点を除く。 */
function dropCollinear(ring: Ring): Ring {
  const points = ring.slice(0, -1);
  const kept = points.filter((point, i) => {
    const [ax, ay] = points[(i - 1 + points.length) % points.length];
    const [bx, by] = points[(i + 1) % points.length];
    const length = Math.hypot(bx - ax, by - ay);
    const distance =
      Math.abs((bx - ax) * (ay - point[1]) - (ax - point[0]) * (by - ay)) /
      length;
    return !(distance < COLLINEAR_TOLERANCE);
  });
  return [...kept, kept[0]];
}

const meshes = campusMeshes();
const entries = (await readZipEntries()).filter(({ name }) => {
  const code = name.match(/^udx\/bldg\/(\d{8})_bldg_6697_op\.gml$/)?.[1];
  return code !== undefined && meshes.has(code);
});
console.log(
  `建物ファイル ${entries.length} 件（3 次メッシュ ${[...meshes].join(', ')}）`,
);

const buildings: Building[] = [];
for (const entry of entries) {
  const xml = await readZipFile(entry);
  for (const [, building] of xml.matchAll(
    /<bldg:Building [^>]*>([\s\S]*?)<\/bldg:Building>/g,
  )) {
    const parsed = parseBuilding(building);
    if (parsed && ringContains(campus, ringCenter(parsed.polygons[0][0]))) {
      buildings.push({ ...parsed, polygons: parsed.polygons.map(toPlane) });
    }
  }
  console.log(`  ${entry.name}: 累計 ${buildings.length} 棟`);
}

const venuePlanes = venue.map(({ placeId, polygon }) => ({
  placeId,
  polygon: toPlane(polygon),
}));
const venueFeatures = venuePlanes.flatMap(({ placeId, polygon }) => {
  // 会場の建物は、まとめられた棟の中で高い部分にあたることが多いため、中央値ではなく最高高さを使う。
  const overlaps = buildings.map(({ polygons, height, measured }) => ({
    height: measured ?? height,
    area: polygonClipping
      .intersection(polygon as MultiPolygon[number], polygons as MultiPolygon)
      .reduce((sum, part) => sum + polygonArea(part), 0),
  }));
  const best = overlaps.reduce((a, b) => (b.area > a.area ? b : a));
  if (!(best.area > 0)) {
    console.warn(`会場の建物に重なる PLATEAU の建物が無い: ${placeId}`);
    return [];
  }
  return [
    {
      type: 'Feature',
      properties: { placeId, height: best.height },
      geometry: { type: 'Polygon', coordinates: toLngLat(polygon) },
    },
  ];
});

// 8 方向にずらした写しを重ねて、外へ広げた形を近似する。凹んだ角でも頂点が飛ばない。
const directions = Array.from({ length: 8 }, (_, i) => [
  Math.cos((i * Math.PI) / 4),
  Math.sin((i * Math.PI) / 4),
]);
const venueUnion = polygonClipping.union(
  ...venuePlanes.flatMap(({ polygon }) => [
    polygon as MultiPolygon[number],
    ...directions.map(
      ([dx, dy]) =>
        polygon.map((ring) =>
          ring.map(([x, y]) => [x + dx * VENUE_MARGIN, y + dy * VENUE_MARGIN]),
        ) as MultiPolygon[number],
    ),
  ]),
);
const otherFeatures = buildings.flatMap(({ polygons, height }) => {
  const rest = polygonClipping.difference(polygons as MultiPolygon, venueUnion);
  const area = (geometry: Polygon[]) =>
    geometry.reduce((sum, part) => sum + polygonArea(part), 0);
  // 細い切れ端を捨てるのは切り抜いた建物だけ。小さな倉庫なども幅は狭いため、元から細い建物は残す。
  const clipped = area(polygons) - area(rest) > 0.01;
  const parts = rest
    .map((part) => part.map(dropCollinear))
    .filter(
      (part) =>
        part[0].length >= 4 &&
        (!clipped || (2 * polygonArea(part)) / perimeter(part) >= MIN_WIDTH),
    );
  if (parts.length === 0) return [];
  const coordinates = parts.map(toLngLat);
  return [
    {
      type: 'Feature',
      properties: { height },
      geometry:
        coordinates.length === 1
          ? { type: 'Polygon', coordinates: coordinates[0] }
          : { type: 'MultiPolygon', coordinates },
    },
  ];
});

const features = [...venueFeatures, ...otherFeatures];
writeFileSync(
  OUT_FILE,
  `${JSON.stringify({ type: 'FeatureCollection', features })}\n`,
);
console.log(
  `会場 ${venueFeatures.length} 棟・その他 ${otherFeatures.length} 棟を出力: ${OUT_FILE}`,
);
