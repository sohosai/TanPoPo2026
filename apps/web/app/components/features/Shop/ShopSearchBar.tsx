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

      {/* 開催日フィルタ */}
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

      {/* 分類フィルタ */}
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

      {/* クリア */}
      {hasActiveFilter(criteria) && (
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
      )}
    </div>
  );
}
