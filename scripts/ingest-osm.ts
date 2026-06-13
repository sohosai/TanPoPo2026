/**
 * OpenStreetMap から建物・歩行者道を取り込み、GeoJSON 化するスクリプト（プランA）。
 *
 * - Overpass の生 JSON（nodes + ways）を使い、ways が共有する node id で
 *   通路ネットワークのトポロジ（連結性）を保証する（幾何的ノーディング不要）。
 * - 取得結果は data/osm/ に書き出す（レビュー用。curated な buildings.geojson /
 *   path-network.geojson は上書きしない）。確認後にマージ方針を決める。
 *
 * 実行: bun run scripts/ingest-osm.ts [bbox=S,W,N,E]
 *   例: bun run scripts/ingest-osm.ts 36.098,140.094,36.115,140.110
 *
 * ライセンス: 取得データは © OpenStreetMap contributors (ODbL)。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// 既定 bbox（南,西,北,東）= 雙峰祭会場周辺。
const DEFAULT_BBOX = '36.098,140.094,36.115,140.110';
const bbox = process.argv[2] ?? DEFAULT_BBOX;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OUT_DIR = join(
  import.meta.dir,
  '..',
  'apps/web/app/components/features/Map/data/osm',
);

// 歩行者が通れる highway 種別（ルート対象）。
const WALKABLE = new Set([
  'footway',
  'path',
  'pedestrian',
  'steps',
  'living_street',
  'service',
  'residential',
  'unclassified',
  'tertiary',
  'secondary',
  'cycleway',
]);

type OsmNode = { type: 'node'; id: number; lat: number; lon: number };
type OsmWay = {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};
type OsmElement = OsmNode | OsmWay;

const round = (n: number) => Math.round(n * 1e7) / 1e7;

async function fetchOverpass(): Promise<OsmElement[]> {
  const query = `[out:json][timeout:90];
(
  way["building"](${bbox});
  way["highway"](${bbox});
);
out body;
>;
out skel qt;`;
  console.log(`Overpass へ問い合わせ中… bbox=${bbox}`);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Overpass は識別可能な User-Agent が無いと 406 を返すことがある。
      'User-Agent': 'TanPoPo2026-map-ingest/1.0 (sohosai map data)',
      Accept: 'application/json',
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    throw new Error(`Overpass エラー: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements;
}

function ringCentroid(ring: [number, number][]): [number, number] {
  const pts =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  const sum = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [round(sum[0] / pts.length), round(sum[1] / pts.length)];
}

/** 通路ネットワークの連結成分数を数える（Union-Find）。 */
function countComponents(lines: [number, number][][]): number {
  const index = new Map<string, number>();
  const parent: number[] = [];
  const key = (p: [number, number]) => `${p[0]},${p[1]}`;
  const node = (p: [number, number]) => {
    const k = key(p);
    let i = index.get(k);
    if (i === undefined) {
      i = parent.length;
      index.set(k, i);
      parent.push(i);
    }
    return i;
  };
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      parent[find(node(line[i - 1]))] = find(node(line[i]));
    }
  }
  const roots = new Set<number>();
  for (let i = 0; i < parent.length; i++) roots.add(find(i));
  return roots.size;
}

type CoordsOf = (way: OsmWay) => [number, number][];

/** 建物 way から Polygon feature を作る。 */
function extractBuildings(ways: OsmWay[], coordsOf: CoordsOf) {
  const features = [];
  const sampleNames: string[] = [];
  let namedBuildings = 0;
  for (const w of ways) {
    if (!w.tags?.building) continue;
    const coords = coordsOf(w);
    if (coords.length < 4) continue;
    const ring = [...coords];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
    const name = w.tags.name ?? null;
    if (name) {
      namedBuildings++;
      if (sampleNames.length < 15) sampleNames.push(name);
    }
    features.push({
      type: 'Feature' as const,
      properties: {
        // 取り込み元の OSM way を一意キーに（curated な bldg-xxx とは別管理）。
        osmId: `w${w.id}`,
        name,
        building: w.tags.building,
        levels: w.tags['building:levels'] ?? null,
        center: ringCentroid(ring),
      },
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
    });
  }
  return { features, namedBuildings, sampleNames };
}

/** 歩行者が通れる highway way から LineString feature を作る。 */
function extractPaths(ways: OsmWay[], coordsOf: CoordsOf) {
  const features = [];
  const lines: [number, number][][] = [];
  const highwayCounts: Record<string, number> = {};
  for (const w of ways) {
    const hw = w.tags?.highway;
    if (!hw || !WALKABLE.has(hw)) continue;
    const coords = coordsOf(w);
    if (coords.length < 2) continue;
    highwayCounts[hw] = (highwayCounts[hw] ?? 0) + 1;
    lines.push(coords);
    features.push({
      type: 'Feature' as const,
      properties: {
        kind: 'walkway' as const,
        osmId: `w${w.id}`,
        highway: hw,
        name: w.tags.name ?? null,
      },
      geometry: { type: 'LineString' as const, coordinates: coords },
    });
  }
  return { features, lines, highwayCounts };
}

async function main() {
  const elements = await fetchOverpass();

  const nodes = new Map<number, [number, number]>();
  const ways: OsmWay[] = [];
  for (const el of elements) {
    if (el.type === 'node') nodes.set(el.id, [round(el.lon), round(el.lat)]);
    else if (el.type === 'way') ways.push(el);
  }
  const coordsOf: CoordsOf = (way) =>
    way.nodes
      .map((id) => nodes.get(id))
      .filter((c): c is [number, number] => c !== undefined);

  const {
    features: buildingFeatures,
    namedBuildings,
    sampleNames,
  } = extractBuildings(ways, coordsOf);
  const {
    features: pathFeatures,
    lines: pathLines,
    highwayCounts,
  } = extractPaths(ways, coordsOf);

  mkdirSync(OUT_DIR, { recursive: true });
  const buildingsFc = {
    type: 'FeatureCollection',
    note: '© OpenStreetMap contributors (ODbL). OSM 取り込みの建物（レビュー用）。',
    features: buildingFeatures,
  };
  const pathFc = {
    type: 'FeatureCollection',
    note: '© OpenStreetMap contributors (ODbL). OSM 取り込みの歩行者道（レビュー用）。',
    features: pathFeatures,
  };
  writeFileSync(
    join(OUT_DIR, 'buildings.osm.geojson'),
    `${JSON.stringify(buildingsFc, null, 2)}\n`,
  );
  writeFileSync(
    join(OUT_DIR, 'path-network.osm.geojson'),
    `${JSON.stringify(pathFc, null, 2)}\n`,
  );

  // ---- サマリ ----
  const components = countComponents(pathLines);
  console.log('\n=== 取り込み結果 ===');
  console.log(`建物: ${buildingFeatures.length}（名称あり ${namedBuildings}）`);
  console.log(`歩行者道: ${pathFeatures.length}`);
  console.log(`  種別内訳: ${JSON.stringify(highwayCounts)}`);
  console.log(`  連結成分数: ${components}（1 なら全て繋がっている）`);
  console.log(`建物名サンプル: ${sampleNames.join(' / ')}`);
  console.log(`\n出力: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error('取り込み失敗:', e);
  process.exit(1);
});
