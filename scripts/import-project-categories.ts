/**
 * 雙峰祭実行委員会から受け取った企画一覧の CSV を読み、企画番号ごとの分類 JSON
 * （apps/api/data/sources/project-categories.json）を生成する。
 *
 * - 企画一覧.csv は「企画番号」「企画のカテゴリ」列を持つ。
 * - 学術企画.csv は「企画番号」列を持ち、載っている企画は企画一覧での分類によらず「学術」にする。
 * - 想定外のカテゴリがあれば、黙って捨てずにエラーで止める。
 *
 * 実行: bun run import:project-categories <企画一覧.csv> <学術企画.csv>
 *
 * 書き出した後、企画のマスターデータ（apps/api/data/projects.json）を作り直す。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import {
  PROJECT_CATEGORIES,
  type ProjectCategory,
} from '../apps/api/domain/project';
import { buildProjects } from './build-projects';

const OUT_FILE = join(
  import.meta.dir,
  '..',
  'apps/api/data/sources/project-categories.json',
);

const isCategory = (value: string): value is ProjectCategory =>
  (PROJECT_CATEGORIES as readonly string[]).includes(value);

// XLSX に Buffer を渡すと文字コードを推測して誤読するため、UTF-8 として読んだ文字列を渡す。
// 先頭の BOM は trimStart で落ちる。
function readRows(
  file: string,
): { where: string; row: Record<string, string> }[] {
  const text = readFileSync(file, 'utf-8').trimStart();
  const sheet = XLSX.read(text, { type: 'string' }).Sheets.Sheet1;
  return XLSX.utils
    .sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false })
    .map((row, i) => ({ where: `${file} ${i + 2}行目`, row }));
}

const [listFile, academicFile] = process.argv.slice(2);
if (!listFile || !academicFile) {
  console.error(
    '使い方: bun run import:project-categories <企画一覧.csv> <学術企画.csv>',
  );
  process.exit(1);
}

const errors: string[] = [];
const categories = new Map<number, ProjectCategory>();
const assign = (where: string, rawNumber: string, category: string) => {
  const number = rawNumber.trim();
  if (!/^\d+$/.test(number)) {
    errors.push(`${where}: 企画番号を解釈できない: "${number}"`);
  } else if (!isCategory(category)) {
    errors.push(`${where}: 想定外のカテゴリ: "${category}"`);
  } else {
    categories.set(Number(number), category);
  }
};
for (const { where, row } of readRows(listFile)) {
  assign(where, row.企画番号 ?? '', row.企画のカテゴリ?.trim() ?? '');
}
for (const { where, row } of readRows(academicFile)) {
  assign(where, row.企画番号 ?? '', '学術');
}
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const sorted = Object.fromEntries(
  [...categories].sort(([a], [b]) => a - b).map(([n, c]) => [String(n), c]),
);
writeFileSync(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
// リポジトリの JSON は biome で整形しているため、生成後も同じ書式にそろえる（CI の format チェック対策）。
Bun.spawnSync(['bunx', 'biome', 'format', '--write', OUT_FILE], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
console.log(`${categories.size} 企画の分類を ${OUT_FILE} に書き出しました。`);

buildProjects();
