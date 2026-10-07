import {
  IconChevronDown,
  IconHeart,
  IconHeartFilled,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useBottomSheet } from '~/components/layouts/BottomSheet/BottomSheet';
import { css, cx } from '../../../../styled-system/css';
import {
  CATEGORY_OPTIONS,
  emptyCriteria,
  hasActiveFilter,
  SCHEDULE_OPTIONS,
  type ShopFilterCriteria,
} from './filter';
import { DAY_LABELS } from './labels';

type ShopSearchBarProps = {
  criteria: ShopFilterCriteria;
  onChange: (next: ShopFilterCriteria) => void;
  tagOptions: string[];
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Chip({
  active,
  onClick,
  tone = 'accent',
  children,
  ...aria
}: {
  active: boolean;
  onClick: () => void;
  tone?: 'accent' | 'favorite';
  children: ReactNode;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={aria['aria-expanded'] === undefined ? active : undefined}
      {...aria}
      onClick={onClick}
      className={cx(
        chipClass,
        active ? chipActiveClass[tone] : chipInactiveClass,
      )}
    >
      {children}
    </button>
  );
}

const chipClass = css({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  h: '32px',
  px: '12px',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '13px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
});

const chipInactiveClass = css({
  borderColor: 'border',
  bg: 'surface',
  color: 'fg.muted',
});

const chipActiveClass = {
  accent: css({
    borderColor: 'accent.text',
    bg: 'accent.text',
    color: 'surface',
  }),
  favorite: css({ borderColor: 'favorite', bg: 'favorite', color: 'surface' }),
};

const dividerClass = css({
  flexShrink: 0,
  alignSelf: 'center',
  w: '1px',
  h: '20px',
  bg: 'border',
});

export default function ShopSearchBar({
  criteria,
  onChange,
  tagOptions,
}: ShopSearchBarProps) {
  const sheet = useBottomSheet();

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
        borderBottom: '1px solid token(colors.border.subtle)',
      })}
    >
      <label
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          h: '44px',
          px: '14px',
          borderRadius: '12px',
          bg: 'border.subtle',
          color: 'fg.subtle',
          cursor: 'text',
          _focusWithin: {
            bg: 'surface',
            outline: '2px solid token(colors.accent)',
          },
        })}
      >
        <IconSearch size={18} />
        <input
          type="search"
          value={qDraft}
          placeholder="企画名・団体名・場所で検索"
          onFocus={sheet.expand}
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
            fontSize: '16px',
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
        <Chip
          tone="favorite"
          active={criteria.favorite}
          onClick={() =>
            onChange({ ...criteria, favorite: !criteria.favorite })
          }
        >
          {criteria.favorite ? (
            <IconHeartFilled size={14} />
          ) : (
            <IconHeart size={14} />
          )}
          いいね
        </Chip>
        <span className={dividerClass} />
        {SCHEDULE_OPTIONS.map((day) => (
          <Chip
            key={day}
            active={criteria.days.includes(day)}
            onClick={() =>
              onChange({ ...criteria, days: toggle(criteria.days, day) })
            }
          >
            {DAY_LABELS[day]}
          </Chip>
        ))}
        <span className={dividerClass} />
        {CATEGORY_OPTIONS.map((category) => (
          <Chip
            key={category}
            active={criteria.categories.includes(category)}
            onClick={() =>
              onChange({
                ...criteria,
                categories: toggle(criteria.categories, category),
              })
            }
          >
            {category}
          </Chip>
        ))}
        {tagOptions.length > 0 && (
          <>
            <span className={dividerClass} />
            <Chip
              active={criteria.tags.length > 0}
              aria-expanded={tagsOpen}
              aria-controls={tagPanelId}
              onClick={() => setTagsOpen((open) => !open)}
            >
              タグ
              {criteria.tags.length > 0 && ` ${criteria.tags.length}`}
              <IconChevronDown
                size={14}
                className={css({ transition: 'transform 0.2s' })}
                style={{ transform: tagsOpen ? 'rotate(180deg)' : undefined }}
              />
            </Chip>
          </>
        )}
      </div>

      {tagsOpen && (
        <div
          id={tagPanelId}
          className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px' })}
        >
          {tagOptions.map((tag) => (
            <Chip
              key={tag}
              active={criteria.tags.includes(tag)}
              onClick={() =>
                onChange({ ...criteria, tags: toggle(criteria.tags, tag) })
              }
            >
              #{tag}
            </Chip>
          ))}
        </div>
      )}

      {canClear && (
        <button
          type="button"
          onClick={() => onChange(emptyCriteria)}
          className={css({
            alignSelf: 'flex-end',
            fontSize: '12px',
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
