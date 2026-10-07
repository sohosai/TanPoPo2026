import type { ScheduleDay, ShopCategory } from 'api';
import { css } from '../../../../styled-system/css';

export const DAY_LABELS: Record<ScheduleDay, string> = {
  前夜祭: '前夜祭',
  Day1: '1日目',
  Day2: '2日目',
};

export function formatSchedule(days: ScheduleDay[]): string {
  return days.map((day) => DAY_LABELS[day]).join('・');
}

// Panda は css() の引数を静的解析するため、分類ごとのクラスは動的に組み立てず列挙しておく。
export const CATEGORY_COLOR_CLASS: Record<ShopCategory, string> = {
  食品: css({ color: 'category.food', bg: 'category.food.bg' }),
  物販: css({ color: 'category.goods', bg: 'category.goods.bg' }),
  展示: css({ color: 'category.exhibit', bg: 'category.exhibit.bg' }),
  学術: css({ color: 'category.academic', bg: 'category.academic.bg' }),
  ステージ: css({ color: 'category.stage', bg: 'category.stage.bg' }),
  その他: css({ color: 'category.other', bg: 'category.other.bg' }),
};
