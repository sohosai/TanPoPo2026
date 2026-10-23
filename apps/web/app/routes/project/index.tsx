import { IconAlertTriangle } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import {
  type FromDetailState,
  itemEnterStyle,
  itemEnterStyles,
  listEnterStyles,
  rememberListSearch,
} from '~/components/features/Detail/useDetailClose';
import { useListScroll } from '~/components/features/Detail/useListScroll';
import EventBanner from '~/components/features/EventLinks/EventBanner';
import { FluffLoader } from '~/components/features/Fluff/Fluff';
import {
  criteriaFromParams,
  criteriaToParams,
  hasActiveFilter,
  type ProjectFilterCriteria,
} from '~/components/features/Project/criteria';
import { compareProjects } from '~/components/features/Project/filter';
import ProjectList from '~/components/features/Project/ProjectList';
import ProjectSearchBar from '~/components/features/Project/ProjectSearchBar';
import {
  NoProjectsMessage,
  StateMessage,
} from '~/components/features/Project/StateMessage';
import { useFilteredProjects } from '~/components/features/Project/useFilteredProjects';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import { useLineLoginEnabled } from '~/lib/auth';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../styled-system/css';

export default function List() {
  const { data: projects, status, isError } = trpc.project.list.useQuery();
  const lineLoginEnabled = useLineLoginEnabled();

  // 検索・絞り込み条件は URL クエリを唯一の状態源とする（共有/戻る操作に対応）。
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = useMemo(
    () => criteriaFromParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    rememberListSearch(searchParams.toString());
  }, [searchParams]);

  // 詳細から（× でも戻る操作でも）戻ってきたときは、直前の段にかかわらず中段で見せる。
  const panel = useMapPanel();
  // biome-ignore lint/correctness/useExhaustiveDependencies: 一覧を開いたときだけ
  useEffect(() => {
    panel.raise();
  }, []);

  const updateCriteria = (next: ProjectFilterCriteria) => {
    // replace: true で履歴を汚さずにフィルタ操作を反映する。
    setSearchParams(criteriaToParams(next), { replace: true });
  };

  const visibleProjects = useFilteredProjects(projects, criteria);
  // 一覧は全件の行を出したまま、条件に合わない行を隠す。絞り込みやクリアのたびに数百行を作り直すと、
  // その間チップの切り替えや件数の反映まで止まるため。
  const allProjects = useMemo(
    () => (projects ? [...projects].sort(compareProjects) : []),
    [projects],
  );
  const visibleIds = useMemo(
    () => new Set(visibleProjects.map((project) => project.id)),
    [visibleProjects],
  );
  // 検索に一致した順に並べ、隠す行はその後ろに置く。行は key で使い回されるため、並べ替えても作り直されない。
  const orderedProjects = useMemo(
    () => [
      ...visibleProjects,
      ...allProjects.filter((project) => !visibleIds.has(project.id)),
    ],
    [visibleProjects, allProjects, visibleIds],
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

  const scroll = useListScroll(projects !== undefined);

  const unfiltered = !hasActiveFilter(criteria) && criteria.q === '';
  // グランプリ投票・来場者アンケートの導線。どちらも LINE ログインを使う。
  const showBanner = lineLoginEnabled && unfiltered;
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
        count={visibleProjects.length}
        showSummary={!unfiltered && projects !== undefined}
      />

      <div
        {...scroll}
        data-sheet-scroll
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
          <StateMessage
            icon={<FluffLoader size={44} />}
            title="読み込み中..."
          />
        )}
        {isError && !projects && (
          <StateMessage
            icon={<IconAlertTriangle size={30} />}
            title="企画一覧を取得できませんでした"
            description={'通信環境を確認して\nもう一度お試しください。'}
          />
        )}
        {projects && visibleProjects.length === 0 && (
          <NoProjectsMessage favoriteOnly={criteria.favorite} />
        )}

        <ProjectList
          projects={orderedProjects}
          visibleIds={visibleIds}
          rowProps={(i) => enterProps(i + (showBanner ? 1 : 0))}
        />
      </div>
    </div>
  );
}
