import type { ProjectCategory, ScheduleDay } from 'api';

/**
 * 企画一覧の検索・絞り込み条件。
 * 全件取得済みの Project[] に対してクライアント側で適用する。
 */
export type ProjectFilterCriteria = {
  /** あいまい検索キーワード */
  q: string;
  /** 主分類（OR：いずれかに一致） */
  categories: ProjectCategory[];
  /** 開催日（OR：いずれかに一致） */
  days: ScheduleDay[];
  /** タグ（AND：すべて含む） */
  tags: string[];
  /** お気に入り（いいね）済みだけに絞り込む */
  favorite: boolean;
};

export const emptyCriteria: ProjectFilterCriteria = {
  q: '',
  categories: [],
  days: [],
  tags: [],
  favorite: false,
};

export const CATEGORY_OPTIONS: readonly ProjectCategory[] = [
  '食品',
  '物販',
  '展示',
  '学術',
  'ステージ',
  'その他',
];

export const SCHEDULE_OPTIONS: readonly ScheduleDay[] = [
  '前夜祭',
  'Day1',
  'Day2',
];

/** 配列に値が無ければ足し、あれば除いた新しい配列を返す（複数選択のオン/オフ）。 */
export function toggleItem<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** 適用中の絞り込みが1つでもあるか（検索キーワードは含めない） */
export function hasActiveFilter(criteria: ProjectFilterCriteria): boolean {
  return (
    criteria.categories.length > 0 ||
    criteria.days.length > 0 ||
    criteria.tags.length > 0 ||
    criteria.favorite
  );
}

// ---- URL クエリ <-> 条件 の相互変換 ----

const SEP = ',';

/**
 * URLSearchParams から条件を復元する。
 * 共有された URL は手で書き換えられうるため、選択肢にない分類・開催日は捨てる。
 */
export function criteriaFromParams(
  params: URLSearchParams,
): ProjectFilterCriteria {
  const readList = (key: string): string[] => {
    const raw = params.get(key);
    return raw ? raw.split(SEP).filter(Boolean) : [];
  };
  const readOptions = <T extends string>(
    key: string,
    options: readonly T[],
  ): T[] => options.filter((option) => readList(key).includes(option));
  return {
    q: params.get('q') ?? '',
    categories: readOptions('category', CATEGORY_OPTIONS),
    days: readOptions('day', SCHEDULE_OPTIONS),
    tags: readList('tag'),
    favorite: params.get('fav') === '1',
  };
}

/**
 * 条件を URLSearchParams に書き出す。
 * 空の軸はパラメータ自体を消し、URL をきれいに保つ。
 */
export function criteriaToParams(
  criteria: ProjectFilterCriteria,
): URLSearchParams {
  const params = new URLSearchParams();
  if (criteria.q.trim() !== '') params.set('q', criteria.q.trim());
  if (criteria.categories.length > 0)
    params.set('category', criteria.categories.join(SEP));
  if (criteria.days.length > 0) params.set('day', criteria.days.join(SEP));
  if (criteria.tags.length > 0) params.set('tag', criteria.tags.join(SEP));
  if (criteria.favorite) params.set('fav', '1');
  return params;
}
