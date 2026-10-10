import { IconX } from '@tabler/icons-react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';

const buttonStyles = css({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '36px',
  h: '36px',
  borderRadius: 'full',
  bg: 'border.subtle',
  color: 'fg.muted',
  transition:
    'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s',
  _active: { bg: 'border', transform: 'scale(0.9)' },
});

const closingButtonStyles = css({
  transform: 'scale(0.9)',
});

const closingIconStyles = css({
  animation: 'closeSpin 0.1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
});

/** 詳細画面右上の × ボタン。閉じている最中は × が回転しながら縮む。 */
export default function DetailCloseButton({
  to,
  closing,
  onClick,
  className,
}: {
  to: string;
  closing: boolean;
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label="閉じる"
      onClick={onClick}
      className={cx(buttonStyles, closing && closingButtonStyles, className)}
    >
      <IconX size={20} className={closing ? closingIconStyles : undefined} />
    </Link>
  );
}
