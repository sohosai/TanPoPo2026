import {
  IconHeart,
  IconHeartFilled,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
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

  // フィルタアイコン
  const FilterIcon = ({ filterOpen }: { filterOpen: boolean }) => (
    <svg
      width="23"
      height="16"
      viewBox="0 0 23 16"
      fill="none"
      style={{ transition: 'all 0.3s ease' }}
    >
      <path
        d="M2 2H21M2 7.5H21M2 13H21"
        stroke={filterOpen ? '#4A93D7' : 'white'}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="7" cy="2" r="2" fill={filterOpen ? '#4A93D7' : 'white'} />
      <circle cx="16" cy="7.5" r="2" fill={filterOpen ? '#4A93D7' : 'white'} />
      <circle cx="11" cy="13" r="2" fill={filterOpen ? '#4A93D7' : 'white'} />
    </svg>
  );

  // フィルタ開閉の状態
  const [filterOpen, setFilterOpen] = useState(false);

  // フィルタ条件の下書き（確定前の状態）
  const [dcDraft, setDcDraft] = useState({
    days: criteria.days,
    categories: criteria.categories,
  });

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

      {/* フィルタ開閉 */}
      <div>
        <div className={css({
          px: '8px',
          py: '8px',
          mb: '0px',
          position: 'relative',
          zIndex: 10,
          bg: 'accent.subtle',
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'border',
          display: 'flex',
          alignItems: 'center',
        })}
          onClick={() => {
            setFilterOpen((prev) => !prev);
          }}>
          <span className={css({
            px: '6px',
            py: '6px',
            background: filterOpen ? 'white' : '#ACD7FF',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
            border: '1px solid #ACD7FF',
          })}>
            <FilterIcon filterOpen={filterOpen} />
          </span>
          <span className={css({
            pl: '12px',
            fontSize: '16px',
            fontWeight: '400',
            color: '#3E4D63',
          })}>絞り込み</span>
          {hasActiveFilter(criteria) && (
            <button className={css({
              pl: '18px',
              fontSize: '16px',
              color: '#4A90E2',
              cursor: 'pointer',
              fontWeight: '400',
            })} onClick={(e) => {
              e.stopPropagation();
              onChange({ ...emptyCriteria, q: criteria.q });
              setDcDraft({ days: [], categories: [] });
            }}>クリア</button>
          )}
          <button className={css({
            ml: 'auto',
            py: '2px',
            width: '80px',
            fontSize: '16px',
            color: "#FFFFFF",
            bg: '#4A90E2',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            justifyContent: 'flex-end',
            fontWeight: '400',
          })}
            onClick={(e) => {
              e.stopPropagation();
              onChange({ ...criteria, ...dcDraft });
            }}
          >確定</button>
          <span className={css({
            pl: '4px',
            fontSize: '12px',
            color: '#D8D8D8',
            justifyContent: 'flex-end',
          })}>▶</span>
        </div>

        <div className={css({
          bg: '#F8FCFF',
          mt: '-8px',
          px: '8px',
          pt: '16px',
          pb: '8px',
          position: 'relative',
          zIndex: 1,
          gap: '8px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.6s ease',
          maxHeight: filterOpen ? '500px' : '0',
          border: '1px solid',
          borderTop: 'none',
          borderColor: 'border',
          borderRadius: '0 0 8px 8px',
          opacity: filterOpen ? 1 : 0,
        })}>

          {/* 開催日フィルタ */}
          <div className={rowStyle}>
            {SCHEDULE_OPTIONS.map((day) => (
              <Chip
                key={day}
                label={day}
                active={dcDraft.days.includes(day)}
                onClick={() =>
                  setDcDraft({
                    ...dcDraft,
                    days: toggle(dcDraft.days, day),
                  })
                }
              />
            ))}
          </div>

          {/* 分類フィルタ */}
          <div className={rowStyle}>
            {CATEGORY_OPTIONS.map((category) => (
              <Chip
                key={category}
                label={category}
                active={dcDraft.categories.includes(category)}
                onClick={() =>
                  setDcDraft({
                    ...dcDraft,
                    categories: toggle(dcDraft.categories, category),
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* クリア */}
      {/*{hasActiveFilter(criteria) && (
        <button
          type="button"
          onClick={() => onChange({ ...emptyCriteria, q: criteria.q })}
          className={css({
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'fg.subtle',
            cursor: 'pointer',
          })}
        >
          <IconX size={14} />
          絞り込みをクリア
        </button>
      )}*/}
    </div>
  );
}
