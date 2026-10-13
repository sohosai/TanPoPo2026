import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { css } from '../../../../styled-system/css';

interface CarouselButtonProps {
  direction: 'left' | 'right';
  /** マウスがこのボタンの側の端の範囲にあり、クリックでこの向きへ送れる */
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export default function CarouselButton({
  direction,
  active = false,
  onClick,
}: CarouselButtonProps) {
  const isLeft = direction === 'left';

  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active || undefined}
      className={css({
        position: 'absolute',
        left: isLeft ? '24px' : 'auto',
        right: !isLeft ? '24px' : 'auto',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        bg: 'overlay.frosted',
        backdropFilter: 'blur(8px)',
        border: 'token(borderWidths.thin) solid',
        borderColor: 'overlay.frostedBorder',
        color: 'fg.strong',
        cursor: 'pointer',
        boxShadow: 'carousel',
        transition: 'background-color 0.2s, transform 0.1s',
        '&:hover, &[data-active]': {
          bg: 'overlay.frostedHover',
        },
        '&:active': {
          transform: 'translateY(-50%) scale(0.92)',
        },
      })}
      aria-label={isLeft ? '前の画像へ' : '次の画像へ'}
    >
      {isLeft ? <IconChevronLeft size={20} /> : <IconChevronRight size={20} />}
    </button>
  );
}
