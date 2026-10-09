import type { MouseEvent } from 'react';
import { css } from '../../../../styled-system/css';
import DetailCloseButton from './DetailCloseButton';

/**
 * 詳細画面のヘッダー1行目（名前と × ボタン）。
 * シートの最小段ではこの行だけが見えるため、高さを一覧の検索欄とそろえ、最小段では名前を1行に切り詰める。
 */
export default function DetailTitleRow({
  title,
  closing,
  onClose,
}: {
  title: string;
  closing: boolean;
  onClose: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minH: '44px',
      })}
    >
      <h1
        className={css({
          flex: 1,
          minWidth: 0,
          fontSize: '2xl',
          fontWeight: 700,
          lineHeight: 1.35,
          color: 'fg.strong',
          '[data-peek] &': { truncate: true },
        })}
      >
        {title}
      </h1>
      <DetailCloseButton closing={closing} onClick={onClose} />
    </div>
  );
}
