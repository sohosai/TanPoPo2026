import { IconClock, IconMapPin, IconRoute, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router';
import { useMap } from '~/components/features/Map/MapController';
import CarouselButton from '~/components/features/Shop/CarouselButton';
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
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handlePrev = () => {
    const el = carouselRef.current;
    if (!el) return;
    const nextIndex = Math.max(0, imageIndex - 1);
    el.scrollTo({
      left: nextIndex * el.clientWidth,
      behavior: 'smooth',
    });
  };

  const handleNext = () => {
    const el = carouselRef.current;
    if (!el || !shop) return;
    const nextIndex = Math.min(shop.images.length - 1, imageIndex + 1);
    el.scrollTo({
      left: nextIndex * el.clientWidth,
      behavior: 'smooth',
    });
  };

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

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
            color: '#204262',
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
            <IconMapPin size={15} color="#204262" />
            {formatShopLocation(shop)}
          </span>
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            })}
          >
            <IconClock size={15} color="#204262" />
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
            fontWeight: 500,
            fontSize: '18px',
            lineHeight: 1.3,
            color: '#204262',
          })}
        >
          {shop.name}
        </h1>
        <p
          className={css({
            fontWeight: 400,
            fontSize: '12px',
            color: '#204262',
            mt: '2px',
          })}
        >
          {shop.organization}
        </p>
      </div>

      {/* 画像カルーセル */}
      {shop.images.length > 0 && (
        <div className={css({ mt: '12px' })}>
          <div className={css({ position: 'relative' })}>
            <div
              ref={carouselRef}
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
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: モック画像のため index で十分
                  key={i}
                  className={css({
                    flex: '0 0 100%',
                    scrollSnapAlign: 'center',
                    width: '100%',
                    aspectRatio: '4 / 3',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    bg: '#eeeeee',
                  })}
                >
                  <img
                    src={src}
                    alt=""
                    className={css({
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'blur(4px) brightness(0.85)',
                      opacity: 1.0,
                      borderRadius: '8px',
                    })}
                  />
                  <img
                    src={src}
                    alt={`${shop.name} の画像 ${i + 1}`}
                    onClick={() => setIsViewerOpen(true)}
                    className={css({
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    })}
                  />
                </div>
              ))}
            </div>

            {/* 左右切り替えボタン */}
            {imageIndex > 0 && (
              <CarouselButton
                direction="left"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              />
            )}

            {imageIndex < shop.images.length - 1 && (
              <CarouselButton
                direction="right"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              />
            )}
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
          color: '#204262',
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

      {/* 画像ビューワーモード (Lightbox) */}
      {isViewerOpen && isMounted && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setIsViewerOpen(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={css({
            position: 'fixed',
            inset: 0,
            bg: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
          })}
        >
          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsViewerOpen(false);
            }}
            className={css({
              position: 'absolute',
              top: '24px',
              right: '24px',
              zIndex: 1010,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              bg: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background-color 0.2s, transform 0.1s',
              '&:hover': {
                bg: 'rgba(255, 255, 255, 0.4)',
              },
              '&:active': {
                transform: 'scale(0.92)',
              },
            })}
            aria-label="閉じる"
          >
            <IconX size={24} />
          </button>

          {/* ビューワー内の画像表示エリア */}
          <div
            className={css({
              position: 'relative',
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: '16px',
            })}
          >
            <img
              src={shop.images[imageIndex]}
              alt={`${shop.name} の拡大画像`}
              onClick={(e) => e.stopPropagation()}
              className={css({
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              })}
            />

            {/* 左右切り替えボタン */}
            {imageIndex > 0 && (
              <CarouselButton
                direction="left"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              />
            )}

            {imageIndex < shop.images.length - 1 && (
              <CarouselButton
                direction="right"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
