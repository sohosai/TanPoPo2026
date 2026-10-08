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
  fontWeight: 700,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
});

const chipInactiveClass = css({
  borderColor: 'transparent',
  bg: 'border.subtle',
  color: 'fg',
});

const chipActiveClass = {
  accent: css({
    borderColor: 'accent.text',
    bg: 'accent.text',
    color: 'surface',
  }),
  favorite: css({ borderColor: 'favorite', bg: 'favorite', color: 'surface' }),
};

/** 絞り込み条件のオン/オフを切り替えるチップ。 */
export function FilterChip({
  active,
  onClick,
  tone = 'accent',
  children,
  ...aria
}: {
  active: boolean;
  onClick: () => void;
  tone?: 'accent' | 'favorite';
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
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <FilterChip tone="favorite" active={active} onClick={onClick}>
      {active ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
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
