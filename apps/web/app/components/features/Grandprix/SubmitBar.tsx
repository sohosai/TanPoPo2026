import { IconCheck } from '@tabler/icons-react';
import { css, cx } from '../../../../styled-system/css';
import { contentWidth } from './styles';

type SubmitBarProps = {
  /** 送信に必要な条件と、それを満たしたか */
  requirements: { label: string; done: boolean }[];
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
};

/** 画面下に固定する投票ボタンの欄。送信にあと何が必要かもここに出す。 */
export default function SubmitBar({
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
        borderTop:
          'token(borderWidths.divider) solid token(colors.border.subtle)',
        boxShadow: 'bar',
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
        {!canSubmit && !submitting && (
          <ul
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: 'xs',
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
            borderRadius: 'full',
            border: 'none',
            bg: canSubmit ? 'accent' : 'surface.muted',
            color: canSubmit ? 'surface' : 'fg.subtle',
            fontSize: 'lg',
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
          borderRadius: 'full',
          border: 'token(borderWidths.thin) solid',
          borderColor: done ? 'accent' : 'border',
          bg: done ? 'accent' : 'transparent',
          color: 'surface',
        })}
      >
        {done && <IconCheck size={11} stroke={3} />}
      </span>
      <span className={css({ textBox: 'trim-both cap alphabetic' })}>
        {label}
      </span>
    </li>
  );
}
