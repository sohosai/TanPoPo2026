import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
import type { ProjectImage } from 'api';
import type { PointerEvent } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { css, cx } from '../../../../styled-system/css';
import { token } from '../../../../styled-system/tokens';
import { useSnapCarousel } from './useSnapCarousel';

type ImageViewerProps = {
  images: ProjectImage[];
  /** 開いた直後に表示する画像の位置 */
  initialIndex: number;
  /** ダイアログのラベル（企画名） */
  title: string;
  /** 閉じたときに、最後に表示していた画像の位置を受け取る */
  onClose: (index: number) => void;
};

// パネルになじませるため、ボタンは地の色や影を持たず、マウスを乗せたときだけ淡い地を出す。
const iconButton = css({
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'full',
  color: 'fg.muted',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  '&:hover, &[data-active]': { bg: 'border.subtle' },
});

const arrowButton = css({
  position: 'absolute',
  top: '50%',
  mt: '-24px',
  w: '48px',
  h: '48px',
  // 画像の左右の余白に置くため、余白のある広い画面かつポインタ操作の端末だけに出す。
  // タッチ端末ではスワイプで送れる。
  display: 'none',
  '@media (hover: hover) and (min-width: 768px)': { display: 'flex' },
});

// 上下スワイプを横スワイプと区別し始める移動量と、離したときに閉じる移動量（px）。
const SWIPE_SLOP = 10;
const SWIPE_CLOSE = 60;
// 移動量が足りなくても、この速さ（px/ms）で払って離したら閉じる。
const SWIPE_FLICK = 0.4;
// 元の位置へ戻るときと、閉じて消えるときの動き。閉じるときは離した勢いを引き継いでゆっくり止まる。
const swipeTransition = (duration: number, easing: string) =>
  ['transform', 'opacity', 'background-color', 'backdrop-filter']
    .map((property) => `${property} ${duration}ms ${easing}`)
    .join(', ');
const SWIPE_BACK = swipeTransition(200, 'ease-out');
const SWIPE_CLOSE_DURATION = 250;
const SWIPE_OUT = swipeTransition(
  SWIPE_CLOSE_DURATION,
  'cubic-bezier(0.3, 0.6, 0.5, 1)',
);

/**
 * 画像を大きく表示するビューワー。広い画面では暗幕の上のパネルとして、狭い画面では全画面で出す。
 * スワイプ・矢印ボタン・左右キー・サムネイル・画像エリアの左右半分のクリックで画像を切り替え、
 * 閉じるボタン・Esc・パネルの外のクリック・画像エリアの上下スワイプで閉じる。`document.body` へポータルで描画する。
 */
export default function ImageViewer({
  images,
  initialIndex,
  title,
  onClose,
}: ImageViewerProps) {
  const count = images.length;
  const { ref, index, goTo, edge, goToEdge, handlers } = useSnapCarousel(
    count,
    initialIndex,
    0.5,
  );
  const thumbsRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const swipe = useRef<{
    id: number;
    x: number;
    y: number;
    dy: number;
    // 直前の動きの速さ（px/ms）。払う操作を見分けるために使う。
    velocity: number;
    time: number;
    vertical: boolean;
  } | null>(null);

  // 上下スワイプの間は表示中の画像だけを指に追従させ、離れるほど背景・ヘッダー・サムネイルを薄くして
  // 下のページを透かす。パネルごと動かすと、画面の部品が動いているように見えるため。
  const setSwipeOffset = (dy: number, transition: string, closing = false) => {
    const img = ref.current?.children[index]?.querySelector('img');
    const rest = 1 - Math.min(1, Math.abs(dy) / 300);
    const mix = (color: string) =>
      `color-mix(in srgb, ${color} ${rest * 100}%, transparent)`;
    const styles: [HTMLElement | null | undefined, Record<string, string>][] = [
      [
        img,
        {
          transform: `translateY(${dy}px) scale(${0.85 + rest * 0.15})`,
          opacity: closing ? '0' : '1',
        },
      ],
      [
        rootRef.current,
        {
          'background-color': mix(token.var('colors.overlay.scrim')),
          'backdrop-filter': `blur(${rest * 8}px)`,
        },
      ],
      [
        panelRef.current,
        { 'background-color': mix(token.var('colors.surface')) },
      ],
      [headerRef.current, { opacity: String(rest) }],
      [thumbsRef.current, { opacity: String(rest) }],
    ];
    // 位置が戻ったら、インラインの指定を外してクラスの見た目へ戻す。
    for (const [el, style] of styles) {
      if (!el) continue;
      el.style.transition = transition;
      for (const [property, value] of Object.entries(style)) {
        if (dy) el.style.setProperty(property, value);
        else el.style.removeProperty(property);
      }
    }
  };

  const swipeHandlers = {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'touch') return;
      swipe.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        dy: 0,
        velocity: 0,
        time: e.timeStamp,
        vertical: false,
      };
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const s = swipe.current;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.vertical) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_SLOP) return;
        // 横の動きは画像の切り替えに任せる。
        if (Math.abs(dx) > Math.abs(dy)) {
          swipe.current = null;
          return;
        }
        s.vertical = true;
      }
      s.velocity = (dy - s.dy) / Math.max(1, e.timeStamp - s.time);
      s.time = e.timeStamp;
      s.dy = dy;
      setSwipeOffset(dy, 'none');
    },
    onPointerUp: () => {
      const s = swipe.current;
      swipe.current = null;
      if (!s?.vertical) return;
      const flicked =
        Math.abs(s.velocity) >= SWIPE_FLICK &&
        Math.sign(s.velocity) === Math.sign(s.dy);
      if (Math.abs(s.dy) < SWIPE_CLOSE && !flicked) {
        setSwipeOffset(0, SWIPE_BACK);
        return;
      }
      // 動かした向きへそのまま抜けてから閉じる。
      setSwipeOffset(
        Math.sign(s.dy) * window.innerHeight * 0.5,
        SWIPE_OUT,
        true,
      );
      setTimeout(() => onClose(index), SWIPE_CLOSE_DURATION);
    },
    // ブラウザが横スクロールを始めると pointercancel が届く。
    onPointerCancel: () => {
      swipe.current = null;
      setSwipeOffset(0, SWIPE_BACK);
    },
  };

  // 描画前に初期位置へ合わせないと、1枚目が一瞬見えてから飛ぶ。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 開いた瞬間にだけ合わせる
  useLayoutEffect(() => {
    goTo(initialIndex, 'instant');
  }, []);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(index);
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    thumbsRef.current?.children[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [index]);

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: パネルの外のクリックで閉じる補助操作。キーボードは Esc で閉じられる
    // biome-ignore lint/a11y/useKeyWithClickEvents: 同上
    <div
      ref={rootRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(index);
      }}
      className={css({
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bg: 'overlay.scrim',
        backdropFilter: 'blur(8px)',
        animation: 'viewerFade 0.2s ease-out',
        md: { p: '48px' },
      })}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} の画像`}
        className={css({
          display: 'flex',
          flexDirection: 'column',
          w: '100%',
          h: '100%',
          bg: 'surface',
          color: 'fg.strong',
          md: {
            maxW: '1080px',
            maxH: '860px',
            borderRadius: 'xl',
            boxShadow: 'raised',
            overflow: 'hidden',
          },
        })}
      >
        <header
          ref={headerRef}
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: '16px',
            pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            pb: '8px',
            md: { px: '24px', pt: '16px' },
          })}
        >
          <span
            className={css({
              fontSize: 'sm',
              fontVariantNumeric: 'tabular-nums',
              color: 'fg.muted',
            })}
          >
            {count > 1 && `${index + 1} / ${count}`}
          </span>
          <button
            type="button"
            onClick={() => onClose(index)}
            aria-label="閉じる"
            className={cx(
              iconButton,
              // アイコンの右端を余白の線にそろえる。
              css({ display: 'flex', w: '40px', h: '40px', mr: '-8px' }),
            )}
          >
            <IconX size={22} />
          </button>
        </header>

        <div
          {...swipeHandlers}
          className={css({ position: 'relative', flex: 1, minHeight: 0 })}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: マウスで左右半分をクリックして送る補助操作。キーボードは左右キーで送れる */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: 同上 */}
          <div
            ref={ref}
            {...handlers}
            onClick={goToEdge}
            className={css({
              display: 'flex',
              h: '100%',
              overflowX: 'auto',
              overscrollBehavior: 'contain',
              // 縦の動きをブラウザに渡さず、上下スワイプで閉じる操作に使う。
              touchAction: 'pan-x',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              '&[data-edge]': { cursor: 'pointer' },
            })}
            data-edge={edge ?? undefined}
          >
            {images.map((image, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: 同じ画像が複数登録されることがあり URL は一意でない
                key={i}
                className={css({
                  flex: '0 0 100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: '16px',
                  // 矢印を画像に重ねず、左右の余白に置く。
                  md: { px: '80px' },
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'always',
                })}
              >
                <img
                  src={image.src}
                  srcSet={image.srcSet}
                  sizes="100vw"
                  alt={`${title} の画像 ${i + 1}`}
                  className={css({
                    maxW: '100%',
                    maxH: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    animation: 'viewerZoom 0.25s ease-out',
                  })}
                />
              </div>
            ))}
          </div>

          {index > 0 && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="前の画像へ"
              data-active={edge === 'prev' || undefined}
              className={cx(iconButton, arrowButton, css({ left: '16px' }))}
            >
              <IconChevronLeft size={28} />
            </button>
          )}
          {index < count - 1 && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="次の画像へ"
              data-active={edge === 'next' || undefined}
              className={cx(iconButton, arrowButton, css({ right: '16px' }))}
            >
              <IconChevronRight size={28} />
            </button>
          )}
        </div>

        <div
          ref={thumbsRef}
          className={css({
            display: 'flex',
            gap: '8px',
            px: '16px',
            pt: '16px',
            pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            md: { px: '24px', pb: '24px' },
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // 中央寄せしつつ、溢れたときに左端が切れないようにする。
            '& > :first-child': { ml: 'auto' },
            '& > :last-child': { mr: 'auto' },
          })}
        >
          {count > 1 &&
            images.map((image, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: 同じ画像が複数登録されることがあり URL は一意でない
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`画像 ${i + 1} を表示`}
                aria-current={i === index}
                className={css({
                  flexShrink: 0,
                  w: '52px',
                  h: '52px',
                  overflow: 'hidden',
                  borderRadius: 'sm',
                  cursor: 'pointer',
                  opacity: 0.45,
                  outline: 'token(borderWidths.thick) solid transparent',
                  outlineOffset: '2px',
                  transition: 'opacity 0.15s, outline-color 0.15s',
                  '&[aria-current=true]': {
                    opacity: 1,
                    outlineColor: 'accent',
                  },
                })}
              >
                <img
                  src={image.src}
                  srcSet={image.srcSet}
                  sizes="52px"
                  alt=""
                  loading="lazy"
                  className={css({ w: '100%', h: '100%', objectFit: 'cover' })}
                />
              </button>
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
