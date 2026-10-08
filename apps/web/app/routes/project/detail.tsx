import { IconCalendarEvent, IconMap, IconMapPin } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import DetailCloseButton from '~/components/features/Detail/DetailCloseButton';
import {
  detailEnterStyles,
  detailExitStyles,
  useDetailClose,
} from '~/components/features/Detail/useDetailClose';
import { boothCenter } from '~/components/features/Map/booths';
import {
  BOOTH_FOCUS_ZOOM,
  useMap,
} from '~/components/features/Map/MapController';
import CarouselButton from '~/components/features/Project/CarouselButton';
import FavoriteButton from '~/components/features/Project/FavoriteButton';
import ImageViewer from '~/components/features/Project/ImageViewer';
import {
  badgeClass,
  CATEGORY_COLOR_CLASS,
  formatSchedule,
} from '~/components/features/Project/labels';
import ProjectIcon from '~/components/features/Project/ProjectIcon';
import ProjectLinks from '~/components/features/Project/ProjectLinks';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import { useFavorites } from '~/lib/favorites';
import { formatLocation, usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../styled-system/css';

/** 場所・日程。未確定の項目は「未定」と表示する。 */
function ProjectFacts({
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
        borderRadius: 'xl',
        bg: 'border.subtle',
        '& > div': {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          px: '16px',
          py: '12px',
          fontSize: 'md',
        },
        '& > div + div': {
          borderTop: 'token(borderWidths.divider) solid token(colors.surface)',
        },
        '& dt': {
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          w: '64px',
          flexShrink: 0,
          color: 'fg.subtle',
          fontSize: 'xs',
          '& > svg': { flexShrink: 0, color: 'accent' },
        },
        '& dd': { flex: 1, minWidth: 0, color: 'fg.strong', fontWeight: 500 },
      })}
    >
      <div>
        <dt>
          <IconMapPin size={18} />
          <span className={css({ textBox: 'trim-both cap alphabetic' })}>
            場所
          </span>
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
          <IconCalendarEvent size={18} />
          <span className={css({ textBox: 'trim-both cap alphabetic' })}>
            日程
          </span>
        </dt>
        <dd>{schedule || '未定'}</dd>
      </div>
    </dl>
  );
}

export default function Detail() {
  const { number } = useParams();
  const {
    data: project,
    status,
    isError,
  } = trpc.project.detail.useQuery(
    { number: number ?? '' },
    { enabled: number !== undefined },
  );

  const { isFavorite, toggle } = useFavorites();
  const { byId: placesById } = usePlaces();
  const { flyTo, focusPoint, highlight } = useMap();
  const panel = useMapPanel();
  const favorite = project !== undefined && isFavorite(project.id);
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { closing, close } = useDetailClose();

  const scrollCarouselTo = (index: number, behavior: ScrollBehavior) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior });
  };

  // 詳細を開いたら、紐づく場所へ地図をフォーカスする（シートの外の地図を統一APIで操作）。
  // 屋外ブースはテント列の代表点ではなく、テントそのものの位置へ、形が見えるところまで寄せる。
  // テントは地図上で枠線で強調されるため、テントを隠してしまうピンは立てない。
  const primaryLocation = project?.locations[0];
  const primaryPlace = placesById.get(primaryLocation?.placeId ?? '');
  const boothPoint = boothCenter(primaryPlace, primaryLocation?.room);
  const placePoint = primaryPlace?.point;
  const focusProject = useCallback(() => {
    if (boothPoint) flyTo(boothPoint, { zoom: BOOTH_FOCUS_ZOOM });
    else if (placePoint) focusPoint(placePoint);
  }, [boothPoint, placePoint, flyTo, focusPoint]);
  useEffect(() => {
    focusProject();
    return () => highlight(null);
  }, [focusProject, highlight]);

  if (status === 'pending') {
    return <p className={css({ p: '16px' })}>読み込み中...</p>;
  }

  if (isError && !project) {
    return (
      <p className={css({ p: '16px' })}>店舗情報を取得できませんでした。</p>
    );
  }

  if (!project) return null;

  const showOnMap = () => {
    focusProject();
    panel.collapse();
  };

  return (
    <div
      className={cx(
        css({
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }),
        closing ? detailExitStyles : detailEnterStyles,
      )}
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
        <ProjectIcon project={project} size={48} />

        <div className={css({ flex: 1, minWidth: 0 })}>
          <h1
            className={css({
              fontSize: '2xl',
              fontWeight: 700,
              lineHeight: 1.35,
              color: 'fg.strong',
              wordBreak: 'break-all',
            })}
          >
            {project.name}
          </h1>
          <p
            className={css({
              mt: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'sm',
              color: 'fg.subtle',
            })}
          >
            <span
              className={cx(
                badgeClass,
                css({ flexShrink: 0, fontSize: '2xs' }),
                CATEGORY_COLOR_CLASS[project.category],
              )}
            >
              {project.category}
            </span>
            <span className={css({ truncate: true })}>
              {project.organization}
            </span>
          </p>
        </div>

        <DetailCloseButton closing={closing} onClick={close} />
      </header>

      {project.cancelled && (
        <p
          className={css({
            mx: '16px',
            mt: '12px',
            px: '12px',
            py: '8px',
            borderRadius: 'lg',
            bg: 'fg.strong',
            color: 'surface',
            fontSize: 'sm',
            fontWeight: 700,
          })}
        >
          この企画は中止になりました
        </p>
      )}

      <ProjectFacts
        locations={[
          // 屋外ブースは場所名だけを出すため、同じ表示になる場所は1行にまとめる。
          ...new Set(
            project.locations.map((location) => {
              const label = formatLocation(
                placesById.get(location.placeId),
                location.room,
              );
              // 日によって場所が変わる企画では、その場所で実施する日を添える。
              return location.days &&
                location.days.length < project.schedule.length
                ? `${label}（${formatSchedule(location.days)}）`
                : label;
            }),
          ),
        ]}
        schedule={formatSchedule(project.schedule)}
      />

      {project.links.length > 0 && (
        <div className={css({ px: '16px', mt: '16px' })}>
          <ProjectLinks links={project.links} />
        </div>
      )}

      {/* 画像カルーセル */}
      {project.images.length > 0 && (
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
              {project.images.map((image, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: 同じ画像が複数登録されることがあり URL は一意でない
                  key={i}
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  aria-label={`${project.name} の画像 ${i + 1} を拡大`}
                  className={css({
                    flex: '0 0 100%',
                    scrollSnapAlign: 'center',
                    aspectRatio: '4 / 3',
                    overflow: 'hidden',
                    borderRadius: 'xl',
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
            {imageIndex < project.images.length - 1 && (
              <CarouselButton
                direction="right"
                onClick={() => scrollCarouselTo(imageIndex + 1, 'smooth')}
              />
            )}

            {project.images.length > 1 && (
              <span
                className={css({
                  position: 'absolute',
                  right: '28px',
                  bottom: '12px',
                  px: '8px',
                  py: '2px',
                  borderRadius: 'full',
                  bg: 'overlay.scrim',
                  color: 'surface',
                  fontSize: '2xs',
                  fontWeight: 500,
                  pointerEvents: 'none',
                })}
              >
                {imageIndex + 1} / {project.images.length}
              </span>
            )}
          </div>
        </div>
      )}

      <section className={css({ px: '16px', mt: '24px', pb: '24px' })}>
        <h2
          className={css({
            fontSize: 'lg',
            fontWeight: 700,
            color: 'accent.text',
          })}
        >
          企画紹介
        </h2>
        <p
          className={css({
            mt: '8px',
            fontSize: 'lg',
            lineHeight: 1.8,
            color: 'fg',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          })}
        >
          {project.description}
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
          borderTop:
            'token(borderWidths.divider) solid token(colors.border.subtle)',
        })}
      >
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
            borderRadius: 'full',
            bg: 'accent.text',
            boxShadow: 'pop',
            color: 'surface',
            fontSize: 'lg',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'transform 0.1s, box-shadow 0.1s',
            _active: { transform: 'scale(0.98)' },
          })}
        >
          <IconMap size={20} />
          <span className={css({ textBox: 'trim-both cap alphabetic' })}>
            地図で場所を見る
          </span>
        </button>
        <FavoriteButton
          active={favorite}
          onToggle={() => toggle(project.id)}
          size={22}
          className={css({
            flexShrink: 0,
            w: '48px',
            h: '48px',
            borderRadius: 'full',
            bg: 'border.subtle',
          })}
        />
      </div>

      {viewerIndex !== null && (
        <ImageViewer
          images={project.images}
          initialIndex={viewerIndex}
          title={project.name}
          onClose={(index) => {
            setViewerIndex(null);
            scrollCarouselTo(index, 'instant');
          }}
        />
      )}
    </div>
  );
}
