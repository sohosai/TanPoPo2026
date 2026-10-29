/**
 * D1 からグランプリの票数と来場者アンケートの回答を取り出し、CSV に書き出す。
 *
 * 実行: bun run export:data --env <zoo|prod> --report <レポート> --out <フォルダ> [--until "2026-11-01 18:00"]
 *
 * 個人に結びつくデータを含むため、データや件数は標準出力に出さない（Actions のログは公開される）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { type GrandprixStage, grandprixStages } from '../apps/api/db/schema';
import type { ProjectMaster } from '../apps/api/domain/project';
import {
  type Answers,
  QUESTIONNAIRE_QUESTIONS,
} from '../apps/web/app/components/features/Questionnaire/questions';

const ENVS = ['zoo', 'prod'] as const;
const REPORTS = [
  'grandprix-votes',
  'questionnaire-count',
  'questionnaire-responses',
] as const;
type Env = (typeof ENVS)[number];
type Report = (typeof REPORTS)[number];
type Csv = (string | number)[][];

const API_DIR = join(import.meta.dir, '..', 'apps/api');

function oneOf<T extends string>(
  values: readonly T[],
  value: string | undefined,
  name: string,
): T {
  if (!values.includes(value as T)) {
    throw new Error(`--${name} は ${values.join(' / ')} のどれかを指定する`);
  }
  return value as T;
}

/** 日本時間の日時を UNIX 秒にする。D1 の submitted_at と比べるため。 */
function parseUntil(raw: string): number {
  const date = new Date(`${raw.trim().replace(' ', 'T')}+09:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`--until を解釈できない: "${raw}"（例: 2026-11-01 18:00）`);
  }
  return Math.floor(date.getTime() / 1000);
}

function formatJst(date: Date): string {
  return date.toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

function query<T>(env: Env, sql: string): T[] {
  const result = Bun.spawnSync(
    [
      'bunx',
      'wrangler',
      'd1',
      'execute',
      'DB',
      '--env',
      env,
      '--remote',
      '--json',
      '--command',
      sql,
    ],
    { cwd: API_DIR, stderr: 'inherit' },
  );
  // --json では失敗も stdout に {"error":{"text":…}} で返る。データを出さないよう、エラー文だけを示す。
  if (result.exitCode !== 0) {
    let reason = '';
    try {
      reason = JSON.parse(result.stdout.toString()).error?.text ?? '';
    } catch {}
    throw new Error(
      `wrangler d1 execute が失敗した（exit ${result.exitCode}）: ${reason}`,
    );
  }
  const [statement] = JSON.parse(result.stdout.toString()) as {
    results: T[];
  }[];
  return statement.results;
}

// Excel で開いたときに日本語が文字化けしないよう、BOM と CRLF を付ける。
function toCsv(rows: Csv): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `﻿${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}

function grandprixVotes(env: Env, before: (column: string) => string) {
  const projects = new Map(
    (
      JSON.parse(
        readFileSync(join(API_DIR, 'data/projects.json'), 'utf-8'),
      ) as ProjectMaster[]
    ).map((project) => [project.id, project]),
  );

  const ranking = (rows: { projectId: string; votes: number }[]): Csv => [
    ['企画番号', '企画名', '票数'],
    ...rows
      .map(({ projectId, votes }) => {
        const project = projects.get(projectId);
        return [project?.number ?? '', project?.name ?? projectId, votes];
      })
      .sort(
        ([aNumber, , aVotes], [bNumber, , bVotes]) =>
          Number(bVotes) - Number(aVotes) ||
          String(aNumber).localeCompare(String(bNumber)),
      ),
  ];

  const general = query<{ projectId: string; votes: number }>(
    env,
    `SELECT g.project_id AS projectId, COUNT(*) AS votes
     FROM grandprix_general_votes g JOIN grandprix_votes v ON v.id = g.vote_id
     ${before('v.submitted_at')}
     GROUP BY g.project_id`,
  );
  const stage = query<{
    stage: GrandprixStage;
    projectId: string;
    votes: number;
  }>(
    env,
    `SELECT s.stage AS stage, s.project_id AS projectId, COUNT(*) AS votes
     FROM grandprix_stage_votes s JOIN grandprix_votes v ON v.id = s.vote_id
     ${before('v.submitted_at')}
     GROUP BY s.stage, s.project_id`,
  );
  const [{ voters, winners }] = query<{ voters: number; winners: number }>(
    env,
    `SELECT COUNT(*) AS voters, COUNT(CASE WHEN d.result = 'win' THEN 1 END) AS winners
     FROM grandprix_votes v LEFT JOIN grandprix_draws d ON d.vote_id = v.id
     ${before('v.submitted_at')}`,
  );

  return {
    'general.csv': ranking(general),
    ...Object.fromEntries(
      grandprixStages.map((s) => [
        `stage-${s}.csv`,
        ranking(stage.filter((row) => row.stage === s)),
      ]),
    ),
    'summary.csv': [
      ['項目', '値'],
      ['投票者数', voters],
      ['当選数', winners],
    ],
  };
}

function questionnaireCount(env: Env, before: (column: string) => string) {
  const rows = query<{ day: string; submissions: number; people: number }>(
    env,
    `SELECT date(submitted_at, 'unixepoch', '+9 hours') AS day,
            COUNT(*) AS submissions, SUM(headcount) AS people
     FROM questionnaire_submissions
     ${before('submitted_at')}
     GROUP BY day ORDER BY day`,
  );
  const sum = (key: 'submissions' | 'people') =>
    rows.reduce((total, row) => total + row[key], 0);
  return {
    'count.csv': [
      ['日付', '送信数', '回答人数'],
      ...rows.map((row) => [row.day, row.submissions, row.people]),
      ['合計', sum('submissions'), sum('people')],
    ],
  };
}

function questionnaireResponses(env: Env, before: (column: string) => string) {
  const rows = query<{
    submissionId: string;
    submittedAt: number;
    personIndex: number;
    answers: string;
  }>(
    env,
    `SELECT s.id AS submissionId, s.submitted_at AS submittedAt,
            r.person_index AS personIndex, r.answers AS answers
     FROM questionnaire_responses r
     JOIN questionnaire_submissions s ON s.id = r.submission_id
     ${before('s.submitted_at')}
     ORDER BY s.submitted_at, s.id, r.person_index`,
  );

  // 「その他」の記述は、その選択肢を持つ質問のすぐ右に列を置く。
  const columns = QUESTIONNAIRE_QUESTIONS.flatMap((question, index) => {
    const no = `No.${index + 1}`;
    const hasOther =
      question.type !== 'text' &&
      question.options.some((option) => option.kind === 'other');
    return [
      { key: question.id, header: `${no} ${question.label.ja}` },
      ...(hasOther
        ? [{ key: `${question.id}Other`, header: `${no} その他の記述` }]
        : []),
    ];
  });

  // user_id の代わりに、送信ごとの通し番号で同じグループの回答を見分けられるようにする。
  const submissionNumbers = new Map<string, number>();
  return {
    'responses.csv': [
      ['回答日時', '送信番号', '何人目', ...columns.map((c) => c.header)],
      ...rows.map((row) => {
        if (!submissionNumbers.has(row.submissionId)) {
          submissionNumbers.set(row.submissionId, submissionNumbers.size + 1);
        }
        const answers = JSON.parse(row.answers) as Answers;
        return [
          formatJst(new Date(row.submittedAt * 1000)),
          submissionNumbers.get(row.submissionId) ?? '',
          row.personIndex,
          ...columns.map(({ key }) => {
            const answer = answers[key] ?? '';
            return Array.isArray(answer) ? answer.join('、') : answer;
          }),
        ];
      }),
    ],
  };
}

const REPORT_BUILDERS: Record<
  Report,
  (env: Env, before: (column: string) => string) => Record<string, Csv>
> = {
  'grandprix-votes': grandprixVotes,
  'questionnaire-count': questionnaireCount,
  'questionnaire-responses': questionnaireResponses,
};

const { values } = parseArgs({
  options: {
    env: { type: 'string' },
    report: { type: 'string' },
    out: { type: 'string' },
    until: { type: 'string' },
  },
});

const env = oneOf(ENVS, values.env, 'env');
const report = oneOf(REPORTS, values.report, 'report');
if (!values.out) throw new Error('--out に書き出し先のフォルダを指定する');
const until = values.until?.trim() ? parseUntil(values.until) : undefined;
const before = (column: string) =>
  until === undefined ? '' : `WHERE ${column} < ${until}`;

const files = REPORT_BUILDERS[report](env, before);
files['summary.csv'] = [
  ['項目', '値'],
  ...(files['summary.csv']?.slice(1) ?? []),
  ['環境', env],
  ['集計時刻', formatJst(new Date())],
  ['対象', until === undefined ? 'すべて' : `${values.until} より前`],
];

mkdirSync(values.out, { recursive: true });
for (const [name, rows] of Object.entries(files)) {
  writeFileSync(join(values.out, name), toCsv(rows));
}
console.log(`${Object.keys(files).length} ファイルを書き出した: ${values.out}`);
