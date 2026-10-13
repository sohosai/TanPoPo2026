import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { css, cx } from '../../../../styled-system/css';

const chipClass = css({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  h: '32px',
  px: '12px',
  borderRadius: 'full',
  border: 'token(borderWidths.thin) solid',
  fontSize: 'sm',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
});

// 絞り込みシートの中では、押せる範囲の最小寸法（44px）に合わせて大きくする。
const chipLargeClass = css({
  gap: '6px',
  h: '44px',
  px: '16px',
  fontSize: 'md',
});

const chipInactiveClass = css({
  borderColor: 'border',
  bg: 'surface',
  color: 'fg.muted',
});

const chipActiveClass = {
  accent: css({
    borderColor: 'accent.border',
    bg: 'accent.subtle',
    color: 'accent.text',
  }),
  favorite: css({
    borderColor: 'favorite',
    bg: 'favorite.subtle',
    color: 'favorite.text',
  }),
};

/** 絞り込み条件のオン/オフを切り替えるチップ。 */
export function FilterChip({
  active,
  onClick,
  tone = 'accent',
  size = 'md',
  children,
  ...aria
}: {
  active: boolean;
  onClick: () => void;
  tone?: 'accent' | 'favorite';
  size?: 'md' | 'lg';
  children: ReactNode;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}) {
  return (
    <button
      type="button"
      // 開閉ボタンとして使うときは aria-expanded で状態を伝えるため、押下状態は付けない。
      aria-pressed={aria['aria-expanded'] === undefined ? active : undefined}
      {...aria}
      onClick={onClick}
      className={cx(
        chipClass,
        size === 'lg' && chipLargeClass,
        active ? chipActiveClass[tone] : chipInactiveClass,
      )}
    >
      {children}
    </button>
  );
}

/** いいねした企画だけに絞り込むチップ。 */
export function FavoriteFilterChip({
  active,
  onClick,
  size,
}: {
  active: boolean;
  onClick: () => void;
  size?: 'md' | 'lg';
}) {
  return (
    <FilterChip tone="favorite" active={active} onClick={onClick} size={size}>
      {/* ハートは企画のいいねボタンと同じ色にする。文字は白地との差が足りないため濃い色のまま */}
      {active ? (
        <IconHeartFilled size={14} className={css({ color: 'favorite' })} />
      ) : (
        <IconHeart size={14} />
      )}
      <span className={css({ textBox: 'trim-both cap alphabetic' })}>
        いいね
      </span>
    </FilterChip>
  );
}

/** チップの種類の切れ目に置く縦線。 */
export function ChipDivider() {
  return (
    <span
      className={css({
        flexShrink: 0,
        alignSelf: 'center',
        w: '1px',
        h: '20px',
        bg: 'border',
      })}
    />
  );
}
