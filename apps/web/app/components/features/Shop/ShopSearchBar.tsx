import {
  IconChevronDown,
  IconHeart,
  IconHeartFilled,
  IconSearch,
} from '@tabler/icons-react';
import { useEffect, useId, useRef, useState } from 'react';
import { css } from '../../../../styled-system/css';
import { token } from '../../../../styled-system/tokens';
import {
  CATEGORY_OPTIONS,
  emptyCriteria,
  hasActiveFilter,
  SCHEDULE_OPTIONS,
  type ShopFilterCriteria,
} from './filter';

type ShopSearchBarProps = {
  criteria: ShopFilterCriteria;
  onChange: (next: ShopFilterCriteria) => void;
  tagOptions: string[];
};

/** 配列要素のトグル（あれば外す / なければ足す） */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={css({
        flexShrink: 0,
        px: '12px',
        py: '5px',
        borderRadius: '999px',
        border: '1px solid',
        borderColor: active ? 'accent' : 'border',
        bg: active ? 'accent' : 'surface',
        color: active ? 'surface' : 'fg.muted',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      })}
    >
      {label}
    </button>
  );
}

export default function ShopSearchBar({
  criteria,
  onChange,
  tagOptions,
}: ShopSearchBarProps) {
  // IME 変換中は value を外から書き換えると確定文字がダブるため、
  // 入力欄はローカル下書きで制御し、変換確定後にだけ URL 状態へ反映する。
  const [qDraft, setQDraft] = useState(criteria.q);
  const composingRef = useRef(false);

  // クリアボタンや戻る操作など、外部要因で q が変わったら下書きを同期する。
  // 変換中は IME バッファを尊重して同期しない。
  useEffect(() => {
    if (!composingRef.current) setQDraft(criteria.q);
  }, [criteria.q]);

  const rowStyle = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  });

  const groupLabelStyle = css({
    fontSize: '12px',
    fontWeight: '500',
    color: 'fg.subtle',
  });

  // フィルタ開閉の状態
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPanelId = useId();

  // 現在有効な絞り込み条件の件数（キーワード検索は含めない）。
  const activeFilterCount =
    criteria.categories.length +
    criteria.days.length +
    criteria.tags.length +
    (criteria.favorite ? 1 : 0);

  return (
    <div
      className={css({
        position: 'sticky',
        top: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        px: '12px',
        py: '10px',
        bg: 'sheet.background',
        borderBottom: '1px solid token(colors.border.subtle)',
      })}
    >
      {/* あいまい検索 */}
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          px: '12px',
          py: '8px',
          borderRadius: '999px',
          bg: 'accent.subtle',
        })}
      >
        <IconSearch size={18} color={token('colors.fg.placeholder')} />
        <input
          type="search"
          value={qDraft}
          placeholder="企画名・団体名で検索"
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
            fontSize: '14px',
            color: 'fg',
            _placeholder: { color: 'fg.placeholder' },
          })}
        />
      </div>

      {/* フィルタ開閉 */}
      <div>
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            bg: 'accent.subtle',
            borderRadius: filterOpen ? '8px 8px 0 0' : '8px',
            border: '1px solid',
            borderColor: 'border',
            transition: 'border-radius 0.2s ease',
            overflow: 'hidden',
          })}
        >
          <button
            type="button"
            aria-expanded={filterOpen}
            aria-controls={filterPanelId}
            onClick={() => setFilterOpen((prev) => !prev)}
            className={css({
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: '12px',
              py: '9px',
              border: 'none',
              bg: 'transparent',
              cursor: 'pointer',
              color: 'fg.strong',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left',
              outline: 'none',
              _hover: {
                bg: 'rgba(0, 0, 0, 0.02)',
              },
            })}
          >
            <span
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              })}
            >
              <span>絞り込み</span>
              {activeFilterCount > 0 && (
                <span
                  className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '18px',
                    height: '18px',
                    px: '5px',
                    borderRadius: '999px',
                    bg: 'accent',
                    color: 'surface',
                    fontSize: '11px',
                    fontWeight: '600',
                  })}
                >
                  {activeFilterCount}
                </span>
              )}
            </span>
            <IconChevronDown
              size={18}
              className={css({
                color: 'fg.subtle',
                flexShrink: 0,
                transition: 'transform 0.2s ease',
                transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              })}
            />
          </button>
          {hasActiveFilter(criteria) && (
            <button
              type="button"
              className={css({
                flexShrink: 0,
                border: 'none',
                bg: 'transparent',
                px: '12px',
                py: '9px',
                fontSize: '13px',
                color: 'accent',
                cursor: 'pointer',
                fontWeight: '500',
                outline: 'none',
                _hover: { textDecoration: 'underline' },
              })}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ ...emptyCriteria, q: criteria.q });
              }}
            >
              クリア
            </button>
          )}
        </div>

        <div
          id={filterPanelId}
          className={css({
            bg: 'surface',
            px: '12px',
            py: '12px',
            gap: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.25s ease',
            maxHeight: filterOpen ? '500px' : '0',
            border: '1px solid',
            borderTop: 'none',
            borderColor: 'border',
            borderRadius: '0 0 8px 8px',
            opacity: filterOpen ? 1 : 0,
          })}
        >
          {/* いいねのみ */}
          <div className={rowStyle}>
            <button
              type="button"
              aria-pressed={criteria.favorite}
              onClick={() =>
                onChange({ ...criteria, favorite: !criteria.favorite })
              }
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                px: '12px',
                py: '5px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: criteria.favorite ? 'favorite' : 'border',
                bg: criteria.favorite ? 'favorite' : 'surface',
                color: criteria.favorite ? 'surface' : 'fg.muted',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              })}
            >
              {criteria.favorite ? (
                <IconHeartFilled size={14} />
              ) : (
                <IconHeart size={14} />
              )}
              いいねのみ
            </button>
          </div>

          {/* 開催日フィルタ */}
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            })}
          >
            <span className={groupLabelStyle}>開催日</span>
            <div className={rowStyle}>
              {SCHEDULE_OPTIONS.map((day) => (
                <Chip
                  key={day}
                  label={day}
                  active={criteria.days.includes(day)}
                  onClick={() =>
                    onChange({ ...criteria, days: toggle(criteria.days, day) })
                  }
                />
              ))}
            </div>
          </div>

          {/* 分類フィルタ */}
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            })}
          >
            <span className={groupLabelStyle}>分類</span>
            <div className={rowStyle}>
              {CATEGORY_OPTIONS.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  active={criteria.categories.includes(category)}
                  onClick={() =>
                    onChange({
                      ...criteria,
                      categories: toggle(criteria.categories, category),
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* タグフィルタ */}
          {tagOptions.length > 0 && (
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              })}
            >
              <span className={groupLabelStyle}>タグ</span>
              <div className={rowStyle}>
                {tagOptions.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    active={criteria.tags.includes(tag)}
                    onClick={() =>
                      onChange({
                        ...criteria,
                        tags: toggle(criteria.tags, tag),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
