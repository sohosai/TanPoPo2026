import type { ScheduleDay, Shop, ShopCategory } from 'api';

/**
 * 店舗一覧の検索・絞り込み条件。
 * 全件取得済みの Shop[] に対してクライアント側で適用する（オフライン対応のため）。
 */
export type ShopFilterCriteria = {
  /** あいまい検索キーワード */
  q: string;
  /** 主分類（OR：いずれかに一致） */
  categories: ShopCategory[];
  /** 開催日（OR：いずれかに一致） */
  days: ScheduleDay[];
  /** タグ（AND：すべて含む） */
  tags: string[];
  /** お気に入り（いいね）済みだけに絞り込む */
  favorite: boolean;
};

export const emptyCriteria: ShopFilterCriteria = {
  q: '',
  categories: [],
  days: [],
  tags: [],
  favorite: false,
};

// UI の選択肢。TODO: 正式な分類が決まったら API の型に合わせて見直す。
export const CATEGORY_OPTIONS: ShopCategory[] = [
  '食品',
  '物販',
  '展示',
  '学術',
  'ステージ',
  'その他',
];

export const SCHEDULE_OPTIONS: ScheduleDay[] = ['前夜祭', 'Day1', 'Day2'];

/** 全角/半角・大文字小文字を吸収して比較しやすい形に正規化する */
export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().trim();
}

/** あいまい検索の対象文字列（名称・団体・場所・タグ）に一致するか */
function matchesQuery(shop: Shop, normalizedQuery: string): boolean {
  if (normalizedQuery === '') return true;
  const haystack = normalize(
    [shop.name, shop.organization, shop.location, ...shop.tags].join(' '),
  );
  return haystack.includes(normalizedQuery);
}

/**
 * 条件に合致する店舗だけを返す純粋関数。
 * 各軸は独立した述語として AND 結合。フィルタ軸を増やすときはここに条件を足す。
 *
 * お気に入りはアプリ横断のストアで管理されるため、criteria ではなく
 * その時点の ID 集合を引数で受け取る（フィルタを純粋関数のまま保つ）。
 */
export function filterShops(
  shops: Shop[],
  criteria: ShopFilterCriteria,
  favorites: ReadonlySet<string> = new Set(),
): Shop[] {
  const q = normalize(criteria.q);
  return shops.filter(
    (shop) =>
      matchesQuery(shop, q) &&
      (criteria.categories.length === 0 ||
        criteria.categories.includes(shop.category)) &&
      (criteria.days.length === 0 ||
        criteria.days.some((day) => shop.schedule.includes(day))) &&
      (criteria.tags.length === 0 ||
        criteria.tags.every((tag) => shop.tags.includes(tag))) &&
      (!criteria.favorite || favorites.has(shop.id)),
  );
}

/** 適用中の絞り込みが1つでもあるか（検索キーワードは含めない） */
export function hasActiveFilter(criteria: ShopFilterCriteria): boolean {
  return (
    criteria.categories.length > 0 ||
    criteria.days.length > 0 ||
    criteria.tags.length > 0 ||
    criteria.favorite
  );
}

// ---- URL クエリ <-> 条件 の相互変換 ----

const SEP = ',';

/** URLSearchParams から条件を復元する */
export function criteriaFromParams(
  params: URLSearchParams,
): ShopFilterCriteria {
  const readList = (key: string): string[] => {
    const raw = params.get(key);
    return raw ? raw.split(SEP).filter(Boolean) : [];
  };
  return {
    q: params.get('q') ?? '',
    categories: readList('category') as ShopCategory[],
    days: readList('day') as ScheduleDay[],
    tags: readList('tag'),
    favorite: params.get('fav') === '1',
  };
}

/**
 * 条件を URLSearchParams に書き出す。
 * 空の軸はパラメータ自体を消し、URL をきれいに保つ。
 */
export function criteriaToParams(
  criteria: ShopFilterCriteria,
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
