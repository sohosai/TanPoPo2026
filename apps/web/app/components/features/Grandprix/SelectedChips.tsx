import { IconX } from '@tabler/icons-react';
import { css } from '../../../../styled-system/css';

export type SelectedChip = {
  key: string;
  /** 企画名の前に添える短い区分（ステージ名など）。 */
  prefix?: string;
  label: string;
  onRemove: () => void;
};

/** 選んだ企画の一覧。長い一覧をスクロールしなくても、何を選んだかを確かめて外せる。 */
export default function SelectedChips({
  chips,
  emptyLabel,
}: {
  chips: SelectedChip[];
  emptyLabel: string;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        px: '20px',
        pb: '14px',
      })}
    >
      {chips.length === 0 ? (
        <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>
          {emptyLabel}
        </span>
      ) : (
        chips.map(({ key, prefix, label, onRemove }) => (
          <span
            key={key}
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              maxW: '100%',
              pl: '10px',
              pr: '4px',
              py: '4px',
              borderRadius: 'full',
              bg: 'accent.subtle',
              color: 'accent.text',
              fontSize: 'xs',
              fontWeight: 'bold',
            })}
          >
            {prefix && (
              <span className={css({ flexShrink: 0, fontWeight: 'normal' })}>
                {prefix}
              </span>
            )}
            <span
              className={css({
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              })}
            >
              {label}
            </span>
            <button
              type="button"
              aria-label={`${label}の選択を外す`}
              onClick={onRemove}
              className={css({
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                w: '20px',
                h: '20px',
                borderRadius: 'full',
                border: 'none',
                bg: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
              })}
            >
              <IconX size={14} stroke={2.5} />
            </button>
          </span>
        ))
      )}
    </div>
  );
}
