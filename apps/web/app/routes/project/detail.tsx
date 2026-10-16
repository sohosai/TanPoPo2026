import {
  IconCalendarEvent,
  IconClock,
  IconMap,
  IconMapPin,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import DetailCloseButton from '~/components/features/Detail/DetailCloseButton';
import {
  detailEnterStyles,
  detailExitStyles,
  lastListUrl,
  useDetailClose,
} from '~/components/features/Detail/useDetailClose';
import { useProjectFocus } from '~/components/features/Map/useProjectFocus';
import CarouselButton from '~/components/features/Project/CarouselButton';
import FavoriteButton from '~/components/features/Project/FavoriteButton';
import ImageViewer from '~/components/features/Project/ImageViewer';
import {
  CATEGORY_DOT_CLASS,
  formatPerformance,
  formatSchedule,
} from '~/components/features/Project/labels';
import ProjectIcon from '~/components/features/Project/ProjectIcon';
import ProjectLinks from '~/components/features/Project/ProjectLinks';
import { useSnapCarousel } from '~/components/features/Project/useSnapCarousel';
import { useMapPanel } from '~/components/layouts/MapPanel/mapPanel';
import {
  peekCloseStyles,
  peekFadeStyles,
  peekIconStyles,
  peekTitleStyles,
} from '~/components/layouts/MapPanel/peekMorph';

import { useFavorites } from '~/lib/favorites';
import { formatLocation, usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../styled-system/css';

/** 場所と、日程またはステージの出演時間。出演時間は日も含むため、あれば日程の代わりに出す。未確定の項目は「未定」と表示する。 */
function ProjectFacts({
  locations,
  schedule,
  performances,
}: {
  locations: string[];
  schedule: string;
  performances: string[];
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
        <dd>{locations.join(', ') || '未定'}</dd>
      </div>
      {performances.length > 0 ? (
        <div>
          <dt>
            <IconClock size={18} />
            <span className={css({ textBox: 'trim-both cap alphabetic' })}>
              時間
            </span>
          </dt>
          <dd>
            {performances.map((label) => (
              <span key={label} className={css({ display: 'block' })}>
                {label}
              </span>
            ))}
          </dd>
        </div>
      ) : (
        <div>
          <dt>
            <IconCalendarEvent size={18} />
            <span className={css({ textBox: 'trim-both cap alphabetic' })}>
              日程
            </span>
          </dt>
          <dd>{schedule || '未定'}</dd>
        </div>
      )}
    </dl>
  );
}

/** 企画紹介。紹介文が未登録の企画では見出しごと出さない。 */
function ProjectDescription({ text }: { text: string }) {
  if (!text) return null;
  return (
    <section className={css({ px: '16px', mt: '24px' })}>
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
        })}
      >
        {text}
      </p>
    </section>
  );
}

export default function Detail() {
  const { number } = useParams();
  const { data: projects, status } = trpc.project.list.useQuery();
  const project = projects?.find((p) => p.number === number);

  const { isFavorite, toggle } = useFavorites();
  const { byId: placesById } = usePlaces();
  const panel = useMapPanel();
  const favorite = project !== undefined && isFavorite(project.id);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const carousel = useSnapCarousel(project?.images.length ?? 0);
  const { to, closing, close } = useDetailClose(lastListUrl());

  // 直前の段にかかわらず、地図と詳細の両方が見える中段で開く。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 企画が変わったときだけ開く
  useEffect(() => {
    panel.raise();
  }, [number]);

  // 詳細を開いたら、紐づく場所へ地図をフォーカスする（シートの外の地図を統一APIで操作）。
  const focusProject = useProjectFocus(project);

  useEffect(() => {
    if (project) {
      document.title = `${project.name} | 雙峰祭 企画検索システム`;
      return () => {
        document.title = '雙峰祭 企画検索システム';
      };
    }
  }, [project]);

  if (status === 'pending') {
    return <p className={css({ p: '16px' })}>読み込み中...</p>;
  }

  if (!project) {
    return (
      <p className={css({ p: '16px' })}>
        {status === 'error'
          ? '店舗情報を取得できませんでした。'
          : '店舗が見つかりませんでした。'}
      </p>
    );
  }

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
      {/* 最小段へ寄るにつれて、アイコン・企画名・バツを最小段のカードの形へ寄せる */}
      <header
        data-sheet-morph
        className={css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          px: '16px',
          // 上の余白はシートの取っ手が重なる分を含む。
          pt: '24px',
        })}
      >
        <ProjectIcon project={project} size={48} className={peekIconStyles} />

        <div className={css({ flex: 1, minWidth: 0 })}>
          <h1
            className={cx(
              css({
                fontSize: '2xl',
                fontWeight: 700,
                lineHeight: 1.35,
                color: 'fg.strong',
                '[data-peek] &': { truncate: true },
              }),
              peekTitleStyles,
            )}
          >
            {project.name}
          </h1>
          <p
            className={cx(
              css({
                mt: '2px',
                fontSize: 'sm',
                color: 'fg.subtle',
              }),
              peekFadeStyles,
            )}
          >
            {/* 分類はアイコンの地の色でも示すので、タグにせず団体名の前に色の点と名前で添える */}
            <span
              className={css({
                color: 'fg.muted',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              })}
            >
              <span
                className={cx(
                  css({
                    display: 'inline-block',
                    w: '8px',
                    h: '8px',
                    mr: '5px',
                    borderRadius: 'full',
                    verticalAlign: '1px',
                  }),
                  CATEGORY_DOT_CLASS[project.category],
                )}
              />
              {project.category}
              <span className={css({ mx: '6px', color: 'fg.subtle' })}>·</span>
            </span>
            {project.organization}
          </p>
        </div>

        <DetailCloseButton
          to={to}
          closing={closing}
          onClick={close}
          className={peekCloseStyles}
        />
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
        performances={project.performances.map(
          (performance) =>
            `${formatPerformance(performance)} ${placesById.get(performance.placeId)?.name ?? ''}`,
        )}
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
              ref={carousel.ref}
              {...carousel.handlers}
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
                  onClick={() => carousel.goToEdge() || setViewerIndex(i)}
                  aria-label={`${project.name} の画像 ${i + 1} を拡大`}
                  className={css({
                    flex: '0 0 100%',
                    scrollSnapAlign: 'center',
                    scrollSnapStop: 'always',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    aspectRatio: '4 / 3',
                    cursor: carousel.edge ? 'pointer' : 'zoom-in',
                  })}
                >
                  <img
                    src={image.src}
                    srcSet={image.srcSet}
                    sizes="100vw"
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    // 枠ではなく画像そのものを角丸にし、縦横比が枠と違っても帯状の余白を作らない。
                    className={css({
                      maxW: '100%',
                      maxH: '100%',
                      borderRadius: 'xl',
                    })}
                  />
                </button>
              ))}
            </div>

            {carousel.index > 0 && (
              <CarouselButton
                direction="left"
                active={carousel.edge === 'prev'}
                onClick={() => carousel.goTo(carousel.index - 1)}
              />
            )}
            {carousel.index < project.images.length - 1 && (
              <CarouselButton
                direction="right"
                active={carousel.edge === 'next'}
                onClick={() => carousel.goTo(carousel.index + 1)}
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
                {carousel.index + 1} / {project.images.length}
              </span>
            )}
          </div>
        </div>
      )}

      <ProjectDescription text={project.description} />

      {/* 実行委員会の問い合わせ対応で企画を特定するためのもので、来場者向けの情報ではないため目立たせない。 */}
      <p
        className={css({
          px: '16px',
          mt: '24px',
          pb: '24px',
          fontSize: '2xs',
          color: 'fg.subtle',
          fontVariantNumeric: 'tabular-nums',
        })}
      >
        企画番号 {project.number}
      </p>

      {/* 下部の操作バー。シートが動いているあいだは画面の下端に留める（BottomSheet が扱う） */}
      <div
        data-sheet-bottom
        data-sheet-morph
        className={cx(
          peekFadeStyles,
          css({
            position: 'sticky',
            bottom: 0,
            mt: 'auto',
            display: 'flex',
            // 見えている範囲の下端に貼り付くため、最小段では企画名の行を覆ってしまう。
            '[data-peek] &': { visibility: 'hidden' },
            alignItems: 'center',
            gap: '12px',
            px: '16px',
            pt: '12px',
            pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            bg: 'sheet.background',
            borderTop:
              'token(borderWidths.divider) solid token(colors.border.subtle)',
          }),
        )}
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
            bg: 'surface',
            boxShadow: 'card',
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
            carousel.goTo(index, 'instant');
          }}
        />
      )}
    </div>
  );
}
