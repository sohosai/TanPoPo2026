import type { Place } from 'api';
import type maplibregl from 'maplibre-gl';
import type { PaddingOptions } from 'maplibre-gl';
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
  /**
   * 範囲が収まるズームへ移る（今より引くこともある）。収まるズームが minZoom 未満なら minZoom まで寄り、範囲の端ははみ出す。
   * inset は範囲の外に描くもの（点の上の吹き出しなど）のために、画面の端から余分に空ける幅（px）。
   */
  fitBounds: (
    bounds: [LngLat, LngLat],
    minZoom?: number,
    inset?: Required<PaddingOptions>,
  ) => void;
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
// PC のアプリ本体は左にサイドパネルがあり、地図の padding で空けていてもパネルの際は見づらい。
// 範囲の端がパネル寄りに来ないよう、左を広めに空けて全体に余裕を持たせる。
const DESKTOP_PADDING = { top: 80, left: 160, right: 80, bottom: 80 };
const NO_INSET: Required<PaddingOptions> = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
const VIEW_PADDING = { top: 16, left: 16, right: 16, bottom: 16 };

const MapContext = createContext<MapController | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<maplibregl.Map | null>(null);
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

  // maplibre の fitBounds の minZoom は飛行経路の頂点のズームで、到着時の下限にはならない。
  // そのため収まるズームだけ求め、下限をかけて飛ぶ。中心は padding の内側の中央に置く。
  // flyTo と違い、今より引いたズームでも範囲が収まるところへ移る。範囲が狭くても、テントに寄せるより先へは寄らない。
  const fitBounds = useCallback(
    (bounds: [LngLat, LngLat], minZoom = 0, inset = NO_INSET) => {
      const map = mapRef.current;
      const base = hasSheet()
        ? SHEET_PADDING
        : isEmbed
          ? EVEN_PADDING
          : DESKTOP_PADDING;
      const padding = {
        top: base.top + inset.top,
        left: base.left + inset.left,
        right: base.right + inset.right,
        bottom: base.bottom + inset.bottom,
      };
      const fitZoom = map?.cameraForBounds(bounds, { padding })?.zoom;
      const [[west, south], [east, north]] = bounds;
      map?.flyTo({
        center: [(west + east) / 2, (south + north) / 2],
        zoom: Math.min(Math.max(fitZoom ?? minZoom, minZoom), BOOTH_FOCUS_ZOOM),
        duration: DEFAULT_DURATION,
        offset: [
          (padding.left - padding.right) / 2,
          (padding.top - padding.bottom) / 2,
        ],
      });
    },
    [hasSheet, isEmbed],
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
      fitBounds,
      resetView,
    }),
    [isReady, register, flyTo, fitBounds, resetView],
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
