import { applyUpdate, useUpdateReady } from '~/lib/pwa';
import { css } from '../../../../styled-system/css';

/**
 * 新しい版の準備ができたら、画面上部に切り替えの案内を出す。
 * 入力中の内容が消えないよう、勝手には読み込み直さない。
 */
export default function UpdateToast() {
  const ready = useUpdateReady();
  if (!ready) return null;

  return (
    <div
      role="status"
      className={css({
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        // 出現アニメーションが transform を使うため、中央寄せは transform に頼らない。
        insetX: 0,
        mx: 'auto',
        w: 'fit-content',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        pl: '16px',
        pr: '6px',
        py: '6px',
        borderRadius: 'full',
        bg: 'overlay.tooltip',
        color: 'surface',
        fontSize: 'sm',
        boxShadow: 'float',
        animation: 'detailEnter 0.2s ease-out',
      })}
    >
      <span className={css({ whiteSpace: 'nowrap' })}>新しい版があります</span>
      <button
        type="button"
        onClick={applyUpdate}
        className={css({
          minH: '32px',
          px: '14px',
          borderRadius: 'full',
          bg: 'accent',
          color: 'white',
          fontWeight: 700,
          cursor: 'pointer',
        })}
      >
        更新
      </button>
    </div>
  );
}
