import type { Place } from 'api';
import maplibregl from 'maplibre-gl';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { token } from '../../../../styled-system/tokens';

export type LngLat = [number, number];

export type FocusOptions = {
  zoom?: number;
  duration?: number;
  /**
   * 中心からのピクセルオフセット。下部シートに隠れないよう既定で上方に寄せる。
   */
  offset?: [number, number];
};

/**
 * 地図操作の統一 API。
 * 視点移動（flyTo/focusPlace/fitToPoints）やハイライトをここに集約し、
 * 検索結果・詳細など地図の外側のUIからも同じ操作で扱えるようにする。
 */
export type MapController = {
  /** 地図実体が登録済みか */
  isReady: boolean;
  /** View からマップ実体を登録/解除する（内部用） */
  register: (map: maplibregl.Map | null) => void;
  /** 生のマップ実体（高度な操作用のエスケープハッチ） */
  getMap: () => maplibregl.Map | null;
  /** 指定座標へアニメーションで移動 */
  flyTo: (center: LngLat, options?: FocusOptions) => void;
  /** 指定座標へ即時移動 */
  jumpTo: (center: LngLat, options?: FocusOptions) => void;
  /** 座標へ移動しハイライトを置く */
  focusPoint: (point: LngLat, options?: FocusOptions) => void;
  /** Place へ移動しハイライトを置く */
  focusPlace: (place: Place, options?: FocusOptions) => void;
  /** 複数座標が収まるよう移動 */
  fitToPoints: (
    points: LngLat[],
    options?: { padding?: number; duration?: number },
  ) => void;
  /** ハイライトマーカーを置く（null で消す） */
  highlight: (point: LngLat | null) => void;
};

const DEFAULT_FOCUS_ZOOM = 18;
const DEFAULT_DURATION = 800;
// 下部シートに隠れないよう、フォーカス点を画面上方へ寄せる既定オフセット。
const DEFAULT_OFFSET: [number, number] = [0, -120];

const MapContext = createContext<MapController | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [isReady, setReady] = useState(false);

  const register = useCallback((map: maplibregl.Map | null) => {
    mapRef.current = map;
    setReady(map !== null);
    if (map === null && markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, []);

  const flyTo = useCallback((center: LngLat, options: FocusOptions = {}) => {
    mapRef.current?.flyTo({
      center,
      zoom: options.zoom ?? DEFAULT_FOCUS_ZOOM,
      duration: options.duration ?? DEFAULT_DURATION,
      offset: options.offset ?? DEFAULT_OFFSET,
    });
  }, []);

  const jumpTo = useCallback((center: LngLat, options: FocusOptions = {}) => {
    mapRef.current?.jumpTo({
      center,
      zoom: options.zoom ?? DEFAULT_FOCUS_ZOOM,
    });
  }, []);

  const highlight = useCallback((point: LngLat | null) => {
    const map = mapRef.current;
    if (!map) return;
    if (point === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        color: token('colors.accent'),
      });
    }
    markerRef.current.setLngLat(point).addTo(map);
  }, []);

  const focusPoint = useCallback(
    (point: LngLat, options?: FocusOptions) => {
      flyTo(point, options);
      highlight(point);
    },
    [flyTo, highlight],
  );

  const focusPlace = useCallback(
    (place: Place, options?: FocusOptions) => {
      focusPoint(place.point, options);
    },
    [focusPoint],
  );

  const fitToPoints = useCallback(
    (
      points: LngLat[],
      options: { padding?: number; duration?: number } = {},
    ) => {
      const map = mapRef.current;
      if (!map || points.length === 0) return;
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new maplibregl.LngLatBounds(points[0], points[0]),
      );
      map.fitBounds(bounds, {
        padding: options.padding ?? 64,
        duration: options.duration ?? DEFAULT_DURATION,
      });
    },
    [],
  );

  const value = useMemo<MapController>(
    () => ({
      isReady,
      register,
      getMap: () => mapRef.current,
      flyTo,
      jumpTo,
      focusPoint,
      focusPlace,
      fitToPoints,
      highlight,
    }),
    [
      isReady,
      register,
      flyTo,
      jumpTo,
      focusPoint,
      focusPlace,
      fitToPoints,
      highlight,
    ],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

/** 地図操作の統一 API を取得する。MapProvider 配下で使う。 */
export function useMap(): MapController {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error('useMap は MapProvider の内側で使用してください');
  }
  return ctx;
}
