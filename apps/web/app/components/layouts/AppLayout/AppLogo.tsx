import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';

// public/logo/wide-outline.webp は、地図の上でも読めるよう wide.webp に白い縁取りを付けて幅 600px に縮めたもの。
// ロゴを差し替えたら作り直す。縦横比は縁取りの余白を含む。
const LOGO_ASPECT = 600 / 182;

const linkStyles = css({
  display: 'block',
  lineHeight: 0,
  position: 'fixed',
  top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
  zIndex: 5,
  // 白い縁取りだけでは明るい地図の上で浮き上がりにくいため、ごく薄い影を足す。
  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18))',
  transition: 'transform 0.1s',
  _active: { transform: 'scale(0.97)' },
});

/**
 * 地図の上に載せるロゴ。押すとトップ（企画一覧）を開く。
 * スマホは画面の左上（`left`）、PC は左にサイドパネルがあるため画面の右上（`right`）に置く。
 */
export default function AppLogo({ corner }: { corner: 'left' | 'right' }) {
  const width = corner === 'left' ? 148 : 200;
  return (
    <Link
      to="/"
      aria-label="TanPoPo 筑波大学雙峰祭 企画検索システム トップへ"
      className={cx(
        linkStyles,
        corner === 'left'
          ? css({ left: 'calc(env(safe-area-inset-left, 0px) + 6px)' })
          : css({ right: 'calc(env(safe-area-inset-right, 0px) + 10px)' }),
      )}
    >
      <img
        src="/logo/wide-outline.webp"
        alt=""
        width={width}
        height={Math.round(width / LOGO_ASPECT)}
      />
    </Link>
  );
}
