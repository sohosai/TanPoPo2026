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
import { isDesktopViewport } from '~/lib/viewport';
import { token } from '../../../../styled-system/tokens';
import type { LngLat } from './geo';
import sohosaiMap from './sohosai-map.json';

export type FocusOptions = {
  zoom?: number;
  duration?: number;
  /**
   * 中心からのピクセルオフセット。スマホでは下部シートに隠れないよう既定で上方に寄せる。
   * PC ではサイドパネル分を地図の padding で空けているため既定ではずらさない。
   */
  offset?: [number, number];
};

/**
 * 地図操作の統一 API。
 * 視点移動やハイライトをここに集約し、
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
  /** 座標へ移動しハイライトを置く */
  focusPoint: (point: LngLat, options?: FocusOptions) => void;
  /** ハイライトマーカーを置く（null で消す） */
  highlight: (point: LngLat | null) => void;
  /** 地図を初期表示（会場全体）に戻す */
  resetView: () => void;
};

/** 地図の初期表示（会場全体）。地図スタイルの中心とズームに合わせる。 */
export const INITIAL_VIEW = {
  center: sohosaiMap.center as LngLat,
  zoom: sohosaiMap.zoom,
};

// 周りの建物も見える程度に引いておく。
const DEFAULT_FOCUS_ZOOM = 17.3;
/** 屋外ブースに寄せるときのズーム。テントの形が見える（地図がテントを描き始める 18 より寄った）ところ。 */
export const BOOTH_FOCUS_ZOOM = 18.5;
const DEFAULT_DURATION = 800;
// 下部シートに隠れないよう、フォーカス点を画面上方へ寄せる既定オフセット。
const SHEET_OFFSET: [number, number] = [0, -120];
const defaultOffset = (): [number, number] =>
  isDesktopViewport() ? [0, 0] : SHEET_OFFSET;

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
      offset: options.offset ?? defaultOffset(),
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

  const resetView = useCallback(() => {
    mapRef.current?.flyTo({
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      bearing: 0,
      pitch: 0,
      duration: DEFAULT_DURATION,
    });
  }, []);

  const value = useMemo<MapController>(
    () => ({
      isReady,
      register,
      getMap: () => mapRef.current,
      flyTo,
      focusPoint,
      highlight,
      resetView,
    }),
    [isReady, register, flyTo, focusPoint, highlight, resetView],
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
