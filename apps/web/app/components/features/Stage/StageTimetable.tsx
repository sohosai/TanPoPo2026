import type { Performance, Project, ScheduleDay } from 'api';
import { Fragment } from 'react';
import { Link } from 'react-router';
import FavoriteButton from '~/components/features/Project/FavoriteButton';
import {
  badgeClass,
  DAY_LABELS,
  formatPerformance,
} from '~/components/features/Project/labels';
import ProjectIcon from '~/components/features/Project/ProjectIcon';
import ProjectListItem, {
  projectRowClass,
} from '~/components/features/Project/ProjectListItem';
import { css, cx } from '../../../../styled-system/css';

const DAY_ORDER = Object.keys(DAY_LABELS) as ScheduleDay[];

type Slot = { project: Project; performance: Performance };

/** フロアの見出しと同じく、スクロールしても今どの時間帯を見ているか分かるよう上に貼り付ける。 */
export const sectionTitleClass = css({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  // 高さを行の中身（和文・欧文フォントの混在）に任せると小数pxになり、貼り付いた見出しが
  // スクロールのたびに1px前後ずれて見える。整数の高さに固定し、独立したレイヤーで描かせる。
  h: '28px',
  lineHeight: '28px',
  px: '16px',
  transform: 'translateZ(0)',
  bg: 'border.subtle',
  fontSize: 'xs',
  fontWeight: 700,
  color: 'fg.muted',
});

function TimetableRow({
  slot: { project, performance },
  favorite,
  onToggleFavorite,
}: {
  slot: Slot;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const { cancelled = false } = project;
  // 演目名が企画名と違うときは、どの企画の出演か分かるよう企画名を添える。
  const subtitle =
    performance.title === project.name ? project.organization : project.name;

  return (
    <Link
      to={`/project/${project.number}`}
      className={cx(projectRowClass, css({ alignItems: 'center' }))}
      style={{ opacity: cancelled ? 0.55 : undefined }}
    >
      <ProjectIcon project={project} size={48} />

      <div className={css({ flex: 1, minWidth: 0 })}>
        <h3
          className={css({
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: 1.4,
            color: 'fg.strong',
            lineClamp: 2,
          })}
        >
          {performance.title}
        </h3>
        <p
          className={css({
            mt: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'fg.subtle',
          })}
        >
          {cancelled && (
            <span
              className={cx(
                badgeClass,
                css({ flexShrink: 0, bg: 'fg.strong', color: 'surface' }),
              )}
            >
              中止
            </span>
          )}
          <span className={css({ truncate: true })}>{subtitle}</span>
        </p>
      </div>

      <FavoriteButton
        active={favorite}
        onToggle={() => onToggleFavorite(project.id)}
        size={22}
        className={css({ flexShrink: 0, mr: '-4px' })}
      />
    </Link>
  );
}

/**
 * ステージのタイムテーブル。出演枠を日・開始時刻順に並べ、時間ごとの見出しの下に企画を置く。
 * ステージに紐づくのにタイムテーブルに載っていない企画は、最後に「時間未定」としてまとめる。
 */
export default function StageTimetable({
  placeId,
  projects,
  isFavorite,
  onToggleFavorite,
}: {
  placeId: string;
  /** このステージで実施する企画（重複なし） */
  projects: Project[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const slots = projects
    .flatMap((project) =>
      project.performances
        .filter((performance) => performance.placeId === placeId)
        .map((performance) => ({ project, performance })),
    )
    .sort(
      (a, b) =>
        DAY_ORDER.indexOf(a.performance.day) -
          DAY_ORDER.indexOf(b.performance.day) ||
        a.performance.start.localeCompare(b.performance.start) ||
        a.project.number.localeCompare(b.project.number),
    );
  // 同じ時間帯に複数の企画が出るときは1つの見出しにまとめる。
  const sections = new Map<string, Slot[]>();
  for (const slot of slots) {
    const title = formatPerformance(slot.performance);
    sections.set(title, [...(sections.get(title) ?? []), slot]);
  }
  const scheduled = new Set(slots.map(({ project }) => project.id));
  const unscheduled = projects.filter(({ id }) => !scheduled.has(id));

  // 見出しを <section> で包むと sticky が各セクション内に閉じ込められ、1〜2行しかない
  // セクションでは次の見出しが前の見出しを絶えず押し出して揺れて見える。見出しと行を
  // 同じ階層に並べ、後の見出しが前の見出しの上に重なって入れ替わるようにする。
  return (
    <div>
      {[...sections].map(([title, slots]) => (
        <Fragment key={title}>
          <h2 className={sectionTitleClass}>{title}</h2>
          {slots.map((slot) => (
            <TimetableRow
              key={slot.project.id}
              slot={slot}
              favorite={isFavorite(slot.project.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </Fragment>
      ))}
      {unscheduled.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>時間未定</h2>
          {unscheduled.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              favorite={isFavorite(project.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </>
      )}
    </div>
  );
}
