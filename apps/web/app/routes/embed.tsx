import { IconExternalLink } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { matchPath, useLocation, useSearchParams } from 'react-router';
import CampusLayers from '~/components/features/Map/CampusLayers';
import { findCampusArea } from '~/components/features/Map/campusData';
import { AREA_MAX_ZOOM } from '~/components/features/Map/campusStyle';
import { ringBounds } from '~/components/features/Map/geo';
import MapCallouts from '~/components/features/Map/MapCallouts';
import {
  MapProvider,
  placeFocusZoom,
  useMap,
} from '~/components/features/Map/MapController';
import MapControls from '~/components/features/Map/MapControls';
import MapView from '~/components/features/Map/MapView';
import { useProjectFocus } from '~/components/features/Map/useProjectFocus';
import { toAppPath } from '~/lib/embed';
import { usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { css } from '../../styled-system/css';
import type { Route } from './+types/embed';

export const meta: Route.MetaFunction = () => [
  { title: '雙峰祭 会場マップ' },
  // 埋め込み先のページで見せるためのもので、単体で検索結果に出す意味は無い。
  { name: 'robots', content: 'noindex' },
];

/**
 * 他サイトの iframe に埋め込む地図。URL はアプリ本体の URL の先頭に /embed を付けたもので、
 * 企画・場所・エリアのページに当たる URL ならそこへ寄せる。
 * `?highlight=trash`（ゴミ箱）か `?highlight=information`（案内所）を付けると、その種類の場所だけを強調し、
 * すべてが収まるように表示する。
 */
export default function Embed() {
  const appPath = toAppPath(useLocation().pathname);
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');
  const highlightKind =
    highlight === 'trash' || highlight === 'information'
      ? highlight
      : undefined;

  return (
    <MapProvider>
      <MapView />
      <CampusLayers highlightKind={highlightKind} />
      {/* 強調中は、ステージの吹き出しで地図を覆わない。 */}
      {!highlightKind && <MapCallouts />}
      <MapControls />
      <Focus appPath={appPath} />
      {highlightKind && <FitKind kind={highlightKind} />}
      <a
        href={appPath}
        target="_blank"
        rel="noopener"
        className={css({
          position: 'fixed',
          left: '12px',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          h: '36px',
          px: '14px',
          borderRadius: 'full',
          bg: 'overlay.control',
          color: 'fg.strong',
          fontSize: 'sm',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: 'float',
          transition: 'transform 0.1s',
          _active: { transform: 'scale(0.96)' },
        })}
      >
        雙峰祭マップで開く
        <IconExternalLink size={16} />
      </a>
    </MapProvider>
  );
}

/** 種類が `kind` の場所すべてが収まるところまで寄る。 */
function FitKind({ kind: target }: { kind: 'information' | 'trash' }) {
  const { fitBounds } = useMap();
  const { places } = usePlaces();
  const bounds = useMemo(() => {
    const points = places.flatMap(({ kind, point }) =>
      kind === target ? [point] : [],
    );
    return points.length > 0 ? ringBounds(points) : undefined;
  }, [places, target]);
  useEffect(() => {
    if (bounds) fitBounds(bounds);
  }, [bounds, fitBounds]);
  return null;
}

function Focus({ appPath }: { appPath: string }) {
  const { flyTo, fitBounds } = useMap();
  const { data: projects } = trpc.project.list.useQuery();
  const { byId: placesById } = usePlaces();

  const projectNumber = matchPath('/project/:number', appPath)?.params.number;
  const placeId = matchPath('/place/:placeId', appPath)?.params.placeId;
  const areaId = matchPath('/area/:areaId', appPath)?.params.areaId;

  useProjectFocus(projects?.find(({ number }) => number === projectNumber));

  const place = placeId ? placesById.get(placeId) : undefined;
  useEffect(() => {
    if (place) flyTo(place.point, { zoom: placeFocusZoom(place) });
  }, [place, flyTo]);

  const area = findCampusArea(areaId);
  useEffect(() => {
    // アプリ本体のエリアページと同じく、エリア名が消えて建物のピンに切り替わるところまで寄る。
    if (area) fitBounds(area.bounds, AREA_MAX_ZOOM + 0.1);
  }, [area, fitBounds]);

  return null;
}
