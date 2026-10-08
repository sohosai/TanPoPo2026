import type { ScheduleDay, ProjectCategory } from 'api';
import { css } from '../../../../styled-system/css';

export const DAY_LABELS: Record<ScheduleDay, string> = {
  前夜祭: '前夜祭',
  Day1: '1日目',
  Day2: '2日目',
};

export function formatSchedule(days: ScheduleDay[]): string {
  return days.map((day) => DAY_LABELS[day]).join('・');
}

/** 分類・中止などの小さなラベルの形。色は CATEGORY_COLOR_CLASS などと組み合わせる。 */
export const badgeClass = css({
  px: '6px',
  py: '0.45em',
  textBox: 'trim-both cap alphabetic',
  borderRadius: '4px',
  fontWeight: 700,
});

// Panda は css() の引数を静的解析するため、分類ごとのクラスは動的に組み立てず列挙しておく。
export const CATEGORY_COLOR_CLASS: Record<ProjectCategory, string> = {
  食品: css({ color: 'category.food', bg: 'category.food.bg' }),
  物販: css({ color: 'category.goods', bg: 'category.goods.bg' }),
  展示: css({ color: 'category.exhibit', bg: 'category.exhibit.bg' }),
  学術: css({ color: 'category.academic', bg: 'category.academic.bg' }),
  ステージ: css({ color: 'category.stage', bg: 'category.stage.bg' }),
  その他: css({ color: 'category.other', bg: 'category.other.bg' }),
};
