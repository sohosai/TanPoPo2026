import { IconClock, IconMapPin, IconRoute, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMap } from '~/components/features/Map/MapController';
import FavoriteButton from '~/components/features/Shop/FavoriteButton';
import { useFavorites } from '~/lib/favorites';
import { usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trcp';
import { css } from '../../../styled-system/css';
import { token } from '../../../styled-system/tokens';

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

  const { isFavorite, toggle } = useFavorites();
  const { formatShopLocation, byId: placesById } = usePlaces();
  const { focusPlace, highlight } = useMap();
  const favorite = id !== undefined && isFavorite(id);
  const [imageIndex, setImageIndex] = useState(0);

  // 詳細を開いたら、紐づく場所へ地図をフォーカスする（シートの外の地図を統一APIで操作）。
  const primaryPlaceId = shop?.locations[0]?.placeId;
  useEffect(() => {
    if (!primaryPlaceId) return;
    const place = placesById.get(primaryPlaceId);
    if (place) focusPlace(place);
    return () => highlight(null);
  }, [primaryPlaceId, placesById, focusPlace, highlight]);

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
        animation: 'detailEnter 0.28s ease-out',
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
            bg: shop.cancelled ? 'surface.muted' : '#7da7d9',
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
            color: 'fg.muted',
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
            <IconMapPin size={15} color={token('colors.accent')} />
            {formatShopLocation(shop)}
          </span>
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconClock size={15} color={token('colors.accent')} />
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
            color: 'fg.subtle',
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
            color: 'fg.strong',
          })}
        >
          {shop.name}
        </h1>
        <p className={css({ fontSize: '12px', color: 'fg.subtle', mt: '2px' })}>
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
                    bg: i === imageIndex ? 'accent' : '#cfd8d8',
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
          color: 'fg',
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
            borderColor: 'accent',
            color: 'accent',
            fontSize: '14px',
            bg: 'surface',
            cursor: 'pointer',
          })}
        >
          <IconRoute size={18} />
          ルート
        </button>
        <FavoriteButton
          active={favorite}
          onToggle={() => id !== undefined && toggle(id)}
          size={30}
        />
      </div>
    </div>
  );
}
