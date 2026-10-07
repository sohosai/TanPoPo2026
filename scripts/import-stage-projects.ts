/**
 * SOS の公開 API からステージ企画の実施ステージを取得し、企画番号ごとのステージ JSON
 * （apps/api/data/stage-projects.json）を生成する。
 *
 * - 実施ステージは SOS のカスタム項目「ステージ実施場所 確定」に略称で入っている。
 * - ステージ企画なのに実施ステージが無い・想定外の略称があれば、黙って捨てずにエラーで止める。
 *
 * 実行: bun run import:stage-projects
 *   SOS_API_URL を指定すると取得先を変えられる（既定は本番の SOS）。
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOS_API_URL = process.env.SOS_API_URL ?? 'https://sos26-api.sohosai.com';
const OUT_FILE = join(
  import.meta.dir,
  '..',
  'apps/api/data/stage-projects.json',
);

const STAGE_FIELD = 'ステージ実施場所 確定';
// 略称 → place.ts のステージの placeId。
const STAGE_PLACE_IDS: Record<string, string> = {
  '1A': 'stage-1a',
  UNI: 'stage-united',
  '会館（講堂）': 'stage-kaikan-kodo',
  '会館（ホール）': 'stage-kaikan-hall',
};

type Project = {
  number: number;
  name: string;
  type: string;
  customFields?: Record<string, unknown> | null;
};

const res = await fetch(`${SOS_API_URL}/openapi/projects`);
if (!res.ok) {
  throw new Error(`SOS API エラー: ${res.status} ${res.statusText}`);
}
const projects = (await res.json()) as Project[];

const errors: string[] = [];
const stages: Record<string, string> = {};
for (const project of projects) {
  const stage = project.customFields?.[STAGE_FIELD];
  if (stage == null || stage === '') {
    if (project.type === 'STAGE') {
      errors.push(`${project.number} ${project.name}: 実施ステージが無い`);
    }
    continue;
  }
  const placeId = STAGE_PLACE_IDS[String(stage)];
  if (!placeId) {
    errors.push(`${project.number} ${project.name}: 想定外の略称: ${stage}`);
    continue;
  }
  stages[project.number] = placeId;
}
if (errors.length > 0) {
  throw new Error(`ステージ企画を変換できませんでした:\n${errors.join('\n')}`);
}

// 数値の文字列キーは JSON 上で番号順に並ぶ。
writeFileSync(OUT_FILE, `${JSON.stringify(stages, null, 2)}\n`);
console.log(`${Object.keys(stages).length} 件を出力: ${OUT_FILE}`);
