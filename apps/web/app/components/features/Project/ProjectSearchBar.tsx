import { IconAdjustmentsHorizontal, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import { peekFadeStyles } from '~/components/layouts/MapPanel/peekMorph';
import { css, cx } from '../../../../styled-system/css';
import {
  type ProjectFilterCriteria,
  SCHEDULE_OPTIONS,
  toggleItem,
} from './criteria';
import { ChipDivider, FavoriteFilterChip, FilterChip } from './FilterChip';
import FilterSheet from './FilterSheet';
import FilterSummary from './FilterSummary';
import { DAY_LABELS } from './labels';

type ProjectSearchBarProps = {
  criteria: ProjectFilterCriteria;
  onChange: (next: ProjectFilterCriteria) => void;
  /** 今の条件で表示される件数。件数の行と、絞り込みシートの閉じるボタンに出す。 */
  count: number;
  /** チップの行の下に件数の行（FilterSummary）を出すか。 */
  showSummary: boolean;
};

export default function ProjectSearchBar({
  criteria,
  onChange,
  count,
  showSummary,
}: ProjectSearchBarProps) {
  const panel = useMapPanel();

  // IME 変換中は value を外から書き換えると確定文字がダブるため、
  // 入力欄はローカル下書きで制御し、変換確定後にだけ URL 状態へ反映する。
  const [qDraft, setQDraft] = useState(criteria.q);
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 検索を確定したらキーボードを閉じる。地図は検索結果に連動しないため、シートは最大段のまま結果を見せる。
  const submit = () => {
    inputRef.current?.blur();
  };

  // クリアボタンや戻る操作など、外部要因で q が変わったら下書きを同期する。
  // 変換中は IME バッファを尊重して同期しない。
  useEffect(() => {
    if (!composingRef.current) setQDraft(criteria.q);
  }, [criteria.q]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetChangedRef = useRef(false);
  const filterCount =
    criteria.categories.length +
    criteria.days.length +
    (criteria.favorite ? 1 : 0);

  const openSheet = () => {
    inputRef.current?.blur();
    sheetChangedRef.current = false;
    setSheetOpen(true);
  };

  // 条件を変えて閉じたら、検索確定と同じく結果を最大段で見せる。
  const closeSheet = () => {
    setSheetOpen(false);
    if (sheetChangedRef.current) panel.expand();
  };

  return (
    // スクロール領域の外に置いて固定する（sticky だとスクロール中に振動・隙間が出るため）。
    // 上の余白はシートの取っ手が重なる分を含む。最小段へ寄るにつれて上へずらし、左右の余白を
    // カードが細くなる分だけ広げて、最小段のカードの縁から検索欄まで上下左右とも 6px にする。
    <div
      data-sheet-morph
      className={css({
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        px: 'calc(16px + var(--sheet-peek, 0) * 8px)',
        pt: '18px',
        translate: '0 calc(var(--sheet-peek, 0) * -12px)',
        pb: '12px',
        bg: 'sheet.background',
      })}
    >
      <div
        className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}
      >
        <label
          className={css({
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            h: '44px',
            px: '16px',
            borderRadius: 'full',
            border: '1.5px solid',
            borderColor: 'brand.300',
            bg: 'surface',
            color: 'accent',
            cursor: 'text',
            transition: 'box-shadow 0.15s',
            // 枠の太さを変えるとレイアウトがずれるため、入力中は外側に淡い輪を広げて示す。
            _focusWithin: {
              boxShadow: '0 0 0 3px token(colors.accent.subtle)',
            },
          })}
        >
          <input
            ref={inputRef}
            type="search"
            value={qDraft}
            placeholder="企画名・団体名・場所で検索"
            onFocus={panel.expand}
            onKeyDown={(e) => {
              // 変換確定のエンターでは確定しない。Safari は compositionend の後に
              // isComposing=false で keydown を送るため、keyCode 229 でも見分ける。
              if (
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                submit();
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              setQDraft(value);
              // 変換確定前は URL 状態を更新しない（再レンダリングで value が
              // 戻ると IME がダブるため）。確定は compositionEnd で反映する。
              if (!composingRef.current) onChange({ ...criteria, q: value });
            }}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              composingRef.current = false;
              onChange({ ...criteria, q: e.currentTarget.value });
            }}
            className={css({
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              bg: 'transparent',
              fontSize: 'xl',
              color: 'fg.strong',
              _placeholder: { color: 'fg.placeholder' },
              '&::-webkit-search-cancel-button': { display: 'none' },
            })}
          />
          {qDraft !== '' && (
            <button
              type="button"
              aria-label="検索キーワードを消す"
              // 押しても入力欄のフォーカスを外さず、キーボードを出したままにする。
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange({ ...criteria, q: '' })}
              className={css({
                display: 'flex',
                p: '4px',
                color: 'fg.subtle',
                cursor: 'pointer',
              })}
            >
              <IconX size={16} />
            </button>
          )}
          <button
            type="button"
            aria-label="検索"
            onClick={submit}
            className={css({
              flexShrink: 0,
              display: 'flex',
              mr: '2px',
              cursor: 'pointer',
            })}
          >
            <img src="/logo/search.webp" alt="" width={18} height={22} />
          </button>
        </label>

        {/* カテゴリは数が多くチップの行に収まらないため、全条件をまとめたシートで選ぶ */}
        <button
          type="button"
          aria-label="絞り込み"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          data-active={filterCount > 0 || undefined}
          onClick={openSheet}
          className={css({
            position: 'relative',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            w: '44px',
            h: '44px',
            borderRadius: 'full',
            border: '1.5px solid',
            borderColor: 'brand.300',
            bg: 'surface',
            color: 'accent',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
            '&[data-active]': { bg: 'accent.subtle', borderColor: 'accent' },
          })}
        >
          <IconAdjustmentsHorizontal size={20} />
          {/* 円の右上にはみ出すため、最小段ではカードの角丸に切られる。チップの行と同じく最小段へ寄るにつれて消す */}
          {filterCount > 0 && (
            <span
              data-sheet-morph
              className={cx(
                peekFadeStyles,
                css({
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  display: 'grid',
                  placeItems: 'center',
                  minW: '18px',
                  h: '18px',
                  px: '4px',
                  borderRadius: 'full',
                  bg: 'accent',
                  color: 'white',
                  fontSize: '2xs',
                  fontWeight: 700,
                  lineHeight: 1,
                  '[data-peek] &': { visibility: 'hidden' },
                }),
              )}
            >
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* 最小段では検索欄だけを見せる。最小段へ寄るにつれて消す */}
      <div
        data-sheet-morph
        className={cx(
          peekFadeStyles,
          css({
            display: 'flex',
            gap: '8px',
            mx: '-16px',
            px: '16px',
            '[data-peek] &': { visibility: 'hidden' },
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // マウスでは隠れた横スクロールに気づけず操作もしづらいため、PC では折り返して全部見せる。
            md: { flexWrap: 'wrap', overflowX: 'visible' },
          }),
        )}
      >
        <FavoriteFilterChip
          active={criteria.favorite}
          onClick={() =>
            onChange({ ...criteria, favorite: !criteria.favorite })
          }
        />
        <ChipDivider />
        {SCHEDULE_OPTIONS.map((day) => (
          <FilterChip
            key={day}
            active={criteria.days.includes(day)}
            onClick={() =>
              onChange({ ...criteria, days: toggleItem(criteria.days, day) })
            }
          >
            <span className={css({ textBox: 'trim-both cap alphabetic' })}>
              {DAY_LABELS[day]}
            </span>
          </FilterChip>
        ))}
      </div>

      {/* 一覧のスクロール領域の外に固定し、条件をいつでも外せるようにする。最小段へ寄るにつれてチップの行と同じく消す */}
      {showSummary && (
        <div
          data-sheet-morph
          className={cx(
            peekFadeStyles,
            css({ '[data-peek] &': { visibility: 'hidden' } }),
          )}
        >
          <FilterSummary
            criteria={criteria}
            onChange={onChange}
            count={count}
            onOpenFilters={openSheet}
          />
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        criteria={criteria}
        onChange={(next) => {
          sheetChangedRef.current = true;
          onChange(next);
        }}
        count={count}
        onClose={closeSheet}
      />
    </div>
  );
}
