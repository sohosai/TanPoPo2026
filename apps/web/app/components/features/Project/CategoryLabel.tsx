import type { ProjectCategory } from 'api';
import { css, cx } from '../../../../styled-system/css';
import { CATEGORY_TAG_CLASS } from './labels';

/** 企画の分類タグ。分類色の淡い面に、どの分類も同じ濃い文字で分類名を書く。 */
export default function CategoryLabel({
  category,
}: {
  category: ProjectCategory;
}) {
  return (
    <span
      className={cx(
        css({
          flexShrink: 0,
          px: '8px',
          py: '0.5em',
          textBox: 'trim-both cap alphabetic',
          borderRadius: 'full',
          fontSize: '2xs',
          color: 'fg',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }),
        CATEGORY_TAG_CLASS[category],
      )}
    >
      {category}
    </span>
  );
}
