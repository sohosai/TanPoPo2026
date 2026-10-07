import { IconCheck, IconX } from '@tabler/icons-react';
import type { Shop } from 'api';
import { css, cx } from '../../../../styled-system/css';
import { contentWidth } from './styles';

type SubmitBarProps = {
  /** 一般部門で選んだ企画 */
  selectedShops: Shop[];
  maxGeneralVotes: number;
  onRemoveShop: (id: string) => void;
  /** 送信に必要な条件と、それを満たしたか */
  requirements: { label: string; done: boolean }[];
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
};

/** 画面下に固定する投票ボタンの欄。選んだ企画と、送信にあと何が必要かもここに出す。 */
export default function SubmitBar({
  selectedShops,
  maxGeneralVotes,
  onRemoveShop,
  requirements,
  canSubmit,
  submitting,
  onSubmit,
}: SubmitBarProps) {
  return (
    <div
      className={css({
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        bg: 'sheet.background',
        borderTop: '1px solid token(colors.border.subtle)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
      })}
    >
      <div
        className={cx(
          contentWidth,
          css({
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            p: '16px',
            pb: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          }),
        )}
      >
        {selectedShops.length > 0 && (
          <SelectedShops
            shops={selectedShops}
            max={maxGeneralVotes}
            onRemove={onRemoveShop}
          />
        )}
        {!canSubmit && !submitting && (
          <ul
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px',
            })}
          >
            {requirements.map(({ label, done }) => (
              <ChecklistItem key={label} label={label} done={done} />
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className={css({
            width: '100%',
            py: '12px',
            borderRadius: '999px',
            border: 'none',
            bg: canSubmit ? 'accent' : 'surface.muted',
            color: canSubmit ? 'surface' : 'fg.subtle',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          })}
        >
          {submitting ? '送信中...' : '投票する'}
        </button>
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: done ? 'accent' : 'fg.subtle',
      })}
    >
      <span
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: '16px',
          height: '16px',
          borderRadius: '999px',
          border: '1px solid',
          borderColor: done ? 'accent' : 'border',
          bg: done ? 'accent' : 'transparent',
          color: 'surface',
        })}
      >
        {done && <IconCheck size={11} stroke={3} />}
      </span>
      {label}
    </li>
  );
}

/** 一覧のどこまでスクロールしていても、選んだ企画を確かめて外せるようにする。 */
function SelectedShops({
  shops,
  max,
  onRemove,
}: {
  shops: Shop[];
  max: number;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
      })}
    >
      <span
        className={css({
          flexShrink: 0,
          color: 'fg.subtle',
          fontWeight: 'bold',
        })}
      >
        一般部門 {shops.length}/{max}
      </span>
      <ul
        className={css({
          display: 'flex',
          gap: '6px',
          minWidth: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          md: { flexWrap: 'wrap', overflowX: 'visible' },
        })}
      >
        {shops.map((shop) => (
          <li key={shop.id} className={css({ flexShrink: 0 })}>
            <button
              type="button"
              onClick={() => onRemove(shop.id)}
              aria-label={`${shop.name} の選択を外す`}
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                maxW: '180px',
                h: '28px',
                pl: '10px',
                pr: '6px',
                borderRadius: '999px',
                bg: 'accent.subtle',
                color: 'accent.text',
                fontWeight: 500,
                cursor: 'pointer',
              })}
            >
              <span className={css({ truncate: true })}>{shop.name}</span>
              <IconX size={14} className={css({ flexShrink: 0 })} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
