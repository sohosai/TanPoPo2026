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
import { SHEET_PEEK } from '~/components/layouts/MapPanel/BottomSheet';
import { useIsEmbed } from '~/lib/embed';
import { isDesktopViewport } from '~/lib/viewport';
import { token } from '../../../../styled-system/tokens';
import { CAMPUS_BOUNDS } from './campusData';
import type { LngLat } from './geo';
import sohosaiMap from './sohosai-map.json';

export type FocusOptions = {
  /** 寄せるズーム。すでにこれより拡大していれば、今のズームのまま移動する */
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
  /** 範囲が収まるところまで寄る。収まるズームが minZoom 未満なら minZoom まで寄り、範囲の端ははみ出す */
  fitBounds: (bounds: [LngLat, LngLat], minZoom?: number) => void;
  /** ハイライトマーカーを置く（null で消す） */
  highlight: (point: LngLat | null) => void;
  /** 地図を会場全体が収まる表示に戻す。初期表示にも使う */
  resetView: (duration?: number) => void;
};

/** 地図を作るときの仮の視点。作った直後に resetView で会場全体が収まるところへ合わせる。 */
export const INITIAL_VIEW = {
  center: sohosaiMap.center as LngLat,
  zoom: sohosaiMap.zoom,
};

// 周りの建物も見える程度に引いておく。
const DEFAULT_FOCUS_ZOOM = 17.3;
/** 屋外ブースに寄せるときのズーム。テントの形がはっきり見えるところ。 */
export const BOOTH_FOCUS_ZOOM = 18.5;

/** 場所に寄せるときのズーム。屋外はテントの形が見えるところまで寄る。 */
export function placeFocusZoom(place: Place): number {
  return place.kind === 'outdoor' ? BOOTH_FOCUS_ZOOM : 17.6;
}
const DEFAULT_DURATION = 800;
// 下部シートに隠れないよう、フォーカス点を画面上方へ寄せる既定オフセット。
const SHEET_OFFSET: [number, number] = [0, -120];
// fitBounds で下部シートに隠れないよう、下側を広く空ける。
const SHEET_PADDING = { top: 40, left: 40, right: 40, bottom: 240 };
const EVEN_PADDING = { top: 40, left: 40, right: 40, bottom: 40 };
const VIEW_PADDING = { top: 16, left: 16, right: 16, bottom: 16 };

const MapContext = createContext<MapController | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [isReady, setReady] = useState(false);
  // 下部シートがあるのはスマホのアプリ本体だけ。PC はサイドパネル分を padding で空けていて、
  // 埋め込みにはパネル自体が無い。
  const isEmbed = useIsEmbed();
  const hasSheet = useCallback(
    () => !isEmbed && !isDesktopViewport(),
    [isEmbed],
  );

  const register = useCallback((map: maplibregl.Map | null) => {
    mapRef.current = map;
    setReady(map !== null);
    if (map === null && markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, []);

  const flyTo = useCallback(
    (center: LngLat, options: FocusOptions = {}) => {
      const map = mapRef.current;
      map?.flyTo({
        center,
        zoom: Math.max(options.zoom ?? DEFAULT_FOCUS_ZOOM, map.getZoom()),
        duration: options.duration ?? DEFAULT_DURATION,
        offset: options.offset ?? (hasSheet() ? SHEET_OFFSET : [0, 0]),
      });
    },
    [hasSheet],
  );

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

  // maplibre の fitBounds の minZoom は飛行経路の頂点のズームで、到着時の下限にはならない。
  // そのため収まるズームだけ求め、下限をかけて飛ぶ。中心は padding の内側の中央に置く。
  const fitBounds = useCallback(
    (bounds: [LngLat, LngLat], minZoom = 0) => {
      const padding = hasSheet() ? SHEET_PADDING : EVEN_PADDING;
      const fitZoom = mapRef.current?.cameraForBounds(bounds, {
        padding,
      })?.zoom;
      const [[west, south], [east, north]] = bounds;
      flyTo([(west + east) / 2, (south + north) / 2], {
        zoom: Math.max(fitZoom ?? minZoom, minZoom),
        offset: [
          (padding.left - padding.right) / 2,
          (padding.top - padding.bottom) / 2,
        ],
      });
    },
    [flyTo, hasSheet],
  );

  // 画面の大きさによらず会場全体が収まるよう、固定のズームではなく範囲に合わせる。
  const resetView = useCallback(
    (duration = DEFAULT_DURATION) => {
      const map = mapRef.current;
      if (!map) return;
      const camera = map.cameraForBounds(CAMPUS_BOUNDS, {
        padding: {
          ...VIEW_PADDING,
          bottom: VIEW_PADDING.bottom + (hasSheet() ? SHEET_PEEK : 0),
        },
      });
      map.flyTo({ ...camera, bearing: 0, pitch: 0, duration });
    },
    [hasSheet],
  );

  const value = useMemo<MapController>(
    () => ({
      isReady,
      register,
      getMap: () => mapRef.current,
      flyTo,
      focusPoint,
      fitBounds,
      highlight,
      resetView,
    }),
    [isReady, register, flyTo, focusPoint, fitBounds, highlight, resetView],
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
