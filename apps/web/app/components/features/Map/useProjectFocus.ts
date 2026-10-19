import type { Project } from 'api';
import { useCallback, useEffect } from 'react';
import { usePlaces } from '~/lib/places';
import { boothCenter } from './booths';
import { BOOTH_FOCUS_ZOOM, useMap } from './MapController';

/**
 * 企画の場所へ地図を寄せる。表示したときに一度寄せ、もう一度寄せるための関数を返す。
 * 屋外ブースはテント列の代表点ではなく、テントそのものの位置へ、形が見えるところまで寄せる。
 * 場所は企画の吹き出し（MapCallouts）が地面の点で指すため、ここではピンを立てない。
 */
export function useProjectFocus(project: Project | undefined): () => void {
  const { flyTo } = useMap();
  const { byId: placesById } = usePlaces();
  const primaryLocation = project?.locations[0];
  const primaryPlace = placesById.get(primaryLocation?.placeId ?? '');
  const boothPoint = boothCenter(primaryPlace, primaryLocation?.room);
  const placePoint = primaryPlace?.point;

  const focus = useCallback(() => {
    if (boothPoint) flyTo(boothPoint, { zoom: BOOTH_FOCUS_ZOOM });
    else if (placePoint) flyTo(placePoint);
  }, [boothPoint, placePoint, flyTo]);

  useEffect(() => {
    focus();
  }, [focus]);

  return focus;
}
