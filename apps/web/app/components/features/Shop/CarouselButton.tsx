import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { css } from '../../../../styled-system/css';

interface CarouselButtonProps {
  direction: 'left' | 'right';
  onClick: (e: React.MouseEvent) => void;
}

export default function CarouselButton({
  direction,
  onClick,
}: CarouselButtonProps) {
  const isLeft = direction === 'left';

  return (
    <button
      type="button"
      onClick={onClick}
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
        bg: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        color: '#204262',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transition: 'background-color 0.2s, transform 0.1s',
        '&:hover': {
          bg: 'rgba(255, 255, 255, 0.6)',
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
