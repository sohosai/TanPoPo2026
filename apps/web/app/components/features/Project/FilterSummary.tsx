import { css } from '../../../../styled-system/css';
import {
  emptyCriteria,
  hasActiveFilter,
  type ProjectFilterCriteria,
} from './criteria';

type Props = {
  criteria: ProjectFilterCriteria;
  onChange: (next: ProjectFilterCriteria) => void;
  count: number;
  onOpenFilters: () => void;
};

/**
 * 検索バーの下に置く件数の行。
 * カテゴリは検索欄の下のチップの行に無いため、選んだものをここで見せ、押すと絞り込みシートを開く。
 * 一覧の上に固定して置くため、カテゴリをいくつ選んでも1行に収める。
 */
export default function FilterSummary({
  criteria,
  onChange,
  count,
  onOpenFilters,
}: Props) {
  const canClear = hasActiveFilter(criteria) || criteria.q !== '';

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minH: '32px',
        fontSize: 'xs',
        color: 'fg.subtle',
      })}
    >
      <span className={css({ flexShrink: 0 })}>{count}件</span>
      <span className={css({ flex: 1, minW: 0 })}>
        {criteria.categories.length > 0 && (
          <button
            type="button"
            onClick={onOpenFilters}
            className={css({
              display: 'flex',
              alignItems: 'center',
              maxW: '100%',
              minH: '32px',
              color: 'fg.muted',
              cursor: 'pointer',
            })}
          >
            <span
              className={css({
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              })}
            >
              {criteria.categories.join('・')}
            </span>
          </button>
        )}
      </span>
      {canClear && (
        <button
          type="button"
          onClick={() => onChange(emptyCriteria)}
          className={css({
            flexShrink: 0,
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
