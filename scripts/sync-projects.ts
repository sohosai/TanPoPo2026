/**
 * SOS の公開 API から企画一覧を取得し、変わりにくい項目だけを企画 JSON
 * （apps/api/data/sources/sos-projects.json）に書き出して、追加・削除・変更された企画を表示する。
 * 画像・公開状態は実行時に取り直すため含めない。
 * デプロイはコミット済みの JSON をそのまま使うため、SOS の変更を取り込むときはこれを実行してコミットする。
 *
 * 実行: bun run sync:projects
 *   SOS_API_URL を指定すると取得先を変えられる（既定は本番の SOS）。
 *
 * 書き出した後、企画のマスターデータ（apps/api/data/projects.json）を作り直す。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type SosStaticProject,
  SosStaticProjectSchema,
} from '../apps/api/services/sos-schema';
import { buildProjects } from './build-projects';

const SOS_API_URL = process.env.SOS_API_URL || 'https://sos26-api.sohosai.com';
const OUT_FILE = join(
  import.meta.dir,
  '..',
  'apps/api/data/sources/sos-projects.json',
);

const res = await fetch(`${SOS_API_URL}/openapi/projects`);
if (!res.ok) {
  throw new Error(`SOS API エラー: ${res.status} ${res.statusText}`);
}
const projects = SosStaticProjectSchema.array()
  .parse(await res.json())
  .sort((a, b) => a.number - b.number);

const previous = new Map(
  (JSON.parse(readFileSync(OUT_FILE, 'utf-8')) as SosStaticProject[]).map(
    (project) => [project.number, project],
  ),
);
const current = new Set(projects.map(({ number }) => number));
const diff = {
  追加: projects.filter(({ number }) => !previous.has(number)),
  削除: [...previous.values()].filter(({ number }) => !current.has(number)),
  変更: projects.filter((project) => {
    const before = previous.get(project.number);
    return before && JSON.stringify(before) !== JSON.stringify(project);
  }),
};
for (const [title, list] of Object.entries(diff)) {
  if (list.length === 0) continue;
  console.log(`${title}:`);
  for (const { number, name } of list) console.log(`  ${number} ${name}`);
}

writeFileSync(OUT_FILE, `${JSON.stringify(projects, null, 2)}\n`);
// リポジトリの JSON は biome で整形しているため、生成後も同じ書式にそろえる（CI の format チェック対策）。
Bun.spawnSync(['bunx', 'biome', 'format', '--write', OUT_FILE], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
console.log(`${projects.length} 件を出力: ${OUT_FILE}`);

buildProjects();
