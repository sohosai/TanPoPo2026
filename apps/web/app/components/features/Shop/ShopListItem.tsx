import {
  IconClock,
  IconHeart,
  IconHeartFilled,
  IconMapPin,
} from '@tabler/icons-react';
// 店舗の型は API（バックエンド）を正とする。
import type { Shop } from 'api';
import { Link } from 'react-router';
import { css } from '../../../../styled-system/css';

export type { Shop };

type ShopListItemProps = {
  shop: Shop;
  /** お気に入り登録済みか */
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

const accentColor = '#3bb6b6';

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
        bg: '#ffffff',
        border: '1px solid',
        borderColor: '#bfe9e9',
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
          bg: '#9e9e9e',
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
            fontSize: '15px',
            lineHeight: 1.3,
            color: '#222222',
            lineClamp: 2,
          })}
        >
          {name}
        </h3>

        <p
          className={css({
            fontSize: '12px',
            color: '#888888',
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
            color: '#555555',
          })}
        >
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconMapPin size={14} color={accentColor} />
            {location}
          </span>
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconClock size={14} color={accentColor} />
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
          // カードのリンク遷移を抑止してお気に入り操作のみ行う。
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
          color: favorite ? '#ff6b81' : '#cccccc',
          cursor: 'pointer',
        })}
      >
        {favorite ? <IconHeartFilled size={26} /> : <IconHeart size={26} />}
      </button>
    </Link>
  );
}
