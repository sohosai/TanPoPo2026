import { IconRotate3d } from '@tabler/icons-react';
import { css } from '../../../../styled-system/css';

const kbd = css({
  display: 'inline-flex',
  alignItems: 'center',
  minW: '24px',
  h: '22px',
  px: '6px',
  borderRadius: '6px',
  border: '1px solid',
  borderColor: 'border',
  borderBottomWidth: '2px',
  bg: 'surface',
  color: 'fg.strong',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 700,
  lineHeight: 1,
});

const row = css({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: 'fg',
  fontSize: '13px',
  whiteSpace: 'nowrap',
});

/**
 * 3D ボタンの左に出す、視点の回転・傾けの操作方法。
 * 3D ボタンを包む `position: relative` の要素の中に置く。下の著作権表記に重ならないよう、
 * カードの下端をボタンの下端にそろえる。
 */
export default function ViewHint({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="status"
      className={css({
        position: 'absolute',
        bottom: 0,
        right: 'calc(100% + 14px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        p: '14px 16px 10px',
        borderRadius: 'xl',
        bg: 'surface',
        boxShadow: 'raised',
        animation: 'detailEnter 0.2s ease-out',
        // ボタンを指す矢印。44px のボタンの中央（下から 22px）に、12px の矢印の中心を合わせる。
        _after: {
          content: '""',
          position: 'absolute',
          bottom: '16px',
          right: '-6px',
          w: '12px',
          h: '12px',
          bg: 'surface',
          rotate: '45deg',
          borderRadius: '2px',
        },
      })}
    >
      <p
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'fg.strong',
          fontSize: '14px',
          fontWeight: 700,
        })}
      >
        <IconRotate3d size={18} className={css({ color: 'accent.text' })} />
        視点を回転・傾ける
      </p>
      <p className={row}>
        <kbd className={kbd}>Ctrl</kbd>+ ドラッグ
      </p>
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        })}
      >
        <p className={row}>
          <span className={css({ color: 'fg.muted' })}>または</span>
          右ドラッグ
        </p>
        <button
          type="button"
          onClick={onClose}
          className={css({
            px: '10px',
            py: '4px',
            borderRadius: '999px',
            color: 'accent.text',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            _hover: { bg: 'border.subtle' },
          })}
        >
          OK
        </button>
      </div>
    </div>
  );
}
