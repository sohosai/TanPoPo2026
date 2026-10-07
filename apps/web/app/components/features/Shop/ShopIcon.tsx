import type { Shop } from 'api';
import { css, cx } from '../../../../styled-system/css';
import { CATEGORY_COLOR_CLASS } from './labels';

const iconClass = css({
  position: 'relative',
  flexShrink: 0,
  borderRadius: '50%',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  // 白地のロゴでも輪郭が分かるよう、画像の上に細い円の線を重ねる。
  _after: {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
    pointerEvents: 'none',
  },
});

/** 企画アイコンは円形が前提。画像が無い企画は分類色の円に頭文字を表示する。 */
export default function ShopIcon({
  shop,
  size,
}: {
  shop: Pick<Shop, 'thumbnail' | 'name' | 'category'>;
  size: number;
}) {
  const style = { width: size, height: size, fontSize: size * 0.35 };

  if (!shop.thumbnail) {
    return (
      <div
        className={cx(iconClass, CATEGORY_COLOR_CLASS[shop.category])}
        style={style}
      >
        {shop.name.slice(0, 1)}
      </div>
    );
  }
  return (
    <div className={cx(iconClass, css({ bg: 'surface' }))} style={style}>
      <img
        src={shop.thumbnail.src}
        srcSet={shop.thumbnail.srcSet}
        sizes={`${size}px`}
        alt=""
        loading="lazy"
        decoding="async"
        className={css({ w: '100%', h: '100%', objectFit: 'cover' })}
      />
    </div>
  );
}
