import { IconChevronDown, IconX } from '@tabler/icons-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import { peekFadeStyles } from '~/components/layouts/MapPanel/peekMorph';
import { css, cx } from '../../../../styled-system/css';
import {
  CATEGORY_OPTIONS,
  emptyCriteria,
  hasActiveFilter,
  SCHEDULE_OPTIONS,
  type ProjectFilterCriteria,
  toggleItem,
} from './criteria';
import { ChipDivider, FavoriteFilterChip, FilterChip } from './FilterChip';
import { DAY_LABELS } from './labels';

type ProjectSearchBarProps = {
  criteria: ProjectFilterCriteria;
  onChange: (next: ProjectFilterCriteria) => void;
  tagOptions: string[];
};

export default function ProjectSearchBar({
  criteria,
  onChange,
  tagOptions,
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

  const [tagsOpen, setTagsOpen] = useState(false);
  const tagPanelId = useId();
  const canClear = hasActiveFilter(criteria) || criteria.q !== '';

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
      <label
        className={css({
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
          _focusWithin: { boxShadow: '0 0 0 3px token(colors.accent.subtle)' },
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
            mr: '4px',
            cursor: 'pointer',
          })}
        >
          <img src="/logo/search.webp" alt="" width={18} height={22} />
        </button>
      </label>

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
        <ChipDivider />
        {CATEGORY_OPTIONS.map((category) => (
          <FilterChip
            key={category}
            active={criteria.categories.includes(category)}
            onClick={() =>
              onChange({
                ...criteria,
                categories: toggleItem(criteria.categories, category),
              })
            }
          >
            <span className={css({ textBox: 'trim-both cap alphabetic' })}>
              {category}
            </span>
          </FilterChip>
        ))}
        {tagOptions.length > 0 && (
          <>
            <ChipDivider />
            <FilterChip
              active={criteria.tags.length > 0}
              aria-expanded={tagsOpen}
              aria-controls={tagPanelId}
              onClick={() => setTagsOpen((open) => !open)}
            >
              <span className={css({ textBox: 'trim-both cap alphabetic' })}>
                タグ
                {criteria.tags.length > 0 && ` ${criteria.tags.length}`}
              </span>
              <IconChevronDown
                size={14}
                className={css({ transition: 'transform 0.2s' })}
                style={{ transform: tagsOpen ? 'rotate(180deg)' : undefined }}
              />
            </FilterChip>
          </>
        )}
      </div>

      {tagsOpen && (
        <div
          id={tagPanelId}
          className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px' })}
        >
          {tagOptions.map((tag) => (
            <FilterChip
              key={tag}
              active={criteria.tags.includes(tag)}
              onClick={() =>
                onChange({ ...criteria, tags: toggleItem(criteria.tags, tag) })
              }
            >
              <span className={css({ textBox: 'trim-both cap alphabetic' })}>
                #{tag}
              </span>
            </FilterChip>
          ))}
        </div>
      )}

      {canClear && (
        <button
          type="button"
          onClick={() => onChange(emptyCriteria)}
          className={css({
            alignSelf: 'flex-end',
            fontSize: 'xs',
            color: 'accent.text',
            fontWeight: 500,
            cursor: 'pointer',
          })}
        >
          条件をクリア
        </button>
      )}
    </div>
  );
}
