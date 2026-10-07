import { IconCalendarEvent, IconMapPin } from '@tabler/icons-react';
import type { Shop } from 'api';
import { Link } from 'react-router';
import { css, cx } from '../../../../styled-system/css';
import FavoriteButton from './FavoriteButton';
import { CATEGORY_COLOR_CLASS, formatSchedule } from './labels';
import ShopIcon from './ShopIcon';

export type { Shop };

type ShopListItemProps = {
  shop: Shop;
  /** 場所の表示ラベル（建物名＋部屋番号、例 "5C305"）。places から整形して渡す */
  locationLabel?: string;
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

const metaClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  minWidth: 0,
});

export default function ShopListItem({
  shop,
  locationLabel,
  favorite = false,
  onToggleFavorite,
}: ShopListItemProps) {
  const {
    id,
    number,
    name,
    organization,
    category,
    schedule,
    cancelled = false,
  } = shop;

  return (
    <Link
      to={`/shop/${number}`}
      className={css({
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        px: '16px',
        py: '12px',
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: '1px solid token(colors.border.subtle)',
        transition: 'background 0.15s',
        _active: { bg: 'border.subtle' },
      })}
      style={{ opacity: cancelled ? 0.55 : undefined }}
    >
      <ShopIcon shop={shop} size={64} />

      <div
        className={css({
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        })}
      >
        <h3
          className={css({
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: 1.4,
            color: 'fg.strong',
            lineClamp: 2,
            wordBreak: 'break-all',
          })}
        >
          {name}
        </h3>

        <p
          className={css({
            fontSize: '12px',
            color: 'fg.subtle',
            truncate: true,
          })}
        >
          {organization}
        </p>

        <div
          className={css({
            mt: '6px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 10px',
            fontSize: '12px',
            color: 'fg.muted',
          })}
        >
          {cancelled ? (
            <span
              className={css({
                px: '6px',
                py: '1px',
                borderRadius: '4px',
                bg: 'fg.strong',
                color: 'surface',
                fontWeight: 700,
              })}
            >
              中止
            </span>
          ) : (
            <span
              className={cx(
                css({
                  px: '6px',
                  py: '1px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }),
                CATEGORY_COLOR_CLASS[category],
              )}
            >
              {category}
            </span>
          )}
          {locationLabel && (
            <span className={metaClass}>
              <IconMapPin size={13} />
              {locationLabel}
            </span>
          )}
          {schedule.length > 0 && (
            <span className={metaClass}>
              <IconCalendarEvent size={13} />
              {formatSchedule(schedule)}
            </span>
          )}
        </div>
      </div>

      <FavoriteButton
        active={favorite}
        onToggle={() => onToggleFavorite?.(id)}
        size={22}
        className={css({
          flexShrink: 0,
          alignSelf: 'flex-end',
          mb: '-2px',
          mr: '-4px',
        })}
      />
    </Link>
  );
}
