import {
  IconCalendarEvent,
  IconMap,
  IconMapPin,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { boothCenter } from '~/components/features/Map/booths';
import {
  BOOTH_FOCUS_ZOOM,
  useMap,
} from '~/components/features/Map/MapController';
import CarouselButton from '~/components/features/Shop/CarouselButton';
import FavoriteButton from '~/components/features/Shop/FavoriteButton';
import ImageViewer from '~/components/features/Shop/ImageViewer';
import {
  CATEGORY_COLOR_CLASS,
  formatSchedule,
} from '~/components/features/Shop/labels';
import ShopIcon from '~/components/features/Shop/ShopIcon';
import ShopLinks from '~/components/features/Shop/ShopLinks';
import { useBottomSheet } from '~/components/layouts/BottomSheet/BottomSheet';
import { useFavorites } from '~/lib/favorites';
import { formatLocation, usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trcp';
import { css, cx } from '../../../styled-system/css';

/** 場所・日程。未確定の項目は「未定」と表示する。 */
function ShopFacts({
  locations,
  schedule,
}: {
  locations: string[];
  schedule: string;
}) {
  return (
    <dl
      className={css({
        mx: '16px',
        mt: '16px',
        borderRadius: '12px',
        bg: 'border.subtle',
        '& > div': {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          px: '14px',
          py: '10px',
          fontSize: '14px',
        },
        '& > div + div': {
          borderTop: '1px solid token(colors.surface)',
        },
        '& dt': {
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          w: '64px',
          flexShrink: 0,
          color: 'fg.subtle',
          fontSize: '12px',
        },
        '& dd': { flex: 1, minWidth: 0, color: 'fg.strong', fontWeight: 500 },
      })}
    >
      <div>
        <dt>
          <IconMapPin size={16} />
          場所
        </dt>
        <dd>
          {locations.length > 0
            ? locations.map((label) => (
                <span key={label} className={css({ display: 'block' })}>
                  {label}
                </span>
              ))
            : '未定'}
        </dd>
      </div>
      <div>
        <dt>
          <IconCalendarEvent size={16} />
          日程
        </dt>
        <dd>{schedule || '未定'}</dd>
      </div>
    </dl>
  );
}

export default function Detail() {
  const { number } = useParams();
  const {
    data: shop,
    status,
    isError,
  } = trpc.shop.detail.useQuery(
    { number: number ?? '' },
    { enabled: number !== undefined },
  );

  const { isFavorite, toggle } = useFavorites();
  const { byId: placesById } = usePlaces();
  const { flyTo, focusPoint, highlight } = useMap();
  const sheet = useBottomSheet();
  const favorite = shop !== undefined && isFavorite(shop.id);
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarouselTo = (index: number, behavior: ScrollBehavior) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior });
  };

  // 詳細を開いたら、紐づく場所へ地図をフォーカスする（シートの外の地図を統一APIで操作）。
  // 屋外ブースはテント列の代表点ではなく、テントそのものの位置へ、形が見えるところまで寄せる。
  // テントは地図上で枠線で強調されるため、テントを隠してしまうピンは立てない。
  const primaryLocation = shop?.locations[0];
  const primaryPlace = placesById.get(primaryLocation?.placeId ?? '');
  const boothPoint = boothCenter(primaryPlace, primaryLocation?.room);
  const placePoint = primaryPlace?.point;
  const focusShop = useCallback(() => {
    if (boothPoint) flyTo(boothPoint, { zoom: BOOTH_FOCUS_ZOOM });
    else if (placePoint) focusPoint(placePoint);
  }, [boothPoint, placePoint, flyTo, focusPoint]);
  useEffect(() => {
    focusShop();
    return () => highlight(null);
  }, [focusShop, highlight]);

  if (status === 'pending') {
    return <p className={css({ p: '16px' })}>読み込み中...</p>;
  }

  if (isError && !shop) {
    return (
      <p className={css({ p: '16px' })}>店舗情報を取得できませんでした。</p>
    );
  }

  if (!shop) return null;

  const showOnMap = () => {
    focusShop();
    sheet.collapse();
  };

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        animation: 'detailEnter 0.28s ease-out',
      })}
    >
      {/* シートを畳んだ状態でもこのヘッダーだけは見えるため、企画を識別できる情報を集める */}
      <header
        className={css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          px: '16px',
          pt: '2px',
        })}
      >
        <ShopIcon shop={shop} size={48} />

        <div className={css({ flex: 1, minWidth: 0 })}>
          <h1
            className={css({
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.35,
              color: 'fg.strong',
              wordBreak: 'break-all',
            })}
          >
            {shop.name}
          </h1>
          <p
            className={css({
              mt: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'fg.subtle',
            })}
          >
            <span
              className={cx(
                css({
                  flexShrink: 0,
                  px: '6px',
                  py: '1px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                }),
                CATEGORY_COLOR_CLASS[shop.category],
              )}
            >
              {shop.category}
            </span>
            <span className={css({ truncate: true })}>{shop.organization}</span>
          </p>
        </div>

        <Link
          to="/"
          aria-label="閉じる"
          className={css({
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            w: '36px',
            h: '36px',
            borderRadius: '999px',
            bg: 'border.subtle',
            color: 'fg.muted',
            _active: { bg: 'border' },
          })}
        >
          <IconX size={20} />
        </Link>
      </header>

      {shop.cancelled && (
        <p
          className={css({
            mx: '16px',
            mt: '12px',
            px: '12px',
            py: '8px',
            borderRadius: '8px',
            bg: 'fg.strong',
            color: 'surface',
            fontSize: '13px',
            fontWeight: 700,
          })}
        >
          この企画は中止になりました
        </p>
      )}

      <ShopFacts
        locations={[
          // 屋外ブースは場所名だけを出すため、同じ表示になる場所は1行にまとめる。
          ...new Set(
            shop.locations.map((location) => {
              const label = formatLocation(
                placesById.get(location.placeId),
                location.room,
              );
              // 日によって場所が変わる企画では、その場所で実施する日を添える。
              return location.days &&
                location.days.length < shop.schedule.length
                ? `${label}（${formatSchedule(location.days)}）`
                : label;
            }),
          ),
        ]}
        schedule={formatSchedule(shop.schedule)}
      />

      {shop.links.length > 0 && (
        <div className={css({ px: '16px', mt: '16px' })}>
          <ShopLinks links={shop.links} />
        </div>
      )}

      {/* 画像カルーセル */}
      {shop.images.length > 0 && (
        <div className={css({ mt: '20px' })}>
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
              {shop.images.map((image, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: 同じ画像が複数登録されることがあり URL は一意でない
                  key={i}
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  aria-label={`${shop.name} の画像 ${i + 1} を拡大`}
                  className={css({
                    flex: '0 0 100%',
                    scrollSnapAlign: 'center',
                    aspectRatio: '4 / 3',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    bg: 'border.subtle',
                    cursor: 'zoom-in',
                  })}
                >
                  <img
                    src={image.src}
                    srcSet={image.srcSet}
                    sizes="100vw"
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className={css({
                      w: '100%',
                      h: '100%',
                      objectFit: 'contain',
                    })}
                  />
                </button>
              ))}
            </div>

            {imageIndex > 0 && (
              <CarouselButton
                direction="left"
                onClick={() => scrollCarouselTo(imageIndex - 1, 'smooth')}
              />
            )}
            {imageIndex < shop.images.length - 1 && (
              <CarouselButton
                direction="right"
                onClick={() => scrollCarouselTo(imageIndex + 1, 'smooth')}
              />
            )}

            {shop.images.length > 1 && (
              <span
                className={css({
                  position: 'absolute',
                  right: '28px',
                  bottom: '12px',
                  px: '8px',
                  py: '2px',
                  borderRadius: '999px',
                  bg: 'rgba(0, 0, 0, 0.55)',
                  color: 'surface',
                  fontSize: '11px',
                  fontWeight: 500,
                  pointerEvents: 'none',
                })}
              >
                {imageIndex + 1} / {shop.images.length}
              </span>
            )}
          </div>
        </div>
      )}

      <section className={css({ px: '16px', mt: '24px', pb: '24px' })}>
        <h2
          className={css({
            fontSize: '15px',
            fontWeight: 700,
            color: 'fg.strong',
          })}
        >
          企画紹介
        </h2>
        <p
          className={css({
            mt: '8px',
            fontSize: '15px',
            lineHeight: 1.8,
            color: 'fg',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          })}
        >
          {shop.description}
        </p>
      </section>

      {/* 下部の操作バー */}
      <div
        className={css({
          position: 'sticky',
          bottom: 0,
          mt: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          px: '16px',
          pt: '12px',
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          bg: 'sheet.background',
          borderTop: '1px solid token(colors.border.subtle)',
        })}
      >
        <FavoriteButton
          active={favorite}
          onToggle={() => toggle(shop.id)}
          size={24}
          className={css({
            flexShrink: 0,
            w: '48px',
            h: '48px',
            borderRadius: '999px',
            border: '1px solid',
            borderColor: 'border',
          })}
        />
        <button
          type="button"
          onClick={showOnMap}
          className={css({
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            h: '48px',
            borderRadius: '999px',
            bg: 'accent.text',
            color: 'surface',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            _active: { opacity: 0.85 },
          })}
        >
          <IconMap size={20} />
          地図で場所を見る
        </button>
      </div>

      {viewerIndex !== null && (
        <ImageViewer
          images={shop.images}
          initialIndex={viewerIndex}
          title={shop.name}
          onClose={(index) => {
            setViewerIndex(null);
            scrollCarouselTo(index, 'instant');
          }}
        />
      )}
    </div>
  );
}
