import {
  IconBuilding,
  IconMicrophone,
  IconTent,
  type TablerIcon,
} from '@tabler/icons-react';
import type { Place, PlaceKind, Project } from 'api';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import DetailCloseButton from '~/components/features/Detail/DetailCloseButton';
import {
  detailEnterStyles,
  detailExitStyles,
  useDetailClose,
} from '~/components/features/Detail/useDetailClose';
import {
  BOOTH_FOCUS_ZOOM,
  useMap,
} from '~/components/features/Map/MapController';
import ProjectListItem from '~/components/features/Project/ProjectListItem';
import StageTimetable, {
  sectionTitleClass,
} from '~/components/features/Stage/StageTimetable';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import { useFavorites } from '~/lib/favorites';
import {
  compareRoom,
  countProjects,
  formatLocation,
  groupProjectsByPlace,
  type PlaceEntry,
  usePlaces,
} from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { isDesktopViewport } from '~/lib/viewport';
import { css, cx } from '../../../styled-system/css';

const KIND_INFO: Partial<
  Record<PlaceKind, { icon: TablerIcon; label: string }>
> = {
  building: { icon: IconBuilding, label: '屋内' },
  outdoor: { icon: IconTent, label: '屋外' },
  stage: { icon: IconMicrophone, label: 'ステージ' },
};

type Row = { project: Project; rooms: string[] };
type Section = { title?: string; rows: Row[] };

/** 同じ企画が複数の部屋にまたがっていても1行にまとめる。 */
function toRows(entries: PlaceEntry[]): Row[] {
  const rows = new Map<string, Row>();
  for (const { project, location } of entries) {
    const row = rows.get(project.id) ?? { project, rooms: [] };
    if (location.room) row.rooms.push(location.room);
    rows.set(project.id, row);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, rooms: row.rooms.sort(compareRoom) }))
    .sort(
      (a, b) =>
        compareRoom(a.rooms[0], b.rooms[0]) ||
        a.project.number.localeCompare(b.project.number),
    );
}

/** 建物は階ごと（部屋番号の先頭の数字）、それ以外は1つの一覧にする。 */
function toSections(place: Place, entries: PlaceEntry[]): Section[] {
  if (place.kind !== 'building') return [{ rows: toRows(entries) }];
  const floors = new Map<string, PlaceEntry[]>();
  for (const entry of entries) {
    const floor = entry.location.room?.match(/^(\d)/)?.[1];
    const title = floor ? `${floor}階` : 'その他';
    floors.set(title, [...(floors.get(title) ?? []), entry]);
  }
  return [...floors]
    .sort(([a], [b]) =>
      a === 'その他' ? 1 : b === 'その他' ? -1 : compareRoom(a, b),
    )
    .map(([title, floorEntries]) => ({ title, rows: toRows(floorEntries) }));
}

export default function PlaceDetail() {
  const { placeId } = useParams();
  const { byId } = usePlaces();
  const place = placeId ? byId.get(placeId) : undefined;
  const { data: projects, status } = trpc.project.list.useQuery();
  const { isFavorite, toggle } = useFavorites();
  const { flyTo } = useMap();
  const panel = useMapPanel();
  const { closing, close } = useDetailClose();

  // 地図から開いたときに、場所と一覧の両方が見えるようにする。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 場所が変わったときだけ開く
  useEffect(() => {
    panel.raise();
  }, [placeId]);

  useEffect(() => {
    if (!place) return;
    flyTo(place.point, {
      // 屋外はテントの形が見えるところまで寄る。
      zoom: place.kind === 'outdoor' ? BOOTH_FOCUS_ZOOM : 17.6,
      // スマホではシートを半分開いているので、残りの地図の中央に来るよう上へずらす。
      offset: isDesktopViewport()
        ? undefined
        : [0, -Math.round(window.innerHeight * 0.25)],
    });
  }, [place, flyTo]);

  const entries = useMemo(
    () =>
      projects && placeId
        ? (groupProjectsByPlace(projects).get(placeId) ?? [])
        : [],
    [projects, placeId],
  );
  const sections = useMemo(
    () => (place ? toSections(place, entries) : []),
    [place, entries],
  );
  const count = countProjects(entries);

  if (!place) {
    return (
      <p className={css({ p: '16px', color: 'fg.subtle' })}>
        {byId.size === 0 ? '読み込み中...' : '場所が見つかりませんでした。'}
      </p>
    );
  }

  const info = KIND_INFO[place.kind];
  const Icon = info?.icon ?? IconBuilding;

  return (
    // 建物のヘッダーは固定し、その下のフロアごとの一覧だけをスクロールさせる。
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
          borderBottom: '1px solid token(colors.border.subtle)',
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
            borderRadius: '14px',
            bg: 'accent.subtle',
            color: 'accent.text',
          })}
        >
          <Icon size={26} stroke={1.8} />
        </span>
        <div className={css({ flex: 1, minWidth: 0 })}>
          <h1
            className={css({
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.35,
              color: 'fg.strong',
            })}
          >
            {place.name}
          </h1>
          <p className={css({ fontSize: '13px', color: 'fg.subtle' })}>
            {info?.label}
            {status === 'success' && ` · ${count}企画`}
          </p>
        </div>
        <DetailCloseButton closing={closing} onClick={close} />
      </header>

      <div
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
        {status === 'success' && count === 0 && (
          <p className={css({ p: '16px', color: 'fg.subtle' })}>
            この場所の企画はありません。
          </p>
        )}

        {place.kind === 'stage' ? (
          <StageTimetable
            placeId={place.id}
            projects={sections.flatMap(({ rows }) =>
              rows.map(({ project }) => project),
            )}
            isFavorite={isFavorite}
            onToggleFavorite={toggle}
          />
        ) : (
          sections.map((section) => (
            <section key={section.title ?? 'all'}>
              {section.title && (
                <h2 className={sectionTitleClass}>{section.title}</h2>
              )}
              {section.rows.map(({ project, rooms }) => {
                const [first, ...rest] = rooms;
                const label = formatLocation(place, first);
                return (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    locationLabel={
                      rest.length > 0 ? `${label} ほか${rest.length}室` : label
                    }
                    favorite={isFavorite(project.id)}
                    onToggleFavorite={toggle}
                  />
                );
              })}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
