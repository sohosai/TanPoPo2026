import { IconClock, IconMapPinFilled } from '@tabler/icons-react';
import type { Shop } from 'api';
import { Link } from 'react-router';
import { css } from '../../../../styled-system/css';
import { token } from '../../../../styled-system/tokens';
import FavoriteButton from './FavoriteButton';

export type { Shop };

type ShopListItemProps = {
  shop: Shop;
  /** 場所の表示ラベル（建物名＋部屋番号、例 "5C305"）。places から整形して渡す */
  locationLabel?: string;
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export default function ShopListItem({
  shop,
  locationLabel,
  favorite = false,
  onToggleFavorite,
}: ShopListItemProps) {
  const {
    id,
    name,
    organization,
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
          width: '112px',
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
          <>
            <img
              src={thumbnail}
              alt=""
              className={css({
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(30px) brightness(0.85)',
                opacity: 1.0,
              })}
            />
            <img
              src={thumbnail}
              alt=""
              className={css({
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '4px',
              })}
            />
          </>
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
          py: '4px',
          pr: '4px',
        })}
      >
        <h3
          className={css({
            fontWeight: 500,
            fontSize: '18px',
            lineHeight: 1.3,
            color: '#204262',
            lineClamp: 2,
            wordBreak: 'break-all',
          })}
        >
          {name}
        </h3>

        <p
          className={css({
            fontWeight: 400,
            fontSize: '11px',
            color: '#204262',
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
            fontSize: '13px',
            color: 'fg.muted',
            pr: '28px',
          })}
        >
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconMapPinFilled size={14} color="#204262" />
            {locationLabel}
          </span>
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconClock size={14} color="#204262" />
            {schedule.join('、')}
          </span>
        </div>
      </div>

      {/* お気に入り */}
      <FavoriteButton
        active={favorite}
        onToggle={() => onToggleFavorite?.(id)}
        size={26}
        className={css({
          position: 'absolute',
          right: '10px',
          bottom: '10px',
        })}
      />
    </Link>
  );
}
