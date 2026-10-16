import type { Place, Project } from 'api';
import { formatLocation } from '~/lib/places';
import type { ProjectFilterCriteria } from './criteria';

/** 説明文があれば説明文も検索する。一覧の API は説明文付きの企画を返す。 */
export type SearchableProject = Project & { description?: string };

/** 検索語との比較用に正規化した、企画ごとの文字列。 */
type SearchText = {
  /** 企画名・団体名（それぞれのよみがなを含む）・場所 */
  primary: string;
  description: string;
};

/** 企画 → 検索用の文字列。企画や場所が変わったときだけ作り直す。 */
export type SearchIndex = ReadonlyMap<SearchableProject, SearchText>;

/**
 * 絞り込みに必要な、アプリ横断の参照データ。
 * お気に入りはアプリ横断のストア、検索用の文字列は企画と場所から作るため、
 * criteria ではなくその時点の値を渡して filterProjects を純粋関数に保つ。
 */
export type FilterContext = {
  /** お気に入りの企画 ID */
  favorites?: ReadonlySet<string>;
  /** buildSearchIndex で作った検索用の文字列 */
  searchIndex?: SearchIndex;
};

const NO_FAVORITES: ReadonlySet<string> = new Set();
const NO_INDEX: SearchIndex = new Map();

/** 企画番号順（番号は桁をそろえてあるので文字列比較で番号順になる）。 */
export const compareProjects = (a: Project, b: Project) =>
  a.number.localeCompare(b.number);

/** 全角/半角・大文字小文字・カタカナ/ひらがなを吸収して比較しやすい形に正規化する */
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// SOS のよみがなは語の間に空白が入る（「こぴかつ そうほうさいの…」）。続けて打っても引けるよう、
// 空白を除いたものも並べる。
const readingTerms = (reading: string) => [
  reading,
  reading.replace(/\s+/g, ''),
];

/**
 * 企画ごとの検索用の文字列を作る。
 * 場所は場所名・よみがなに加え、"1B208" のような表示ラベルでも引ける。
 */
export function buildSearchIndex(
  projects: readonly SearchableProject[],
  places: ReadonlyMap<string, Place>,
): SearchIndex {
  return new Map(
    projects.map((project) => {
      const placeTerms = project.locations.flatMap((loc) => {
        const place = places.get(loc.placeId);
        return place
          ? [place.name, place.reading ?? '', formatLocation(place, loc.room)]
          : [];
      });
      return [
        project,
        {
          primary: normalize(
            [
              project.name,
              project.organization,
              ...readingTerms(project.nameReading),
              ...readingTerms(project.organizationReading),
              ...placeTerms,
            ].join(' '),
          ),
          description: normalize(project.description ?? ''),
        },
      ];
    }),
  );
}

/** 検索語への一致の強さ。企画名・団体名・場所に一致すれば 0、説明文だけなら 1、一致しなければ null。 */
function matchRank(text: SearchText | undefined, query: string): number | null {
  if (query === '') return 0;
  if (!text) return null;
  if (text.primary.includes(query)) return 0;
  return text.description.includes(query) ? 1 : null;
}

/**
 * 条件に合致する企画を返す純粋関数。各軸は独立した述語として AND 結合。フィルタ軸を増やすときはここに条件を足す。
 * 並びは、企画名・団体名・場所に一致した企画、説明文だけに一致した企画の順で、それぞれ企画番号順。
 */
export function filterProjects<P extends SearchableProject>(
  projects: readonly P[],
  criteria: ProjectFilterCriteria,
  { favorites = NO_FAVORITES, searchIndex = NO_INDEX }: FilterContext = {},
): P[] {
  const q = normalize(criteria.q);
  return projects
    .flatMap((project) => {
      const rank = matchRank(searchIndex.get(project), q);
      const matches =
        rank !== null &&
        (criteria.categories.length === 0 ||
          criteria.categories.includes(project.category)) &&
        (criteria.days.length === 0 ||
          criteria.days.some((day) => project.schedule.includes(day))) &&
        (!criteria.favorite || favorites.has(project.id));
      return matches ? [{ project, rank }] : [];
    })
    .sort((a, b) => a.rank - b.rank || compareProjects(a.project, b.project))
    .map(({ project }) => project);
}
