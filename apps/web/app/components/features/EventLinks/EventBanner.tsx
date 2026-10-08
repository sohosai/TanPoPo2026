import {
  IconChevronRight,
  IconClipboardText,
  IconTrophy,
  type TablerIcon,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { css } from '../../../../styled-system/css';

const EVENT_LINKS: {
  to: string;
  icon: TablerIcon;
  title: string;
  caption: string;
}[] = [
  {
    to: '/grandprix',
    icon: IconTrophy,
    title: 'グランプリ投票',
    caption: '投票で抽選に参加',
  },
  {
    to: '/questionnaire',
    icon: IconClipboardText,
    title: '来場者アンケート',
    caption: '回答で福引券',
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
        px: '16px',
        pt: '12px',
        pb: '4px',
      })}
    >
      {EVENT_LINKS.map(({ to, icon: Icon, title, caption }) => (
        <Link
          key={to}
          to={to}
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            px: '14px',
            py: '12px',
            borderRadius: 'xl',
            bg: 'accent.subtle',
            color: 'accent.text',
            textDecoration: 'none',
            _active: { bg: 'accent.border' },
          })}
        >
          <Icon size={22} className={css({ flexShrink: 0 })} />
          <span
            className={css({
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            })}
          >
            <span
              className={css({
                fontSize: 'sm',
                fontWeight: 700,
                truncate: true,
              })}
            >
              {title}
            </span>
            <span
              className={css({
                fontSize: '2xs',
                color: 'fg.subtle',
                truncate: true,
              })}
            >
              {caption}
            </span>
          </span>
          <IconChevronRight size={16} className={css({ flexShrink: 0 })} />
        </Link>
      ))}
    </div>
  );
}
