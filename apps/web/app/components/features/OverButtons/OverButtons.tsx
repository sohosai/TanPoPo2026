import {
  IconChevronDown,
  IconClipboardText,
  IconTrophy,
  type TablerIcon,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { css } from '../../../../styled-system/css';

interface RelatedSiteItem {
  id: string;
  lines: string[];
}

const RELATED_SITES: RelatedSiteItem[] = [
  {
    id: 'official',
    lines: ['雙峰祭', '公式web'],
  },
  {
    id: 'live',
    lines: ['生配信', 'web'],
  },
  {
    id: 'timetable',
    lines: ['タイム', 'テーブル'],
  },
];

const EVENT_LINKS: { to: string; icon: TablerIcon; label: string }[] = [
  { to: '/grandprix', icon: IconTrophy, label: 'グランプリ投票' },
  { to: '/questionnaire', icon: IconClipboardText, label: '来場者アンケート' },
];

/** ホーム画面から常時アクセスできる、グランプリ投票・来場者アンケートへの導線。 */
function EventLinkButtons() {
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

export default function OverButtons() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // メニュー外部のクリックおよび Escape キー押下でメニューを閉じる
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <EventLinkButtons />
      <div
        ref={containerRef}
        className={css({
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          userSelect: 'none',
        })}
      >
        {/* メイントグルボタン */}
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="関連サイトメニュー"
          onClick={() => setOpen((prev) => !prev)}
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            height: '34px',
            px: '14px',
            borderRadius: '9999px',
            border: '1px solid',
            borderColor: open ? 'transparent' : 'rgba(255, 255, 255, 0.7)',
            backgroundColor: open ? '#4A93D7' : 'rgba(255, 255, 255, 0.82)',
            color: open ? '#FFFFFF' : '#4A93D7',
            backdropFilter: 'blur(8px)',

            boxShadow: open
              ? '0 4px 14px rgba(74, 147, 215, 0.35)'
              : '0 2px 8px rgba(0, 0, 0, 0.12)',
            fontFamily: 'Noto Sans JP, sans-serif',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            outline: 'none',
            transition:
              'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
            '&:hover': {
              backgroundColor: open ? '#3d82c4' : 'rgba(255, 255, 255, 0.95)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          })}
        >
          <span>関連サイト</span>
          <IconChevronDown
            size={15}
            stroke={2.2}
            className={css({
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            })}
          />
        </button>

        {/* ドロップダウン項目リスト */}
        <div
          role="menu"
          aria-hidden={!open}
          className={css({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            mt: '8px',
            pointerEvents: open ? 'auto' : 'none',
          })}
        >
          {RELATED_SITES.map((item, index) => {
            const delay = open
              ? `${index * 45}ms`
              : `${(RELATED_SITES.length - 1 - index) * 30}ms`;

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={open ? 0 : -1}
                style={{
                  opacity: open ? 1 : 0,
                  transform: open
                    ? 'translateY(0) scale(1)'
                    : 'translateY(-10px) scale(0.8)',
                  transitionDelay: delay,
                }}
                className={css({
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(8px)',

                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.14)',
                  color: '#4A93D7',
                  fontFamily: 'Noto Sans JP, sans-serif',
                  fontSize: '10px',
                  fontWeight: '600',
                  lineHeight: '1.2',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                  transition:
                    'opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18)',
                    transform: 'scale(1.06) !important',
                  },
                  '&:active': {
                    transform: 'scale(0.92) !important',
                  },
                })}
              >
                {item.lines.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
