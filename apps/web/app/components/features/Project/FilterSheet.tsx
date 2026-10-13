import { useCallback, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { isDesktopViewport } from '~/lib/viewport';
import { css, cx } from '../../../../styled-system/css';
import {
  CATEGORY_OPTIONS,
  emptyCriteria,
  hasActiveFilter,
  type ProjectFilterCriteria,
  SCHEDULE_OPTIONS,
  toggleItem,
} from './criteria';
import { FavoriteFilterChip, FilterChip } from './FilterChip';
import { CATEGORY_DOT_CLASS, DAY_LABELS } from './labels';
import { useSwipeToClose } from './useSwipeToClose';

type Props = {
  open: boolean;
  criteria: ProjectFilterCriteria;
  onChange: (next: ProjectFilterCriteria) => void;
  /** 今の条件で表示される件数。閉じるボタンに出す。 */
  count: number;
  onClose: () => void;
};

const CLOSE_TRANSITION = 'transform 0.2s ease-in';

const labelClass = css({ textBox: 'trim-both cap alphabetic' });

const headingClass = css({
  fontSize: 'xs',
  fontWeight: 500,
  color: 'fg.subtle',
});

const chipsClass = css({ display: 'flex', flexWrap: 'wrap', gap: '8px' });

const footerButtonClass = css({
  minH: '44px',
  px: '20px',
  borderRadius: 'full',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  _disabled: { opacity: 0.45, cursor: 'default' },
});

/**
 * 絞り込みの条件をまとめて選ぶシート。選んだ時点で一覧に反映する。
 * スマホでは画面の下からせり上がり、下へスワイプすると閉じる。PC では画面の中央に出す。
 */
export default function FilterSheet({
  open,
  criteria,
  onChange,
  count,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 描画される前にモーダルにして、閉じた dialog が一瞬見えないようにする。
  useLayoutEffect(() => {
    if (open) ref.current?.showModal();
  }, [open]);

  // スマホでは下へ滑らせてから閉じる。閉じる動きの起点は、指で引いた位置でも元の位置でもよい。
  const requestClose = useCallback(() => {
    const dialog = ref.current;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!dialog || reduced || isDesktopViewport()) {
      onCloseRef.current();
      return;
    }
    dialog.style.transition = CLOSE_TRANSITION;
    dialog.style.transform = 'translateY(100%)';
    dialog.addEventListener('transitionend', () => onCloseRef.current(), {
      once: true,
    });
  }, []);

  useSwipeToClose(ref, contentRef, open, requestClose);

  if (!open) return null;

  // 地図パネルはシート要素でタッチを拾ってドラッグに使うため、パネルの外（body 直下）に出す。
  return createPortal(
    // 背景（::backdrop）のクリックは dialog 自身へのクリックとして届く。
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボードでは Esc で閉じられる
    <dialog
      ref={ref}
      aria-labelledby="filter-sheet-title"
      onCancel={(e) => {
        // Esc でも閉じる動きを見せる。
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className={css({
        display: 'flex',
        flexDirection: 'column',
        w: '100%',
        maxW: '100%',
        maxH: '85dvh',
        m: 'auto 0 0',
        p: 0,
        border: 'none',
        borderRadius: '22px 22px 0 0',
        bg: 'surface',
        color: 'fg',
        boxShadow: 'sheet',
        animation: 'sheetRise 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        _backdrop: {
          bg: 'overlay.scrim',
          animation: 'fadeIn 0.3s ease-out',
        },
        md: {
          w: '400px',
          maxH: 'calc(100dvh - 32px)',
          m: 'auto',
          borderRadius: '16px',
          animation: 'viewerZoom 0.15s ease-out',
        },
        _motionReduce: { animation: 'none', _backdrop: { animation: 'none' } },
      })}
    >
      <div
        className={css({
          flexShrink: 0,
          pt: '8px',
          px: '16px',
          md: { pt: '20px', px: '20px' },
        })}
      >
        <span
          className={css({
            display: 'block',
            w: '36px',
            h: '4px',
            mx: 'auto',
            mb: '12px',
            borderRadius: 'full',
            bg: 'sheet.handle',
            md: { display: 'none' },
          })}
        />
        <h2
          id="filter-sheet-title"
          className={css({
            fontSize: '16px',
            fontWeight: 700,
            color: 'fg.strong',
          })}
        >
          絞り込み
        </h2>
      </div>

      <div
        ref={contentRef}
        className={css({
          flex: 1,
          minH: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          px: '16px',
          pt: '16px',
          pb: '20px',
          md: { px: '20px' },
        })}
      >
        <h3 className={headingClass}>カテゴリ</h3>
        <div className={chipsClass}>
          {CATEGORY_OPTIONS.map((category) => (
            <FilterChip
              key={category}
              size="lg"
              active={criteria.categories.includes(category)}
              onClick={() =>
                onChange({
                  ...criteria,
                  categories: toggleItem(criteria.categories, category),
                })
              }
            >
              <span
                className={cx(
                  css({
                    flexShrink: 0,
                    w: '10px',
                    h: '10px',
                    borderRadius: 'full',
                  }),
                  CATEGORY_DOT_CLASS[category],
                )}
              />
              <span className={labelClass}>{category}</span>
            </FilterChip>
          ))}
        </div>

        <h3 className={headingClass}>日程</h3>
        <div className={chipsClass}>
          {SCHEDULE_OPTIONS.map((day) => (
            <FilterChip
              key={day}
              size="lg"
              active={criteria.days.includes(day)}
              onClick={() =>
                onChange({ ...criteria, days: toggleItem(criteria.days, day) })
              }
            >
              <span className={labelClass}>{DAY_LABELS[day]}</span>
            </FilterChip>
          ))}
        </div>

        <h3 className={headingClass}>いいね</h3>
        <div className={chipsClass}>
          <FavoriteFilterChip
            size="lg"
            active={criteria.favorite}
            onClick={() =>
              onChange({ ...criteria, favorite: !criteria.favorite })
            }
          />
        </div>
      </div>

      <div
        className={css({
          flexShrink: 0,
          display: 'flex',
          gap: '8px',
          px: '16px',
          pt: '12px',
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid',
          borderColor: 'border.subtle',
          md: { px: '20px', pb: '20px' },
        })}
      >
        {/* 検索キーワードは検索欄で消せるため、ここでは絞り込みの条件だけを外す */}
        <button
          type="button"
          disabled={!hasActiveFilter(criteria)}
          onClick={() => onChange({ ...emptyCriteria, q: criteria.q })}
          className={cx(
            footerButtonClass,
            css({ bg: 'border.subtle', color: 'fg.muted' }),
          )}
        >
          クリア
        </button>
        <button
          type="button"
          onClick={requestClose}
          className={cx(
            footerButtonClass,
            css({ flex: 1, bg: 'accent', color: 'white' }),
          )}
        >
          {count}件を表示
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
