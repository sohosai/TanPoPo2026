import type { ReactNode } from 'react';
import { css } from '../../../../styled-system/css';

/** 1つの設問を入れるカード。 */
export default function StepCard({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  /** 見出しの右に置く補足（票数など）。 */
  aside?: ReactNode;
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
          justifyContent: 'space-between',
          gap: '12px',
          p: '20px',
          pb: '14px',
        })}
      >
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
                mt: '4px',
                fontSize: 'xs',
                lineHeight: 1.6,
                color: 'fg.subtle',
              })}
            >
              {description}
            </p>
          )}
        </div>
        {aside}
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
        py: '14px',
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
