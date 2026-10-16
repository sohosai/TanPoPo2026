import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';

// public/logo/wide-outline.webp は、地図の上でも読めるよう wide.webp に白い縁取りを付けて幅 600px に縮めたもの。
// ロゴを差し替えたら作り直す。縦横比は縁取りの余白を含む。
const LOGO_ASPECT = 624 / 190;

const linkStyles = css({
  display: 'block',
  lineHeight: 0,
  // 白い縁取りだけでは明るい地図の上で浮き上がりにくいため、ごく薄い影を足す。
  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18))',
  transition: 'transform 0.1s',
  _active: { transform: 'scale(0.97)' },
});

/**
 * 地図の左上に載せるロゴ。押すとトップ（企画一覧）を開く。
 * スマホは画面の左上、PC はサイドパネルの右隣（`placement`）に置く。
 */
export default function AppLogo({
  placement,
}: {
  placement: 'screen' | 'beside-panel';
}) {
  const width = placement === 'screen' ? 148 : 200;
  return (
    <Link
      to="/"
      aria-label="TanPoPo 筑波大学雙峰祭 企画検索システム トップへ"
      className={cx(
        linkStyles,
        placement === 'screen'
          ? css({
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
              left: 'calc(env(safe-area-inset-left, 0px) + 6px)',
              zIndex: 5,
            })
          : css({
              position: 'absolute',
              top: '10px',
              left: 'calc(100% + 10px)',
              // パネルの外に置くと使える幅が負になり、画像の max-width: 100% で幅が 0 に潰れる。
              w: 'max-content',
            }),
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
