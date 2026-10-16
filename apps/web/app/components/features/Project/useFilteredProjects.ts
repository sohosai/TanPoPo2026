import { useMemo } from 'react';
import { useFavorites } from '~/lib/favorites';
import { usePlaces } from '~/lib/places';
import type { ProjectFilterCriteria } from './criteria';
import {
  buildSearchIndex,
  filterProjects,
  type SearchableProject,
} from './filter';

/**
 * ある範囲（全件・グランプリの一般部門など）の企画に条件を適用する。
 * お気に入りと場所はここで取得するため、どの画面でも範囲と条件を渡すだけで同じ結果になる。
 * 結果は、企画名・団体名・場所に一致した企画、説明文だけに一致した企画の順で、それぞれ企画番号順。
 */
export function useFilteredProjects<P extends SearchableProject>(
  scoped: readonly P[] | undefined,
  criteria: ProjectFilterCriteria,
): P[] {
  const { favorites } = useFavorites();
  const { byId: places } = usePlaces();
  // 文字を打つたびに全件を正規化し直さないよう、検索用の文字列は企画と場所が変わったときだけ作る。
  const searchIndex = useMemo(
    () => buildSearchIndex(scoped ?? [], places),
    [scoped, places],
  );

  return useMemo(
    () =>
      scoped
        ? filterProjects(scoped, criteria, { favorites, searchIndex })
        : [],
    [scoped, criteria, favorites, searchIndex],
  );
}
