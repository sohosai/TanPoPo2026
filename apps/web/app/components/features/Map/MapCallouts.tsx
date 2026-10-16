import { IconBroadcast, IconExternalLink } from '@tabler/icons-react';
import type { Project } from 'api';
import maplibregl from 'maplibre-gl';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { matchPath, useLocation } from 'react-router';
import ProjectIcon from '~/components/features/Project/ProjectIcon';
import { toAppPath, useOpenAppPath } from '~/lib/embed';
import { groupProjectsByPlace, usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../../styled-system/css';
import { boothCenter } from './booths';
import { AREA_MAX_ZOOM, DETAIL_ZOOM } from './campusStyle';
import calloutsJson from './data/callouts.json';
import type { LngLat } from './geo';
import { useMap } from './MapController';

type CalloutConfig = {
  /** 吹き出しを出す建物の placeId */
  buildings: string[];
  /** ステージの placeId → 配信ページとそのサムネイル */
  stages: Record<string, { url: string; thumbnail: string }>;
};

const config: CalloutConfig = calloutsJson;

// 建物の吹き出しで、中の企画を切り替える間隔。
const ROTATE_MS = 4000;

// 吹き出しを点からどれだけ上に浮かせるか（px）。ピン（建物の企画数・ステージ）の円には重ならず、
// 企画詳細で立てる強調のピン（高さ約 41px）があるときはその上に出す。テントはピンを立てないため近づける。
const CALLOUT_OFFSET = 16;
const SELECTED_OFFSET_ON_PIN = 46;
const SELECTED_OFFSET_ON_BOOTH = 8;

/** 企画詳細を開いている企画と、その吹き出しを出す位置。開いていなければ undefined。 */
function useSelectedProject(projects: Project[] | undefined) {
  const pathname = toAppPath(useLocation().pathname);
  const { byId: placesById, formatProjectLocation } = usePlaces();
  const number = matchPath('/project/:number', pathname)?.params.number;
  const project = projects?.find((p) => p.number === number);
  const location = project?.locations[0];
  const place = placesById.get(location?.placeId ?? '');
  if (!project || !place) return undefined;
  // 地図を寄せる位置（useProjectFocus）と同じく、屋外ブースはテントそのものを指す。
  const booth = boothCenter(place, location?.room);
  return {
    project,
    locationLabel: formatProjectLocation(project),
    point: booth ?? place.point,
    offset: booth ? SELECTED_OFFSET_ON_BOOTH : SELECTED_OFFSET_ON_PIN,
  };
}

/**
 * 主要な建物とステージの上に出す吹き出し。建物は中の企画を順に見せ、ステージは配信へのリンクを見せる。
 * 対象は data/callouts.json で決める。重なったときは、ステージ、JSON に書いた順の建物、の順に残す。
 * 企画詳細を開いている間は、その企画の場所に企画の吹き出しを出し、ステージの配信の吹き出しは出さない。
 */
export default function MapCallouts() {
  const { isReady, getMap } = useMap();
  const { data: projects } = trpc.project.list.useQuery();
  const { byId: placesById } = usePlaces();
  const openAppPath = useOpenAppPath();
  const selected = useSelectedProject(projects);

  // 建物ごとの企画。建物の中の複数の部屋で実施する企画は、1件として扱う。
  const projectsByBuilding = useMemo(() => {
    const byPlace = groupProjectsByPlace(
      (projects ?? []).filter(({ cancelled }) => !cancelled),
    );
    return new Map(
      config.buildings.map((placeId) => [
        placeId,
        [
          ...new Map(
            (byPlace.get(placeId) ?? []).map(({ project }) => [
              project.id,
              project,
            ]),
          ).values(),
        ],
      ]),
    );
  }, [projects]);

  // 吹き出しの出し入れは、子の吹き出しが地図に載った後（子の effect の後）に全体で決める。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 吹き出しの顔ぶれが変わったときにも並べ直す
  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;
    const layout = () => layoutCallouts(map);
    layout();
    map.on('move', layout);
    map.on('resize', layout);
    return () => {
      map.off('move', layout);
      map.off('resize', layout);
    };
  }, [isReady, getMap, placesById, projectsByBuilding, selected?.project]);

  // 選んだ企画の吹き出しを見失わないよう、その間は配信の吹き出しを出さない。
  const stages = selected ? [] : Object.entries(config.stages);

  return (
    <>
      {selected && (
        <MapCallout
          key={selected.project.id}
          point={selected.point}
          priority={-1}
          minZoom={0}
          offset={selected.offset}
        >
          <ProjectCallout
            project={selected.project}
            locationLabel={selected.locationLabel}
          />
        </MapCallout>
      )}
      {stages.map(([placeId, stream], i) => {
        const place = placesById.get(placeId);
        if (!place) return null;
        return (
          <MapCallout key={placeId} point={place.point} priority={i}>
            <StageCallout name={place.name} {...stream} />
          </MapCallout>
        );
      })}
      {config.buildings.map((placeId, i) => {
        const place = placesById.get(placeId);
        const buildingProjects = projectsByBuilding.get(placeId) ?? [];
        if (!place || buildingProjects.length === 0) return null;
        return (
          <MapCallout
            key={placeId}
            point={place.point}
            priority={stages.length + i}
            // 建物は数が多く地図を覆いやすいため、企画数が並ぶところまで寄ってから出す。
            minZoom={DETAIL_ZOOM}
          >
            <BuildingCallout
              name={place.name}
              projects={buildingProjects}
              onOpen={() => openAppPath(`/place/${placeId}`)}
            />
          </MapCallout>
        );
      })}
    </>
  );
}

const CALLOUT_SELECTOR = '[data-map-callout]';

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

/** 出せるズームの吹き出しを優先度の高い順に置き、先に置いたものと重なるものは隠す。 */
function layoutCallouts(map: maplibregl.Map) {
  const zoom = map.getZoom();
  const elements = [
    ...map.getContainer().querySelectorAll<HTMLElement>(CALLOUT_SELECTOR),
  ].sort((a, b) => Number(a.dataset.priority) - Number(b.dataset.priority));
  const placed: DOMRect[] = [];
  for (const el of elements) {
    const inZoom = zoom >= Number(el.dataset.minZoom);
    // 隠していると大きさが測れないため、見えない状態で一度置いてから測る。
    el.style.visibility = 'hidden';
    el.style.display = inZoom ? '' : 'none';
    const rect = el.getBoundingClientRect();
    const visible = inZoom && !placed.some((other) => overlaps(other, rect));
    if (visible) placed.push(rect);
    el.style.display = visible ? '' : 'none';
    el.style.visibility = '';
  }
}

/** 地図上の点の真上に、中身を吹き出しとして載せる。出し入れは MapCallouts がまとめて決める。 */
function MapCallout({
  point,
  priority,
  minZoom = AREA_MAX_ZOOM,
  offset = CALLOUT_OFFSET,
  children,
}: {
  point: LngLat;
  /** 小さいほど、重なったときに優先して残す */
  priority: number;
  /** これより寄ったら出す。既定は建物のピンが出るズーム */
  minZoom?: number;
  /** 点からどれだけ上に浮かせるか（px） */
  offset?: number;
  children: ReactNode;
}) {
  const { isReady, getMap } = useMap();
  const [element] = useState(() => {
    const el = document.createElement('div');
    el.dataset.mapCallout = '';
    // 位置が決まるまでは出さない。
    el.style.display = 'none';
    // 吹き出しの上から地図をドラッグ・ダブルクリックで拡大しないようにする。クリックは React が
    // ルートで受けるため止めず、地図のタップの側（CampusLayers）で吹き出しの上なら無視する。
    for (const type of ['mousedown', 'touchstart', 'dblclick']) {
      el.addEventListener(type, (e) => e.stopPropagation());
    }
    return el;
  });
  const [lng, lat] = point;

  useEffect(() => {
    element.dataset.priority = String(priority);
    element.dataset.minZoom = String(minZoom);
  }, [element, priority, minZoom]);

  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;
    const marker = new maplibregl.Marker({
      element,
      anchor: 'bottom',
      offset: [0, -offset],
    })
      .setLngLat([lng, lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [isReady, getMap, element, lng, lat, offset]);

  return createPortal(children, element);
}

const bubble = css({
  position: 'relative',
  display: 'block',
  p: '5px',
  borderRadius: '10px',
  bg: 'surface',
  color: 'fg',
  boxShadow: 'float',
  textAlign: 'left',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'transform 0.1s',
  _active: { transform: 'scale(0.96)' },
  // 下向きのしっぽ。
  _after: {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: '50%',
    ml: '-7px',
    borderWidth: '7px 7px 0',
    borderStyle: 'solid',
    borderColor: 'token(colors.surface) transparent transparent',
  },
});

const calloutTitle = css({
  fontSize: '2xs',
  fontWeight: 700,
  color: 'accent.text',
  lineHeight: 1.3,
  truncate: true,
});

// ステージ名は長いもの（大学会館ステージ（講堂））があるため、2行まで折り返す。
const stageTitle = css({ whiteSpace: 'normal', lineClamp: 2 });

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 建物名と、中の企画を一定の間隔でランダムな順に送り出す吹き出し。 */
function BuildingCallout({
  name,
  projects,
  onOpen,
}: {
  name: string;
  projects: Project[];
  onOpen: () => void;
}) {
  const order = useMemo(() => shuffled(projects), [projects]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (order.length < 2) return;
    let timer: ReturnType<typeof setTimeout>;
    // 吹き出しどうしが一斉に切り替わらないよう、最初の切り替えの時刻をずらす。
    const next = (delay: number) => {
      timer = setTimeout(() => {
        setIndex((i) => (i + 1) % order.length);
        next(ROTATE_MS);
      }, delay);
    };
    next(ROTATE_MS / 2 + Math.random() * ROTATE_MS);
    return () => clearTimeout(timer);
  }, [order]);

  const project = order[index % order.length];
  if (!project) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${name}の企画一覧`}
      className={css({ display: 'block', w: '144px' })}
    >
      <span className={bubble}>
        <span
          className={css({
            display: 'flex',
            justifyContent: 'space-between',
            gap: '4px',
            px: '2px',
          })}
        >
          <span className={calloutTitle}>{name}</span>
          <span className={css({ fontSize: '2xs', color: 'fg.subtle' })}>
            {projects.length}企画
          </span>
        </span>
        {/* 次の企画を下から送り出す。高さを固定して、送り出す間も吹き出しの大きさを変えない。 */}
        <span
          className={css({
            display: 'block',
            h: '26px',
            mt: '2px',
            overflow: 'hidden',
          })}
        >
          <span
            key={project.id}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              h: '26px',
              animation: 'tickerIn 0.4s ease-out',
              _motionReduce: { animation: 'none' },
            })}
          >
            <ProjectIcon project={project} size={24} />
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 700,
                color: 'fg.strong',
                truncate: true,
              })}
            >
              {project.name}
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}

/** 企画詳細を開いている企画のアイコン・名前・場所。押しても何も開かない（詳細はすでに開いている）。 */
function ProjectCallout({
  project,
  locationLabel,
}: {
  project: Project;
  locationLabel: string;
}) {
  return (
    <div
      className={cx(
        bubble,
        css({
          maxW: '220px',
          p: '6px',
          cursor: 'default',
          _active: { transform: 'none' },
          // 地図の上で目に留まるよう、選択中のテント・建物と同じアクセント色の枠で囲む。
          outline: '2px solid token(colors.accent)',
          animation: 'detailEnter 0.2s ease-out',
          _motionReduce: { animation: 'none' },
        }),
      )}
    >
      {/* bubble の display: block と競合しないよう、横並びは内側の要素で組む。 */}
      <span
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pr: '4px',
        })}
      >
        <ProjectIcon project={project} size={36} />
        <span className={css({ minW: 0 })}>
          <span
            className={css({
              display: 'block',
              fontSize: 'xs',
              fontWeight: 700,
              lineHeight: 1.35,
              color: 'fg.strong',
              lineClamp: 2,
            })}
          >
            {project.name}
          </span>
          {locationLabel && (
            <span
              className={css({
                display: 'block',
                mt: '1px',
                fontSize: '2xs',
                color: 'fg.subtle',
                truncate: true,
              })}
            >
              {locationLabel}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}

/** ステージ名と配信のサムネイル。押すと配信ページを新しいタブで開く。 */
function StageCallout({
  name,
  url,
  thumbnail,
}: {
  name: string;
  url: string;
  thumbnail: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name}の配信を見る`}
      className={css({ display: 'block', w: '128px' })}
    >
      <span className={bubble}>
        <span
          className={css({
            position: 'relative',
            display: 'block',
            aspectRatio: '16 / 9',
            borderRadius: '8px',
            overflow: 'hidden',
            bg: 'border.subtle',
          })}
        >
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className={css({ w: '100%', h: '100%', objectFit: 'cover' })}
          />
          <span
            className={css({
              position: 'absolute',
              top: '4px',
              left: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              px: '5px',
              py: '1px',
              borderRadius: '4px',
              bg: 'sns.youtube',
              color: 'white',
              fontSize: '2xs',
              fontWeight: 700,
            })}
          >
            <IconBroadcast size={12} />
            配信
          </span>
        </span>
        <span
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            mt: '4px',
            px: '2px',
          })}
        >
          <span className={cx(calloutTitle, stageTitle)}>{name}</span>
          <IconExternalLink
            size={12}
            className={css({ flexShrink: 0, color: 'fg.subtle' })}
          />
        </span>
      </span>
    </a>
  );
}
