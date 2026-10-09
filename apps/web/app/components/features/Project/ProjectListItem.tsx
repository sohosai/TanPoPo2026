import { IconCalendarEvent, IconClock, IconMapPin } from '@tabler/icons-react';
import type { Project } from 'api';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';
import FavoriteButton from './FavoriteButton';
import {
  badgeClass,
  CATEGORY_COLOR_CLASS,
  formatPerformances,
  formatSchedule,
} from './labels';
import ProjectIcon from './ProjectIcon';

type ProjectListItemProps = {
  project: Project;
  /** 場所の表示ラベル（建物名＋部屋番号、例 "5C305"）。places から整形して渡す */
  locationLabel?: string;
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  /** 入場演出などを外から足すため */
  className?: string;
  style?: CSSProperties;
};

const metaClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  minWidth: 0,
});

/** 企画一覧の1行の中身（アイコン・名前・団体・分類・場所・日程）。ステージの出演枠があれば日程の代わりに時間を出す。行の外枠と右端の操作は使う側で付ける。 */
export function ProjectRowContent({
  project,
  locationLabel,
}: {
  project: Project;
  locationLabel?: string;
}) {
  const {
    name,
    organization,
    category,
    schedule,
    performances,
    cancelled = false,
  } = project;

  return (
    <>
      <ProjectIcon project={project} size={64} />

      <div
        className={css({
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        })}
      >
        {/* 一覧の行の高さを揃えるため、各行は1行に収めて溢れた分は省略する */}
        <h3
          className={css({
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: 1.4,
            color: 'fg.strong',
            truncate: true,
          })}
        >
          {name}
        </h3>

        <p
          className={css({
            fontSize: '12px',
            color: 'fg.subtle',
            truncate: true,
          })}
        >
          {organization}
        </p>

        <div
          className={css({
            mt: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: 'fg.muted',
            whiteSpace: 'nowrap',
            '& > *': { flexShrink: 0 },
          })}
        >
          {cancelled ? (
            <span
              className={cx(
                badgeClass,
                css({ bg: 'fg.strong', color: 'surface' }),
              )}
            >
              中止
            </span>
          ) : (
            <span className={cx(badgeClass, CATEGORY_COLOR_CLASS[category])}>
              {category}
            </span>
          )}
          {/* 場所は長さのばらつきが大きいため、ここだけ縮めて残り幅で省略する */}
          {locationLabel && (
            <span
              className={cx(metaClass, css({ flexShrink: '1!' }))}
              title={locationLabel}
            >
              <IconMapPin size={13} className={css({ flexShrink: 0 })} />
              <span
                className={css({
                  truncate: true,
                  textBox: 'trim-both cap alphabetic',
                  py: '0.2em',
                })}
              >
                {locationLabel}
              </span>
            </span>
          )}
          {performances.length > 0 ? (
            <span className={metaClass}>
              <IconClock size={13} />
              <span className={css({ textBox: 'trim-both cap alphabetic' })}>
                {formatPerformances(performances)}
              </span>
            </span>
          ) : (
            schedule.length > 0 && (
              <span className={metaClass}>
                <IconCalendarEvent size={13} />
                <span className={css({ textBox: 'trim-both cap alphabetic' })}>
                  {formatSchedule(schedule)}
                </span>
              </span>
            )
          )}
        </div>
      </div>
    </>
  );
}

/** 一覧の行の外枠。ProjectListItem と投票の行で見た目を揃える。 */
export const projectRowClass = css({
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  px: '16px',
  py: '12px',
  color: 'inherit',
  textDecoration: 'none',
  textAlign: 'left',
  borderBottom: '1px solid token(colors.border.subtle)',
  transition: 'background 0.15s',
  _active: { bg: 'border.subtle' },
});

export default function ProjectListItem({
  project,
  locationLabel,
  favorite = false,
  onToggleFavorite,
  className,
  style,
}: ProjectListItemProps) {
  const { id, number, cancelled = false } = project;

  return (
    <Link
      to={`/project/${number}`}
      className={cx(projectRowClass, className)}
      style={{ ...style, opacity: cancelled ? 0.55 : undefined }}
    >
      <ProjectRowContent project={project} locationLabel={locationLabel} />

      <FavoriteButton
        active={favorite}
        onToggle={() => onToggleFavorite?.(id)}
        size={22}
        className={css({
          flexShrink: 0,
          alignSelf: 'flex-end',
          mb: '-2px',
          mr: '-4px',
        })}
      />
    </Link>
  );
}
