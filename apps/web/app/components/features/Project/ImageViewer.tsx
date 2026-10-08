import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
import type { ProjectImage } from 'api';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css, cx } from '../../../../styled-system/css';

type ImageViewerProps = {
  images: ProjectImage[];
  /** 開いた直後に表示する画像の位置 */
  initialIndex: number;
  /** ダイアログのラベル（企画名） */
  title: string;
  /** 閉じたときに、最後に表示していた画像の位置を受け取る */
  onClose: (index: number) => void;
};

const glassButton = css({
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  bg: 'rgba(255, 255, 255, 0.12)',
  color: '#ffffff',
  cursor: 'pointer',
  transition: 'background-color 0.15s, transform 0.1s',
  _hover: { bg: 'rgba(255, 255, 255, 0.22)' },
  _active: { transform: 'scale(0.92)' },
});

const arrowButton = css({
  position: 'absolute',
  top: '50%',
  mt: '-22px',
  w: '44px',
  h: '44px',
  // タッチ端末ではスワイプで送れるので、矢印はポインタ操作の端末だけに出す。
  display: 'none',
  '@media (hover: hover)': { display: 'flex' },
});

/**
 * 画像を全画面で表示するビューワー。スワイプ・矢印ボタン・左右キー・サムネイルで画像を切り替え、
 * 閉じるボタン・Esc・画像外のタップで閉じる。`document.body` へポータルで描画する。
 */
export default function ImageViewer({
  images,
  initialIndex,
  title,
  onClose,
}: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  const goTo = (next: number, behavior: ScrollBehavior = 'smooth') => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.min(count - 1, Math.max(0, next));
    el.scrollTo({ left: clamped * el.clientWidth, behavior });
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} の画像`}
      className={css({
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        bg: 'rgba(10, 10, 12, 0.96)',
        backdropFilter: 'blur(20px)',
        color: '#ffffff',
        animation: 'viewerFade 0.2s ease-out',
      })}
    >
      <header
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          px: '16px',
          pt: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          pb: '8px',
        })}
      >
        <span
          className={css({
            fontSize: '14px',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            opacity: 0.8,
          })}
        >
          {count > 1 && `${index + 1} / ${count}`}
        </span>
        <button
          type="button"
          onClick={() => onClose(index)}
          aria-label="閉じる"
          className={cx(
            glassButton,
            css({ display: 'flex', w: '40px', h: '40px' }),
          )}
        >
          <IconX size={22} />
        </button>
      </header>

      <div className={css({ position: 'relative', flex: 1, minHeight: 0 })}>
        <div
          ref={trackRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className={css({
            display: 'flex',
            h: '100%',
            overflowX: 'auto',
            overscrollBehavior: 'contain',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          })}
        >
          {images.map((image, i) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: 画像外タップで閉じる補助操作。キーボードは Esc で閉じられる
            // biome-ignore lint/a11y/useKeyWithClickEvents: 同上
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: 同じ画像が複数登録されることがあり URL は一意でない
              key={i}
              onClick={(e) => {
                if (e.target === e.currentTarget) onClose(index);
              }}
              className={css({
                flex: '0 0 100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: '16px',
                py: '8px',
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
                  borderRadius: '6px',
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
            className={cx(glassButton, arrowButton, css({ left: '16px' }))}
          >
            <IconChevronLeft size={24} />
          </button>
        )}
        {index < count - 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="次の画像へ"
            className={cx(glassButton, arrowButton, css({ right: '16px' }))}
          >
            <IconChevronRight size={24} />
          </button>
        )}
      </div>

      <div
        ref={thumbsRef}
        className={css({
          display: 'flex',
          gap: '8px',
          px: '16px',
          pt: '12px',
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
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
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: 0.45,
                outline: '2px solid transparent',
                outlineOffset: '2px',
                transition: 'opacity 0.15s, outline-color 0.15s',
                '&[aria-current=true]': {
                  opacity: 1,
                  outlineColor: '#ffffff',
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
    </div>,
    document.body,
  );
}
