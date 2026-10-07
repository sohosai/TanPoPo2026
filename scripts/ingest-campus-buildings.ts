/**
 * 筑波大学の敷地内にある建物の OSM way id を取得し、3D 表示で立体にする建物の一覧として書き出すスクリプト。
 *
 * 地図タイルの建物の id は OSM の way id なので、この一覧で学外の建物を立体の対象から外す。
 * MapLibre の within 式はポリゴンの地物を判定できないため、範囲での絞り込みは使えない。
 *
 * 実行: bun run ingest:campus-buildings
 *
 * ライセンス: 取得データは © OpenStreetMap contributors (ODbL)。
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// 筑波大学（amenity=university）の敷地ポリゴン。地図スタイルの hongaku-area と同じもの。
const CAMPUS_WAY_ID = 183555029;
const OUT_FILE = join(
  import.meta.dir,
  '..',
  'apps/web/app/components/features/Map/data/campus-building-ids.json',
);

const query = `[out:json][timeout:60];
way(${CAMPUS_WAY_ID});
map_to_area->.campus;
way["building"](area.campus);
out ids;`;

console.log('Overpass へ問い合わせ中…');
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
const { elements } = (await res.json()) as { elements: { id: number }[] };
const ids = elements.map(({ id }) => id).sort((a, b) => a - b);

writeFileSync(OUT_FILE, `${JSON.stringify(ids)}\n`);
console.log(`${ids.length} 件を出力: ${OUT_FILE}`);
