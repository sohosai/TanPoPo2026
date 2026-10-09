import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import {
  type FromDetailState,
  itemEnterStyle,
  itemEnterStyles,
  listEnterStyles,
} from '~/components/features/Detail/useDetailClose';
import EventBanner from '~/components/features/EventLinks/EventBanner';
import {
  criteriaFromParams,
  criteriaToParams,
  hasActiveFilter,
  type ProjectFilterCriteria,
} from '~/components/features/Project/criteria';
import ProjectList from '~/components/features/Project/ProjectList';
import ProjectSearchBar from '~/components/features/Project/ProjectSearchBar';
import {
  NoProjectsMessage,
  StateMessage,
} from '~/components/features/Project/StateMessage';
import { useFilteredProjects } from '~/components/features/Project/useFilteredProjects';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../styled-system/css';

export default function List() {
  const { data: projects, status, isError } = trpc.project.list.useQuery();

  // 検索・絞り込み条件は URL クエリを唯一の状態源とする（共有/戻る操作に対応）。
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = useMemo(
    () => criteriaFromParams(searchParams),
    [searchParams],
  );

  const updateCriteria = (next: ProjectFilterCriteria) => {
    // replace: true で履歴を汚さずにフィルタ操作を反映する。
    setSearchParams(criteriaToParams(next), { replace: true });
  };

  const { projects: visibleProjects, tagOptions } = useFilteredProjects(
    projects,
    criteria,
  );

  // 詳細を × で閉じて戻ってきたときだけ、企画を上から順にふわっと出す。
  // 戻った直後だけに限定し、その後の絞り込みで現れた行には演出をかけない。
  const fromDetail = !!(useLocation().state as FromDetailState | null)
    ?.fromDetail;
  const [entering, setEntering] = useState(fromDetail);
  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(() => setEntering(false), 1000);
    return () => window.clearTimeout(timer);
  }, [entering]);

  const showBanner = !hasActiveFilter(criteria) && criteria.q === '';
  const enterProps = (index: number) =>
    entering
      ? { className: itemEnterStyles, style: itemEnterStyle(index) }
      : {};

  return (
    // 検索バーは固定し、その下の一覧だけをスクロールさせる。
    <div
      className={cx(
        css({ display: 'flex', flexDirection: 'column', h: '100%' }),
        entering && listEnterStyles,
      )}
    >
      <ProjectSearchBar
        criteria={criteria}
        onChange={updateCriteria}
        tagOptions={tagOptions}
      />

      <div
        className={css({
          flex: 1,
          minHeight: 0,
          pt: '4px',
          pb: '24px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        })}
      >
        {showBanner && (
          <div {...enterProps(0)}>
            <EventBanner />
          </div>
        )}

        {status === 'pending' && (
          <StateMessage icon={IconLoader2} title="読み込み中..." spinning />
        )}
        {isError && !projects && (
          <StateMessage
            icon={IconAlertTriangle}
            title="店舗一覧を取得できませんでした"
            description={'通信環境を確認して\nもう一度お試しください。'}
          />
        )}
        {projects && visibleProjects.length === 0 && (
          <NoProjectsMessage favoriteOnly={criteria.favorite} />
        )}

        <ProjectList
          projects={visibleProjects}
          rowProps={(i) => enterProps(i + (showBanner ? 1 : 0))}
        />
      </div>
    </div>
  );
}
