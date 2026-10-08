import type { Place, ScheduleDay, Project, ProjectCategory } from 'api';
import { formatLocation } from '~/lib/places';

/**
 * 店舗一覧の検索・絞り込み条件。
 * 全件取得済みの Project[] に対してクライアント側で適用する（オフライン対応のため）。
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

// UI の選択肢。TODO: 正式な分類が決まったら API の型に合わせて見直す。
export const CATEGORY_OPTIONS: ProjectCategory[] = [
  '食品',
  '物販',
  '展示',
  '学術',
  'ステージ',
  'その他',
];

export const SCHEDULE_OPTIONS: ScheduleDay[] = ['前夜祭', 'Day1', 'Day2'];

/** 配列に値が無ければ足し、あれば除いた新しい配列を返す（複数選択のオン/オフ）。 */
export function toggleItem<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** タグは自由文字列で固定の選択肢を持たないため、企画が持つタグから選択肢を作る。 */
export function tagOptionsOf(projects: Project[]): string[] {
  return [...new Set(projects.flatMap((project) => project.tags))].sort();
}

/** 全角/半角・大文字小文字を吸収して比較しやすい形に正規化する */
function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().trim();
}

/**
 * あいまい検索の対象文字列（名称・団体・場所・タグ）に一致するか。
 * 場所は場所名・よみがなに加え、"1B208" のような表示ラベルでも引ける。
 */
function matchesQuery(
  project: Project,
  normalizedQuery: string,
  places: ReadonlyMap<string, Place>,
): boolean {
  if (normalizedQuery === '') return true;
  const placeTerms = project.locations.flatMap((loc) => {
    const place = places.get(loc.placeId);
    return place
      ? [place.name, place.reading ?? '', formatLocation(place, loc.room)]
      : [];
  });
  const haystack = normalize(
    [project.name, project.organization, ...placeTerms, ...project.tags].join(
      ' ',
    ),
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
export function filterProjects(
  projects: Project[],
  criteria: ProjectFilterCriteria,
  favorites: ReadonlySet<string> = new Set(),
  places: ReadonlyMap<string, Place> = new Map(),
): Project[] {
  const q = normalize(criteria.q);
  return projects.filter(
    (project) =>
      matchesQuery(project, q, places) &&
      (criteria.categories.length === 0 ||
        criteria.categories.includes(project.category)) &&
      (criteria.days.length === 0 ||
        criteria.days.some((day) => project.schedule.includes(day))) &&
      (criteria.tags.length === 0 ||
        criteria.tags.every((tag) => project.tags.includes(tag))) &&
      (!criteria.favorite || favorites.has(project.id)),
  );
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

/** URLSearchParams から条件を復元する */
export function criteriaFromParams(
  params: URLSearchParams,
): ProjectFilterCriteria {
  const readList = (key: string): string[] => {
    const raw = params.get(key);
    return raw ? raw.split(SEP).filter(Boolean) : [];
  };
  return {
    q: params.get('q') ?? '',
    categories: readList('category') as ProjectCategory[],
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
