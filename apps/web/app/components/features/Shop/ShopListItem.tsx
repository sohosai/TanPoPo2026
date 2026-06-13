import {
  IconClock,
  IconHeart,
  IconHeartFilled,
  IconMapPin,
} from '@tabler/icons-react';
import type { Shop } from 'api';
import { Link } from 'react-router';
import { css } from '../../../../styled-system/css';
import { token } from '../../../../styled-system/tokens';

export type { Shop };

type ShopListItemProps = {
  shop: Shop;
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export default function ShopListItem({
  shop,
  favorite = false,
  onToggleFavorite,
}: ShopListItemProps) {
  const {
    id,
    name,
    organization,
    location,
    schedule,
    thumbnail,
    cancelled = false,
  } = shop;

  return (
    <Link
      to={`/shop/${id}`}
      className={css({
        display: 'flex',
        gap: '12px',
        alignItems: 'stretch',
        position: 'relative',
        bg: 'surface',
        border: '1px solid',
        borderColor: 'accent.border',
        borderRadius: '8px',
        p: '10px',
        mx: '12px',
        my: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        color: 'inherit',
        textDecoration: 'none',
      })}
    >
      {/* サムネイル */}
      <div
        className={css({
          position: 'relative',
          flexShrink: 0,
          width: '96px',
          aspectRatio: '1 / 1',
          bg: 'surface.muted',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {thumbnail && (
          <img
            src={thumbnail}
            alt=""
            className={css({
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            })}
          />
        )}
        {cancelled && (
          <span
            className={css({
              position: 'absolute',
              fontWeight: 'bold',
              fontSize: '18px',
              color: '#000000',
            })}
          >
            中止
          </span>
        )}
      </div>

      {/* 本文 */}
      <div
        className={css({
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pr: '24px',
        })}
      >
        <h3
          className={css({
            fontWeight: 'bold',
            fontSize: '17px',
            lineHeight: 1.3,
            color: 'fg.strong',
            lineClamp: 2,
          })}
        >
          {name}
        </h3>

        <p
          className={css({
            fontSize: '12px',
            color: 'fg.subtle',
          })}
        >
          {organization}
        </p>

        <div
          className={css({
            mt: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 12px',
            fontSize: '12px',
            color: 'fg.muted',
          })}
        >
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconMapPin size={14} color={token('colors.accent')} />
            {location}
          </span>
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconClock size={14} color={token('colors.accent')} />
            {schedule.join('、')}
          </span>
        </div>
      </div>

      {/* お気に入り */}
      <button
        type="button"
        aria-label={favorite ? 'お気に入りから削除' : 'お気に入りに追加'}
        aria-pressed={favorite}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.(id);
        }}
        className={css({
          position: 'absolute',
          right: '10px',
          bottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: '2px',
          color: favorite ? 'favorite' : 'favorite.inactive',
          cursor: 'pointer',
        })}
      >
        {favorite ? <IconHeartFilled size={26} /> : <IconHeart size={26} />}
      </button>
    </Link>
  );
}
