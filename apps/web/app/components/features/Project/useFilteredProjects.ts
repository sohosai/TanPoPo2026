import type { Project } from 'api';
import { useMemo, useState } from 'react';
import { useFavorites } from '~/lib/favorites';
import { usePlaces } from '~/lib/places';
import { emptyCriteria, type ProjectFilterCriteria } from './criteria';
import { compareProjects, filterProjects, tagOptionsOf } from './filter';

/**
 * ある範囲（全件・エリア内・グランプリの一般部門など）の企画に条件を適用する。
 * お気に入りと場所はここで取得するため、どの画面でも範囲と条件を渡すだけで同じ結果になる。
 * 結果は企画番号順。タグの選択肢は条件を適用する前の範囲から作る。
 */
export function useFilteredProjects(
  scoped: Project[] | undefined,
  criteria: ProjectFilterCriteria,
) {
  const { favorites } = useFavorites();
  const { byId: places } = usePlaces();

  const projects = useMemo(
    () =>
      scoped
        ? filterProjects(scoped, criteria, { favorites, places }).sort(
            compareProjects,
          )
        : [],
    [scoped, criteria, favorites, places],
  );
  const tagOptions = useMemo(() => tagOptionsOf(scoped ?? []), [scoped]);

  return { projects, tagOptions };
}

/**
 * 範囲（エリア・場所）ごとの絞り込み条件。範囲が変わると空の条件に戻る。
 * 同じルートのまま別の範囲へ移るとコンポーネントが使い回されるため、
 * 戻さないと前の範囲にしか無いタグがチップに出ないまま効き続ける。
 */
export function useScopedCriteria(scope: string | undefined) {
  const [state, setState] = useState({ scope, criteria: emptyCriteria });
  const criteria = state.scope === scope ? state.criteria : emptyCriteria;
  const setCriteria = (next: ProjectFilterCriteria) =>
    setState({ scope, criteria: next });
  return [criteria, setCriteria] as const;
}
