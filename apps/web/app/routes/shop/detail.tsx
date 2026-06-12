import {
  IconClock,
  IconHeart,
  IconHeartFilled,
  IconMapPin,
  IconRoute,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { trpc } from '~/lib/trcp';
import { css } from '../../../styled-system/css';

const accentColor = '#3bb6b6';

export default function Detail() {
  const { id } = useParams();
  const {
    data: shop,
    status,
    isError,
  } = trpc.shop.detail.useQuery(
    { id: id ?? '' },
    { enabled: id !== undefined },
  );

  const [favorite, setFavorite] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  if (status === 'pending') {
    return <p className={css({ p: '16px' })}>読み込み中...</p>;
  }

  if (isError && !shop) {
    return (
      <p className={css({ p: '16px' })}>店舗情報を取得できませんでした。</p>
    );
  }

  if (!shop) return null;

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      })}
    >
      {/* ヘッダー */}
      <div
        className={css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          px: '16px',
          pt: '4px',
        })}
      >
        <div
          className={css({
            flexShrink: 0,
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            bg: shop.cancelled ? '#9e9e9e' : '#7da7d9',
            overflow: 'hidden',
          })}
        >
          {shop.thumbnail && (
            <img
              src={shop.thumbnail}
              alt=""
              className={css({
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              })}
            />
          )}
        </div>

        <div
          className={css({
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 12px',
            fontSize: '13px',
            color: '#555555',
            pt: '6px',
          })}
        >
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconMapPin size={15} color={accentColor} />
            {shop.location}
          </span>
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconClock size={15} color={accentColor} />
            {shop.schedule.join('、')}
          </span>
        </div>

        <Link
          to="/"
          aria-label="閉じる"
          className={css({
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: '2px',
            color: '#999999',
          })}
        >
          <IconX size={24} />
        </Link>
      </div>

      {/* タイトル */}
      <div className={css({ px: '16px', mt: '8px' })}>
        <h1
          className={css({
            fontWeight: 'bold',
            fontSize: '18px',
            lineHeight: 1.3,
            color: '#222222',
          })}
        >
          {shop.name}
        </h1>
        <p className={css({ fontSize: '12px', color: '#888888', mt: '2px' })}>
          {shop.organization}
        </p>
      </div>

      {/* 画像カルーセル */}
      {shop.images.length > 0 && (
        <div className={css({ mt: '12px' })}>
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              setImageIndex(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className={css({
              display: 'flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              px: '16px',
              gap: '12px',
              '&::-webkit-scrollbar': { display: 'none' },
            })}
          >
            {shop.images.map((src, i) => (
              <img
                // biome-ignore lint/suspicious/noArrayIndexKey: モック画像のため index で十分
                key={i}
                src={src}
                alt={`${shop.name} の画像 ${i + 1}`}
                className={css({
                  flex: '0 0 100%',
                  scrollSnapAlign: 'center',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  bg: '#eeeeee',
                })}
              />
            ))}
          </div>

          {shop.images.length > 1 && (
            <div
              className={css({
                display: 'flex',
                justifyContent: 'center',
                gap: '6px',
                mt: '8px',
              })}
            >
              {shop.images.map((_, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: ドットは固定個数のため index で十分
                  key={i}
                  className={css({
                    width: '7px',
                    height: '7px',
                    borderRadius: '999px',
                    bg: i === imageIndex ? accentColor : '#cfd8d8',
                  })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 説明文 */}
      <p
        className={css({
          px: '16px',
          mt: '16px',
          fontSize: '13px',
          lineHeight: 1.7,
          color: '#444444',
        })}
      >
        {shop.description}
      </p>

      {/* 下部バー（ルート / お気に入り） */}
      <div
        className={css({
          position: 'sticky',
          bottom: 0,
          mt: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '16px',
          px: '16px',
          py: '12px',
          bg: 'sheet.background',
        })}
      >
        <button
          type="button"
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            px: '16px',
            py: '8px',
            borderRadius: '999px',
            border: '1px solid',
            borderColor: accentColor,
            color: accentColor,
            fontSize: '14px',
            bg: '#ffffff',
            cursor: 'pointer',
          })}
        >
          <IconRoute size={18} />
          ルート
        </button>
        <button
          type="button"
          aria-label={favorite ? 'お気に入りから削除' : 'お気に入りに追加'}
          aria-pressed={favorite}
          onClick={() => setFavorite((v) => !v)}
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: '2px',
            color: favorite ? '#ff6b81' : '#cccccc',
            cursor: 'pointer',
          })}
        >
          {favorite ? <IconHeartFilled size={30} /> : <IconHeart size={30} />}
        </button>
      </div>
    </div>
  );
}
