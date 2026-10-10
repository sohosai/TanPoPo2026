import { IconMap2 } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router';
import DetailCloseButton from '~/components/features/Detail/DetailCloseButton';
import {
  detailEnterStyles,
  detailExitStyles,
  listPath,
  rememberListPath,
  useDetailClose,
} from '~/components/features/Detail/useDetailClose';
import { useListScroll } from '~/components/features/Detail/useListScroll';
import {
  areasOfProject,
  findCampusArea,
} from '~/components/features/Map/campusData';
import { AREA_MAX_ZOOM } from '~/components/features/Map/campusStyle';
import { useMap } from '~/components/features/Map/MapController';
import { compareProjects } from '~/components/features/Project/filter';
import ProjectList from '~/components/features/Project/ProjectList';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import { usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../styled-system/css';

export default function AreaDetail() {
  const { areaId } = useParams();
  const area = findCampusArea(areaId);
  const { byId, status: placesStatus } = usePlaces();
  const { data: projects, status: projectsStatus } =
    trpc.project.list.useQuery();
  // エリア内かは場所の座標で決まるため、企画と場所の両方がそろうまで判定しない。
  const status =
    projectsStatus === 'error' || placesStatus === 'error'
      ? 'error'
      : projectsStatus === 'success' && placesStatus === 'success'
        ? 'success'
        : 'pending';
  const { fitBounds } = useMap();
  const panel = useMapPanel();
  const { to, closing, close } = useDetailClose(listPath());
  const { pathname } = useLocation();

  useEffect(() => {
    rememberListPath(pathname);
  }, [pathname]);

  // 地図から開いたときに、エリアと一覧の両方が見えるようにする。
  // biome-ignore lint/correctness/useExhaustiveDependencies: エリアが変わったときだけ開く
  useEffect(() => {
    panel.raise();
  }, [areaId]);

  useEffect(() => {
    // エリア名が消えて建物のピンに切り替わるところまで寄る。
    if (area) fitBounds(area.bounds, AREA_MAX_ZOOM + 0.1);
  }, [area, fitBounds]);

  const areaProjects = useMemo(
    () =>
      status === 'success'
        ? projects
            ?.filter((project) =>
              areasOfProject(project, byId).some(({ id }) => id === areaId),
            )
            .sort(compareProjects)
        : undefined,
    [status, projects, byId, areaId],
  );
  const scroll = useListScroll(areaProjects !== undefined);

  if (!area) {
    return (
      <p className={css({ p: '16px', color: 'fg.subtle' })}>
        エリアが見つかりませんでした。
      </p>
    );
  }

  return (
    <div
      className={cx(
        css({ display: 'flex', flexDirection: 'column', h: '100%' }),
        closing ? detailExitStyles : detailEnterStyles,
      )}
    >
      <header
        className={css({
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          px: '16px',
          pt: '2px',
          pb: '12px',
          borderBottom:
            'token(borderWidths.divider) solid token(colors.border.subtle)',
        })}
      >
        <span
          className={css({
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            w: '48px',
            h: '48px',
            borderRadius: 'xl',
            bg: 'accent.subtle',
            color: 'accent.text',
            // 最小段では名前だけを見せる。
            '[data-peek] &': { display: 'none' },
          })}
        >
          <IconMap2 size={26} />
        </span>
        <div className={css({ flex: 1, minWidth: 0 })}>
          <h1
            className={css({
              fontSize: '2xl',
              fontWeight: 700,
              lineHeight: 1.35,
              color: 'fg.strong',
              '[data-peek] &': { truncate: true },
            })}
          >
            {area.name}
          </h1>
          <p
            className={css({
              fontSize: 'sm',
              color: 'fg.subtle',
              '[data-peek] &': { display: 'none' },
            })}
          >
            会場エリア
            {areaProjects && ` · ${areaProjects.length}企画`}
          </p>
        </div>
        <DetailCloseButton to={to} closing={closing} onClick={close} />
      </header>

      <div
        {...scroll}
        className={css({
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        })}
      >
        {status === 'pending' && (
          <p className={css({ p: '16px', color: 'fg.subtle' })}>
            読み込み中...
          </p>
        )}
        {status === 'error' && (
          <p className={css({ p: '16px', color: 'fg.subtle' })}>
            企画を読み込めませんでした。
          </p>
        )}
        {areaProjects?.length === 0 && (
          <p className={css({ p: '16px', color: 'fg.subtle' })}>
            このエリアの企画はありません。
          </p>
        )}
        {areaProjects && <ProjectList projects={areaProjects} />}
      </div>
    </div>
  );
}
