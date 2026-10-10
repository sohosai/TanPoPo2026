import { IconCalendarEvent, IconClock, IconMapPin } from '@tabler/icons-react';
import type { Project } from 'api';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';
import CategoryLabel from './CategoryLabel';
import FavoriteButton from './FavoriteButton';
import { badgeClass, formatPerformances, formatSchedule } from './labels';
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
  gap: '3px',
  minWidth: 0,
  '& > svg': { flexShrink: 0, color: 'accent' },
});

/** 企画一覧の1行の中身（アイコン・名前・分類と団体・場所と日程）。ステージの出演枠があれば日程の代わりに時間を出す。行の外枠と右端の操作は使う側で付ける。 */
export function ProjectRowContent({
  project,
  locationLabel,
  action,
}: {
  project: Project;
  locationLabel?: string;
  action?: React.ReactNode;
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
            fontSize: 'xl',
            fontWeight: 700,
            lineHeight: 1.4,
            color: 'fg.strong',
            truncate: true,
          })}
        >
          {name}
        </h3>

        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 'xs',
          })}
        >
          {cancelled ? (
            <span
              className={cx(
                badgeClass,
                css({ flexShrink: 0, bg: 'fg.strong', color: 'surface' }),
              )}
            >
              中止
            </span>
          ) : (
            <CategoryLabel category={category} />
          )}
          <span className={css({ color: 'fg.subtle', truncate: true })}>
            {organization}
          </span>
        </div>

        <div
          className={css({
            mt: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: 'xs',
            color: 'fg.muted',
            whiteSpace: 'nowrap',
            '& > *': { flexShrink: 0 },
          })}
        >
          {/* 場所は長さのばらつきが大きいため、ここだけ縮めて残り幅で省略する */}
          {locationLabel && (
            <span
              className={cx(metaClass, css({ flexShrink: '1!' }))}
              title={locationLabel}
            >
              <IconMapPin size={16} />
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
              <IconClock size={16} />
              <span className={css({ textBox: 'trim-both cap alphabetic' })}>
                {formatPerformances(performances)}
              </span>
            </span>
          ) : (
            schedule.length > 0 && (
              <span className={metaClass}>
                <IconCalendarEvent size={16} />
                <span className={css({ textBox: 'trim-both cap alphabetic' })}>
                  {formatSchedule(schedule)}
                </span>
              </span>
            )
          )}
          {action && (
            <div className={css({ ml: 'auto', display: 'flex' })}>{action}</div>
          )}
        </div>
      </div>
    </>
  );
}

/** 投票の対象を並べる行の外枠。 */
export const projectRowClass = css({
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  px: '16px',
  py: '12px',
  color: 'inherit',
  textDecoration: 'none',
  textAlign: 'left',
  borderBottom: 'token(borderWidths.divider) solid token(colors.border.subtle)',
  transition: 'background 0.15s',
  _active: { bg: 'border.subtle' },
});

/** 企画一覧の1件の外枠。 */
const projectCardClass = css({
  position: 'relative',
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  px: '16px',
  py: '14px',
  color: 'inherit',
  textDecoration: 'none',
  transition: 'background 0.15s',
  // 画面外の行はレイアウトと描画を省く。シートを動かすと中身の幅が変わり、一覧をレイアウトし直すため。
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 92px',
  _active: { bg: 'accent.subtle' },
  _after: {
    content: '""',
    position: 'absolute',
    bottom: 0,
    // 左余白16px + アイコン64px + 間隔12px で、企画名の書き出しに揃える。
    left: '92px',
    right: 0,
    h: 'token(borderWidths.divider)',
    bg: 'border.subtle',
  },
  _last: { _after: { display: 'none' } },
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
      className={cx(projectCardClass, className)}
      style={{ ...style, opacity: cancelled ? 0.55 : undefined }}
    >
      <ProjectRowContent
        project={project}
        locationLabel={locationLabel}
        action={
          <FavoriteButton
            active={favorite}
            onToggle={() => onToggleFavorite?.(id)}
            size={22}
            className={css({
              flexShrink: 0,
              mr: '-4px',
              mt: '-2px',
            })}
          />
        }
      />
    </Link>
  );
}
