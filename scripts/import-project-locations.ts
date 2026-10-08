/**
 * 雙峰祭実行委員会から受け取った「企画実施場所一覧」(屋内・屋外の xlsx) を読み、
 * 企画番号ごとの実施場所 JSON（apps/api/data/project-locations.json）を生成する。
 *
 * - 表はエリアごとの列ブロックが横に並んだ形式で、各ブロックの見出し行に「場所」「企画番号」…が並ぶ。
 * - 企画番号の無い行（委員会企画）は対象外。
 * - 想定外の場所・実施日があれば、黙って捨てずにエラーで止める。
 *
 * 実行: bun run scripts/import-project-locations.ts <屋内.xlsx> <屋外.xlsx>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

type ScheduleDay = '前夜祭' | 'Day1' | 'Day2';
type Location = { placeId: string; room?: string; days: ScheduleDay[] };

const SHEET_NAME = '企画実施場所一覧';
const OUT_FILE = join(
  import.meta.dir,
  '..',
  'apps/api/data/project-locations.json',
);

// 建物名だけで書かれた場所。号棟（1B 等）は `bldg-1b` の規則で引く。
const NAMED_BUILDINGS: Record<string, string> = {
  中央図書館: 'bldg-library',
  開学記念館: 'bldg-kaigaku',
};
const NAMED_OUTDOOR: Record<string, string> = {
  セキショウフィールド: 'field-sekisho',
};

// 表の実施日は「土(10/31)日(11/1)」「10/30(金)前夜祭,10/31(土)」など書式が揺れており、
// 誤記（11/2〜11/4 の日曜）も含むため、日付の月日だけを見て判定する。
const DAY_PATTERNS: [RegExp, ScheduleDay][] = [
  [/10\/30/, '前夜祭'],
  [/10\/31/, 'Day1'],
  [/11\/\d/, 'Day2'],
];

function parseDays(raw: string, where: string): ScheduleDay[] {
  const days = DAY_PATTERNS.filter(([re]) => re.test(raw)).map(([, d]) => d);
  if (days.length === 0)
    throw new Error(`${where}: 実施日を解釈できない: "${raw}"`);
  return days;
}

function parsePlace(
  rawPlace: string,
  note: string,
  where: string,
): Omit<Location, 'days'> {
  const place = rawPlace.trim();
  const indoorRoom = place.match(/^(\d[A-H])(\d[\d-]*)$/);
  if (indoorRoom) {
    const [, building, room] = indoorRoom;
    return {
      placeId: `bldg-${building.toLowerCase()}`,
      room: note ? `${room}（${note}）` : room,
    };
  }
  // 部屋番号の無い場所（6A エントランスホール等）は、備考を部屋の代わりに表示する。
  if (/^\d[A-H]$/.test(place)) {
    return { placeId: `bldg-${place.toLowerCase()}`, room: note || undefined };
  }
  const booth = place.match(/^([A-Z])\d+$/);
  if (booth) return { placeId: `booth-${booth[1].toLowerCase()}`, room: place };
  const named = NAMED_BUILDINGS[place] ?? NAMED_OUTDOOR[place];
  if (named) return { placeId: named, room: note || undefined };
  throw new Error(`${where}: 場所を解釈できない: "${rawPlace}"`);
}

function readRows(
  file: string,
): { where: string; row: Record<string, string> }[] {
  const sheet = XLSX.read(readFileSync(file)).Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`${file}: シート「${SHEET_NAME}」が無い`);
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const header = rows[2] ?? [];
  const result: { where: string; row: Record<string, string> }[] = [];
  for (let start = 0; start < header.length; start++) {
    if (header[start] !== '場所') continue;
    let end = start;
    while (end < header.length && header[end] !== '') end++;
    const columns = header.slice(start, end);
    for (const [i, cells] of rows.slice(3).entries()) {
      const row = Object.fromEntries(
        columns.map((name, j) => [name, String(cells[start + j] ?? '').trim()]),
      );
      result.push({ where: `${file} ${i + 4}行目`, row });
    }
  }
  return result;
}

const [indoorFile, outdoorFile] = process.argv.slice(2);
if (!indoorFile || !outdoorFile) {
  console.error(
    '使い方: bun run scripts/import-project-locations.ts <屋内.xlsx> <屋外.xlsx>',
  );
  process.exit(1);
}

const byNumber = new Map<number, Location[]>();
for (const { where, row } of [
  ...readRows(indoorFile),
  ...readRows(outdoorFile),
]) {
  if (!/^\d+$/.test(row.企画番号 ?? '')) continue;
  const number = Number(row.企画番号);
  const location: Location = {
    ...parsePlace(row.場所, row.備考 ?? '', where),
    days: parseDays(row.実施日, where),
  };
  byNumber.set(number, [...(byNumber.get(number) ?? []), location]);
}

const sorted = Object.fromEntries(
  [...byNumber].sort(([a], [b]) => a - b).map(([n, locs]) => [String(n), locs]),
);
writeFileSync(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
// リポジトリの JSON は biome で整形しているため、生成後も同じ書式にそろえる（CI の format チェック対策）。
Bun.spawnSync(['bunx', 'biome', 'format', '--write', OUT_FILE], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
console.log(`${byNumber.size} 企画の実施場所を ${OUT_FILE} に書き出しました。`);
