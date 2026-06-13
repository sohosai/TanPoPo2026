/**
 * OSM 取り込み結果（data/osm/*.osm.geojson）を curated データへマージする（プランA・②）。
 *
 * 1. 建物: 我々の建物 Place の名前と OSM 建物名（"5C" ↔ "5C棟" 等）を正規化して一致させ、
 *    OSM の実フットプリントを placeId 付きで buildings.geojson に採用する。
 * 2. 歩道: OSM walkable 道の「最大連結成分」を採用して path-network.geojson の通路にする。
 * 3. 入口: 各建物の重心 → 最寄りの歩道ノードへ接続線（kind:'entrance', auto:true）を自動生成し、
 *    連結性を担保しつつ「建物につながる道」を placeId で明示する。
 *
 * 前提: 先に `bun run scripts/ingest-osm.ts` で data/osm/ を生成しておくこと。
 * 実行: bun run scripts/merge-osm.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTRPCContext } from '../apps/api/trpc/context';
import { appRouter } from '../apps/api/trpc/router';

type Pos = [number, number];

const DATA_DIR = join(
  import.meta.dir,
  '..',
  'apps/web/app/components/features/Map/data',
);
const OSM_DIR = join(DATA_DIR, 'osm');
const LICENSE = '© OpenStreetMap contributors (ODbL)';

const round = (n: number) => Math.round(n * 1e7) / 1e7;
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8'));
/** 建物名の正規化（空白除去・末尾「棟」除去）。"5C" ↔ "5C棟" を一致させる。 */
const normalizeName = (s: string) => s.replace(/\s+/g, '').replace(/棟$/, '');

function polygonCentroid(ring: Pos[]): Pos {
  const pts =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  const s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [round(s[0] / pts.length), round(s[1] / pts.length)];
}

function dist2(a: Pos, b: Pos): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** 歩道 LineString 群の最大連結成分のインデックス集合を返す。 */
function largestComponent(lines: Pos[][]): Set<number> {
  const idx = new Map<string, number>();
  const parent: number[] = [];
  const key = (p: Pos) => `${p[0]},${p[1]}`;
  const node = (p: Pos) => {
    const k = key(p);
    let i = idx.get(k);
    if (i === undefined) {
      i = parent.length;
      idx.set(k, i);
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
  // 各 line を「先頭ノードの root」でグループ化し、最大グループを選ぶ。
  const groups = new Map<number, number[]>();
  lines.forEach((line, i) => {
    const root = find(node(line[0]));
    const arr = groups.get(root) ?? [];
    arr.push(i);
    groups.set(root, arr);
  });
  let best: number[] = [];
  for (const arr of groups.values()) if (arr.length > best.length) best = arr;
  return new Set(best);
}

type OsmBuilding = {
  properties: { name: string | null };
  geometry: { coordinates: Pos[][] };
};

/** 建物 Place を OSM フットプリントに対応づけ、buildings.geojson の features を作る。 */
function matchBuildings(
  buildingPlaces: { id: string; name: string }[],
  osmBuildings: OsmBuilding[],
) {
  const byName = new Map<string, OsmBuilding[]>();
  for (const f of osmBuildings) {
    if (!f.properties.name) continue;
    const k = normalizeName(f.properties.name);
    const arr = byName.get(k) ?? [];
    arr.push(f);
    byName.set(k, arr);
  }
  const features = [];
  const matched: { id: string; centroid: Pos }[] = [];
  const unmatched: string[] = [];
  for (const place of buildingPlaces) {
    const candidates = byName.get(normalizeName(place.name));
    if (!candidates || candidates.length === 0) {
      unmatched.push(`${place.id}(${place.name})`);
      continue;
    }
    // 複数一致時は外周点数が最多＝主要構造を採用。
    const best = candidates.reduce((a, b) =>
      b.geometry.coordinates[0].length > a.geometry.coordinates[0].length
        ? b
        : a,
    );
    const ring = best.geometry.coordinates[0];
    features.push({
      type: 'Feature' as const,
      properties: { placeId: place.id, name: place.name },
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
    });
    matched.push({ id: place.id, centroid: polygonCentroid(ring) });
  }
  return { features, matched, unmatched };
}

async function main() {
  const caller = appRouter.createCaller(await createTRPCContext());
  const places = await caller.place.list();
  const buildingPlaces = places.filter((p) => p.kind === 'building');

  const osmBuildings = readJson(join(OSM_DIR, 'buildings.osm.geojson'))
    .features as OsmBuilding[];
  const osmPaths = readJson(join(OSM_DIR, 'path-network.osm.geojson'))
    .features as {
    properties: { highway?: string; name?: string | null; osmId?: string };
    geometry: { coordinates: Pos[] };
  }[];

  // ---- 建物 ----
  const {
    features: buildingFeatures,
    matched,
    unmatched,
  } = matchBuildings(buildingPlaces, osmBuildings);

  // ---- 歩道（最大連結成分） ----
  const lines = osmPaths.map((f) => f.geometry.coordinates);
  const keep = largestComponent(lines);
  const walkwayFeatures = osmPaths
    .filter((_, i) => keep.has(i))
    .map((f) => ({
      type: 'Feature' as const,
      properties: {
        kind: 'walkway' as const,
        highway: f.properties.highway ?? null,
        name: f.properties.name ?? null,
        osmId: f.properties.osmId ?? null,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: f.geometry.coordinates,
      },
    }));

  // 採用した歩道のノード集合（入口スナップ先）。
  const nodes: Pos[] = [];
  for (const f of walkwayFeatures)
    for (const c of f.geometry.coordinates) nodes.push(c);

  // ---- 入口（建物重心 → 最寄り歩道ノード） ----
  const entranceFeatures = matched.map(({ id, centroid }) => {
    let nearest = nodes[0];
    let min = Number.POSITIVE_INFINITY;
    for (const n of nodes) {
      const d = dist2(centroid, n);
      if (d < min) {
        min = d;
        nearest = n;
      }
    }
    const place = buildingPlaces.find((p) => p.id === id);
    return {
      type: 'Feature' as const,
      properties: {
        kind: 'entrance' as const,
        placeId: id,
        name: `${place?.name ?? id} 接続`,
        auto: true,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [centroid, nearest],
      },
    };
  });

  // ---- 書き出し ----
  writeFileSync(
    join(DATA_DIR, 'buildings.geojson'),
    `${JSON.stringify(
      {
        type: 'FeatureCollection',
        note: `建物フットプリント（${LICENSE} を加工）。placeId で place.ts と結合。`,
        features: buildingFeatures,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(DATA_DIR, 'path-network.geojson'),
    `${JSON.stringify(
      {
        type: 'FeatureCollection',
        note: `歩行者通路（${LICENSE} を加工）。kind='walkway' は OSM 歩道、kind='entrance'(auto) は建物重心→最寄りノードの自動接続。`,
        features: [...walkwayFeatures, ...entranceFeatures],
      },
      null,
      2,
    )}\n`,
  );

  // ---- レポート ----
  console.log('=== マージ結果 ===');
  console.log(
    `建物: ${buildingFeatures.length} / ${buildingPlaces.length} 件を対応づけ`,
  );
  if (unmatched.length) console.warn(`  未一致: ${unmatched.join(', ')}`);
  console.log(
    `歩道(最大連結成分): ${walkwayFeatures.length} 本 / 全 ${osmPaths.length} 本`,
  );
  console.log(`自動入口: ${entranceFeatures.length} 件`);
  console.log('\nplace.ts の point 更新候補（必要なら反映）:');
  for (const m of matched)
    console.log(`  ${m.id}: [${m.centroid[0]}, ${m.centroid[1]}]`);
}

main().catch((e) => {
  console.error('マージ失敗:', e);
  process.exit(1);
});
