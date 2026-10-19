import type { Place, Project, ProjectLocation } from 'api';
import { useCallback, useEffect, useMemo } from 'react';
import { usePlaces } from '~/lib/places';
import { boothCenter } from './booths';
import { type LngLat, ringBounds } from './geo';
import { BOOTH_FOCUS_ZOOM, useMap } from './MapController';

// 企画の吹き出し（MapCallouts）は点の真上に、軸を含め高さ約 80px・最大幅 240px で出る。
// 場所が複数のとき、端の点の吹き出しまで画面に収まるよう、その分を空けて範囲を合わせる。
const CALLOUT_INSET = { top: 90, left: 120, right: 120, bottom: 0 };

/** 企画の場所を指す地図上の点と、そこで実施する場所。 */
export type ProjectSpot = {
  point: LngLat;
  /** 屋外ブースのテントを指す点か */
  booth: boolean;
  locations: { place: Place; location: ProjectLocation }[];
};

/**
 * 企画の場所を地図上の点ごとにまとめる。屋外ブースはテント列の代表点ではなくテントそのものを指し、
 * それ以外は場所の代表点を指す。同じ建物の別の部屋は同じ点になるため1つにまとめる。
 */
export function projectSpots(
  project: Project,
  placesById: ReadonlyMap<string, Place>,
): ProjectSpot[] {
  const spots = new Map<string, ProjectSpot>();
  for (const location of project.locations) {
    const place = placesById.get(location.placeId);
    if (!place) continue;
    const booth = boothCenter(place, location.room);
    const point = booth ?? place.point;
    const key = point.join();
    const spot = spots.get(key) ?? { point, booth: !!booth, locations: [] };
    spot.locations.push({ place, location });
    spots.set(key, spot);
  }
  return [...spots.values()];
}

/**
 * 企画の場所へ地図を寄せる。表示したときに一度寄せ、もう一度寄せるための関数を返す。
 * 屋外ブースはテントの形が見えるところまで寄せ、場所が複数あればすべてが収まるところへ合わせる。
 * 場所は企画の吹き出し（MapCallouts）が地面の点で指すため、ここではピンを立てない。
 */
export function useProjectFocus(project: Project | undefined): () => void {
  const { flyTo, fitBounds } = useMap();
  const { byId: placesById } = usePlaces();
  const spots = useMemo(
    () => (project ? projectSpots(project, placesById) : []),
    [project, placesById],
  );

  const focus = useCallback(() => {
    const [first, ...rest] = spots;
    if (!first) return;
    if (rest.length > 0) {
      fitBounds(ringBounds(spots.map(({ point }) => point)), 0, CALLOUT_INSET);
    } else flyTo(first.point, first.booth ? { zoom: BOOTH_FOCUS_ZOOM } : {});
  }, [spots, flyTo, fitBounds]);

  useEffect(() => {
    focus();
  }, [focus]);

  return focus;
}
