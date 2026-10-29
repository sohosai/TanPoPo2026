import type { Performance, ProjectCategory, ScheduleDay } from 'api';
import { css } from '../../../../styled-system/css';

export const DAY_LABELS: Record<ScheduleDay, string> = {
  前夜祭: '前夜祭',
  Day1: '1日目',
  Day2: '2日目',
};

export function formatSchedule(days: ScheduleDay[]): string {
  return days.map((day) => DAY_LABELS[day]).join('・');
}

const DAY_ORDER = Object.keys(DAY_LABELS) as ScheduleDay[];

/** 実施日の早い順（最初の実施日で比べる）。日替わりで同じ場所を使う企画を時系列に並べる。 */
export const compareSchedule = (a: ScheduleDay[], b: ScheduleDay[]) =>
  DAY_ORDER.indexOf(a[0]) - DAY_ORDER.indexOf(b[0]);

/** 出演枠の時間（例 "1日目 10:00〜10:35"）。 */
export const formatPerformance = ({ day, start, end }: Performance) =>
  `${DAY_LABELS[day]} ${start}〜${end}`;

/** 一覧向けに最初の出演枠だけを出し、残りは回数で示す（例 "前夜祭 18:20〜19:40 ほか1回"）。 */
export function formatPerformances([first, ...rest]: Performance[]): string {
  if (!first) return '';
  const label = formatPerformance(first);
  return rest.length > 0 ? `${label} ほか${rest.length}回` : label;
}

// Panda は css() の引数を静的解析するため、分類ごとのクラスは動的に組み立てず列挙しておく。
export const CATEGORY_TAG_CLASS: Record<ProjectCategory, string> = {
  食事: css({ bg: 'category.meal.bg' }),
  スイーツ: css({ bg: 'category.sweets.bg' }),
  ドリンク: css({ bg: 'category.drink.bg' }),
  物品販売: css({ bg: 'category.goods.bg' }),
  展示型: css({ bg: 'category.exhibit.bg' }),
  参加型: css({ bg: 'category.handsOn.bg' }),
  学術: css({ bg: 'category.academic.bg' }),
  パフォーマンス: css({ bg: 'category.performance.bg' }),
  音楽: css({ bg: 'category.music.bg' }),
  委員会企画: css({ bg: 'category.committee.bg' }),
  その他: css({ bg: 'category.other.bg' }),
};

/** 絞り込みの選択肢に添える分類の色の点。地図のテントやピンと同じ色にする。 */
export const CATEGORY_DOT_CLASS: Record<ProjectCategory, string> = {
  食事: css({ bg: 'category.meal' }),
  スイーツ: css({ bg: 'category.sweets' }),
  ドリンク: css({ bg: 'category.drink' }),
  物品販売: css({ bg: 'category.goods' }),
  展示型: css({ bg: 'category.exhibit' }),
  参加型: css({ bg: 'category.handsOn' }),
  学術: css({ bg: 'category.academic' }),
  パフォーマンス: css({ bg: 'category.performance' }),
  音楽: css({ bg: 'category.music' }),
  委員会企画: css({ bg: 'category.committee' }),
  その他: css({ bg: 'category.other' }),
};

/** 画像のない企画のアイコンの面。 */
export const CATEGORY_COLOR_CLASS: Record<ProjectCategory, string> = {
  食事: css({ color: 'fg', bg: 'category.meal.bg' }),
  スイーツ: css({ color: 'fg', bg: 'category.sweets.bg' }),
  ドリンク: css({ color: 'fg', bg: 'category.drink.bg' }),
  物品販売: css({ color: 'fg', bg: 'category.goods.bg' }),
  展示型: css({ color: 'fg', bg: 'category.exhibit.bg' }),
  参加型: css({ color: 'fg', bg: 'category.handsOn.bg' }),
  学術: css({ color: 'fg', bg: 'category.academic.bg' }),
  パフォーマンス: css({ color: 'fg', bg: 'category.performance.bg' }),
  音楽: css({ color: 'fg', bg: 'category.music.bg' }),
  委員会企画: css({ color: 'fg', bg: 'category.committee.bg' }),
  その他: css({ color: 'fg', bg: 'category.other.bg' }),
};
