import { IconChevronDown, IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import { css } from '../../../../styled-system/css';
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
    <div
      className={css({
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        px: '16px',
        pt: '4px',
        pb: '8px',
        bg: 'sheet.background',
        borderBottom:
          'token(borderWidths.thin) solid token(colors.border.subtle)',
      })}
    >
      <label
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          h: '44px',
          px: '14px',
          borderRadius: 'xl',
          bg: 'border.subtle',
          color: 'fg.subtle',
          cursor: 'text',
          _focusWithin: {
            bg: 'surface',
            outline: 'token(borderWidths.thick) solid token(colors.accent)',
          },
        })}
      >
        <IconSearch size={18} />
        <input
          type="search"
          value={qDraft}
          placeholder="企画名・団体名・場所で検索"
          onFocus={panel.expand}
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
            onClick={() => onChange({ ...criteria, q: '' })}
            className={css({
              display: 'flex',
              p: '4px',
              mr: '-4px',
              color: 'fg.subtle',
              cursor: 'pointer',
            })}
          >
            <IconX size={16} />
          </button>
        )}
      </label>

      <div
        className={css({
          display: 'flex',
          gap: '8px',
          mx: '-16px',
          px: '16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // マウスでは隠れた横スクロールに気づけず操作もしづらいため、PC では折り返して全部見せる。
          md: { flexWrap: 'wrap', overflowX: 'visible' },
        })}
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
