import { IconCheck } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { css } from '../../../../styled-system/css';

/** 設問ごとのカード。番号は回答すると ✓ に変わり、どこまで答えたかが分かる。 */
export default function StepCard({
  step,
  title,
  description,
  done,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={css({
        bg: 'surface',
        borderRadius: '2xl',
        boxShadow: 'card',
        overflow: 'hidden',
      })}
    >
      <header
        className={css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          p: '20px',
          pb: '14px',
        })}
      >
        <span
          className={css({
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            w: '24px',
            h: '24px',
            borderRadius: 'full',
            bg: done ? 'accent' : 'accent.subtle',
            color: done ? 'surface' : 'accent.text',
            fontSize: 'sm',
            fontWeight: 'bold',
          })}
        >
          {done ? <IconCheck size={15} stroke={3} /> : step}
        </span>
        <div className={css({ minWidth: 0 })}>
          <h2
            className={css({
              fontSize: 'xl',
              fontWeight: 700,
              lineHeight: '24px',
              color: 'fg.strong',
            })}
          >
            {title}
          </h2>
          {description && (
            <p
              className={css({
                mt: '2px',
                fontSize: 'xs',
                lineHeight: 1.6,
                color: 'fg.subtle',
              })}
            >
              {description}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/** 設問の選択肢のボタン（はい／いいえ など）。 */
export function ChoiceButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={css({
        flex: 1,
        py: '10px',
        borderRadius: 'xl',
        border: 'token(borderWidths.thin) solid',
        borderColor: active ? 'accent' : 'border',
        bg: active ? 'accent' : 'surface',
        color: active ? 'surface' : 'fg.muted',
        fontSize: 'lg',
        fontWeight: active ? 'bold' : 'normal',
        cursor: 'pointer',
      })}
    >
      {label}
    </button>
  );
}
