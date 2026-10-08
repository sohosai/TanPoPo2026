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

/** 中止などの、塗りで目立たせる小さなラベルの形。 */
export const badgeClass = css({
  px: '7px',
  py: '0.5em',
  textBox: 'trim-both cap alphabetic',
  borderRadius: 'full',
  fontSize: '2xs',
  fontWeight: 500,
});

// Panda は css() の引数を静的解析するため、分類ごとのクラスは動的に組み立てず列挙しておく。
export const CATEGORY_TAG_CLASS: Record<ProjectCategory, string> = {
  食品: css({ bg: 'category.food.bg' }),
  物販: css({ bg: 'category.goods.bg' }),
  展示: css({ bg: 'category.exhibit.bg' }),
  学術: css({ bg: 'category.academic.bg' }),
  ステージ: css({ bg: 'category.stage.bg' }),
  その他: css({ bg: 'category.other.bg' }),
};

/** 画像のない企画のアイコンの面。 */
export const CATEGORY_COLOR_CLASS: Record<ProjectCategory, string> = {
  食品: css({ color: 'fg', bg: 'category.food.bg' }),
  物販: css({ color: 'fg', bg: 'category.goods.bg' }),
  展示: css({ color: 'fg', bg: 'category.exhibit.bg' }),
  学術: css({ color: 'fg', bg: 'category.academic.bg' }),
  ステージ: css({ color: 'fg', bg: 'category.stage.bg' }),
  その他: css({ color: 'fg', bg: 'category.other.bg' }),
};
