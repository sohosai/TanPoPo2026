import type { Place, Project } from 'api';
import { formatLocation } from '~/lib/places';
import type { ProjectFilterCriteria } from './criteria';

/**
 * 絞り込みに必要な、アプリ横断の参照データ。
 * お気に入りはアプリ横断のストア、場所は place.list で管理されるため、
 * criteria ではなくその時点の値を渡して filterProjects を純粋関数に保つ。
 */
export type FilterContext = {
  /** お気に入りの企画 ID */
  favorites?: ReadonlySet<string>;
  /** 場所名での検索に使う、id 引きの場所 */
  places?: ReadonlyMap<string, Place>;
};

const NO_FAVORITES: ReadonlySet<string> = new Set();
const NO_PLACES: ReadonlyMap<string, Place> = new Map();

/** 企画番号順（番号は桁をそろえてあるので文字列比較で番号順になる）。 */
export const compareProjects = (a: Project, b: Project) =>
  a.number.localeCompare(b.number);

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
 * 条件に合致する企画だけを、元の順序のまま返す純粋関数。
 * 各軸は独立した述語として AND 結合。フィルタ軸を増やすときはここに条件を足す。
 */
export function filterProjects(
  projects: Project[],
  criteria: ProjectFilterCriteria,
  { favorites = NO_FAVORITES, places = NO_PLACES }: FilterContext = {},
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
