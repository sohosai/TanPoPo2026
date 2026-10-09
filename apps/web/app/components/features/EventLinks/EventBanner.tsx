import {
  IconClipboardText,
  IconTrophy,
  type TablerIcon,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';

// Panda は css() の引数を静的解析するため、色の組み合わせは動的に組み立てず列挙しておく。
const TONE_CLASS = {
  sun: {
    tile: css({ bg: 'sun.subtle' }),
    badge: css({ bg: 'sun', color: 'fg.strong' }),
    decor: css({ color: 'sun.deep' }),
  },
  sky: {
    tile: css({ bg: 'accent.subtle' }),
    badge: css({ bg: 'accent', color: 'surface' }),
    decor: css({ color: 'accent' }),
  },
};

const EVENT_LINKS: {
  to: string;
  icon: TablerIcon;
  title: string;
  caption: string;
  tone: keyof typeof TONE_CLASS;
}[] = [
  {
    to: '/grandprix',
    icon: IconTrophy,
    title: 'グランプリ投票',
    caption: '投票で抽選に参加',
    tone: 'sun',
  },
  {
    to: '/questionnaire',
    icon: IconClipboardText,
    title: '来場者アンケート',
    caption: '回答で福引券',
    tone: 'sky',
  },
];

/** 企画一覧の先頭に置く、グランプリ投票・来場者アンケートへの導線。 */
export default function EventBanner() {
  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        px: '12px',
        pb: '10px',
      })}
    >
      {EVENT_LINKS.map(({ to, icon: Icon, title, caption, tone }) => (
        <Link
          key={to}
          to={to}
          className={cx(
            css({
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              px: '10px',
              py: '9px',
              borderRadius: 'xl',
              color: 'fg.strong',
              textDecoration: 'none',
              transition: 'transform 0.15s',
              _active: { transform: 'scale(0.97)' },
            }),
            TONE_CLASS[tone].tile,
          )}
        >
          <Icon
            aria-hidden
            size={56}
            className={cx(
              css({
                position: 'absolute',
                right: '-12px',
                bottom: '-16px',
                opacity: 0.35,
                transform: 'rotate(-12deg)',
                pointerEvents: 'none',
              }),
              TONE_CLASS[tone].decor,
            )}
          />
          <span
            className={cx(
              css({
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                w: '30px',
                h: '30px',
                borderRadius: 'full',
              }),
              TONE_CLASS[tone].badge,
            )}
          >
            <Icon size={18} />
          </span>
          <span
            className={css({
              position: 'relative',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            })}
          >
            <span
              className={css({
                fontSize: 'sm',
                fontWeight: 700,
                lineHeight: 1.35,
                whiteSpace: 'nowrap',
              })}
            >
              {title}
            </span>
            <span
              className={css({
                fontSize: '2xs',
                color: 'fg.muted',
                whiteSpace: 'nowrap',
              })}
            >
              {caption}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
