import {
  IconClipboardText,
  IconTrophy,
  type TablerIcon,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { css } from '../../../../styled-system/css';

const EVENT_LINKS: { to: string; icon: TablerIcon; label: string }[] = [
  { to: '/grandprix', icon: IconTrophy, label: 'グランプリ投票' },
  { to: '/questionnaire', icon: IconClipboardText, label: '来場者アンケート' },
];

/** ホーム画面から常時アクセスできる、グランプリ投票・来場者アンケートへの導線。 */
export default function EventLinkButtons() {
  return (
    <div
      className={css({
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      })}
    >
      {EVENT_LINKS.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '34px',
            px: '14px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            backgroundColor: 'rgba(255, 255, 255, 0.82)',
            color: '#4A93D7',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            fontFamily: 'Noto Sans JP, sans-serif',
            fontSize: '13px',
            fontWeight: '500',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'background-color 0.2s ease, transform 0.15s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          })}
        >
          <Icon size={16} stroke={2} />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}
