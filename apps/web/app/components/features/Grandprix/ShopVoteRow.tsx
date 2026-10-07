import { IconCheck } from '@tabler/icons-react';
import type { Shop } from 'api';
import {
  ShopRowContent,
  shopRowClass,
} from '~/components/features/Shop/ShopListItem';
import { css, cx } from '../../../../styled-system/css';

/** 投票の対象として選ぶ企画の行。見た目は企画一覧の行と揃える。 */
export default function ShopVoteRow({
  shop,
  locationLabel,
  selected,
  disabled,
  onToggle,
}: {
  shop: Shop;
  locationLabel: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cx(
        shopRowClass,
        css({
          w: '100%',
          bg: selected ? 'accent.subtle' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          _last: { borderBottom: 'none' },
        }),
      )}
    >
      <ShopRowContent shop={shop} locationLabel={locationLabel} />
      <span
        className={css({
          flexShrink: 0,
          alignSelf: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          w: '26px',
          h: '26px',
          borderRadius: '999px',
          border: '2px solid',
          borderColor: selected ? 'accent' : 'border',
          bg: selected ? 'accent' : 'surface',
          color: 'surface',
        })}
      >
        {selected && <IconCheck size={16} stroke={3} />}
      </span>
    </button>
  );
}
