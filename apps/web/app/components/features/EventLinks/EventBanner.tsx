import {
  IconArrowRight,
  IconClipboardText,
  IconTrophy,
  type TablerIcon,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';

// Panda は css() の引数を静的解析するため、色の組み合わせは動的に組み立てず列挙しておく。
const TONE_CLASS = {
  sun: css({ bg: 'sun', color: 'fg.strong', boxShadow: 'popSun' }),
  sky: css({ bg: 'accent.text', color: 'surface', boxShadow: 'pop' }),
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
        gap: '10px',
        px: '12px',
        pb: '14px',
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
              flexDirection: 'column',
              gap: '8px',
              px: '14px',
              pt: '12px',
              pb: '14px',
              borderRadius: 'xl',
              textDecoration: 'none',
              transition: 'transform 0.1s, box-shadow 0.1s',
              _active: { transform: 'translateY(3px)', boxShadow: 'none' },
            }),
            TONE_CLASS[tone],
          )}
        >
          {/* 角に大きく薄く敷く飾り。読み上げには含めない */}
          <Icon
            aria-hidden
            size={88}
            className={css({
              position: 'absolute',
              right: '-18px',
              bottom: '-22px',
              opacity: 0.16,
              transform: 'rotate(-12deg)',
              pointerEvents: 'none',
            })}
          />
          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            })}
          >
            <Icon size={24} />
            <IconArrowRight size={16} />
          </span>
          <span className={css({ display: 'flex', flexDirection: 'column' })}>
            <span
              className={css({
                fontSize: 'lg',
                fontWeight: 700,
                lineHeight: 1.35,
              })}
            >
              {title}
            </span>
            <span
              className={css({
                fontSize: '2xs',
                fontWeight: 700,
                opacity: 0.8,
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
