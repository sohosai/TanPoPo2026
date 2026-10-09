/**
 * 雙峰祭公式サイトの各ステージのタイムテーブルを取得し、企画番号ごとの出演枠 JSON
 * （apps/api/data/stage-timetable.json）を生成する。公開後も内容が変わりうるため、
 * apps/api の build（= デプロイ前）で毎回取り直す。
 *
 * - 企画番号の無い枠（転換・休憩など）は企画に紐づかないため捨てる。
 * - 想定外の形のデータは黙って捨てずにエラーで止める。
 *
 * 実行: bun run import:stage-timetable
 *   TIMETABLE_URL を指定すると取得先を変えられる（既定は公式サイト）。
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TIMETABLE_URL =
  process.env.TIMETABLE_URL ?? 'https://sohosai.com/timetable';
const OUT_FILE = join(
  import.meta.dir,
  '..',
  'apps/api/data/stage-timetable.json',
);

// ファイル名 → place.ts のステージの placeId。
const STAGE_PLACE_IDS: Record<string, string> = {
  united: 'stage-united',
  '1a': 'stage-1a',
  kodo: 'stage-kaikan-kodo',
  hall: 'stage-kaikan-hall',
};

// タイムテーブルの日のキー → ScheduleDay。この順に並べる。
const DAYS: Record<string, string> = {
  eve: '前夜祭',
  day1: 'Day1',
  day2: 'Day2',
};
const DAY_ORDER = Object.values(DAYS);

const TIME_PATTERN = /^\d{2}:\d{2}$/;

type Performance = {
  placeId: string;
  day: string;
  start: string;
  end: string;
  title: string;
};

const errors: string[] = [];
const timetable: Record<string, Performance[]> = {};

for (const [file, placeId] of Object.entries(STAGE_PLACE_IDS)) {
  const url = `${TIMETABLE_URL}/${file}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} の取得に失敗: ${res.status} ${res.statusText}`);
  }
  const days = (await res.json()) as Record<string, unknown>;

  for (const [dayKey, slots] of Object.entries(days)) {
    const day = DAYS[dayKey];
    if (!day || !Array.isArray(slots)) {
      errors.push(`${file}: 想定外の日: ${dayKey}`);
      continue;
    }
    for (const slot of slots as Record<string, unknown>[]) {
      const { id, start, end, title } = slot;
      if (id == null || id === '') continue;
      if (
        typeof id !== 'string' ||
        !/^\d+$/.test(id) ||
        typeof start !== 'string' ||
        !TIME_PATTERN.test(start) ||
        typeof end !== 'string' ||
        !TIME_PATTERN.test(end) ||
        typeof title !== 'string'
      ) {
        errors.push(`${file} ${dayKey}: 想定外の枠: ${JSON.stringify(slot)}`);
        continue;
      }
      // 他の data/*.json に合わせ、キーはゼロ埋めしない企画番号にする。
      const number = String(Number(id));
      timetable[number] ??= [];
      timetable[number].push({ placeId, day, start, end, title });
    }
  }
}
if (errors.length > 0) {
  throw new Error(
    `タイムテーブルを変換できませんでした:\n${errors.join('\n')}`,
  );
}

for (const performances of Object.values(timetable)) {
  performances.sort(
    (a, b) =>
      DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) ||
      a.start.localeCompare(b.start),
  );
}

// 数値の文字列キーは JSON 上で番号順に並ぶ。
writeFileSync(OUT_FILE, `${JSON.stringify(timetable, null, 2)}\n`);
console.log(`${Object.keys(timetable).length} 企画分を出力: ${OUT_FILE}`);
