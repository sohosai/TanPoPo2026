import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useIsEmbed } from '~/lib/embed';
import { css } from '../../../../styled-system/css';
import buildingsRaw from './data/buildings.geojson?raw';
import { addDebugLayers } from './debugLayers';
import { INITIAL_VIEW, useMap } from './MapController';
import sohosaiMap from './sohosai-map.json';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
if (!MAPTILER_KEY) {
  console.warn(
    'VITE_MAPTILER_KEY が未設定のため、地図の背景を読み込めません。',
  );
}

/**
 * MapTiler へのリクエストにキーを付ける。キーはスタイル JSON に書かず環境変数で渡すため、
 * スタイルから辿るタイル定義・タイル・フォントのすべてのリクエストでここを通す。
 */
function withMapTilerKey(url: string) {
  if (!MAPTILER_KEY || !url.startsWith('https://api.maptiler.com/')) return;
  const withKey = new URL(url);
  withKey.searchParams.set('key', MAPTILER_KEY);
  return { url: withKey.toString() };
}

// 平面の建物の塗りも、強調・タップ判定・3D と同じ buildings.geojson の輪郭で描く。
// スタイル JSON に別の輪郭を持つと、建物を選んだときの強調と形がずれるため。
const style = {
  ...sohosaiMap,
  sources: {
    ...sohosaiMap.sources,
    'sohosai-buildings-fill': {
      type: 'geojson',
      data: JSON.parse(buildingsRaw),
    },
  },
} as unknown as StyleSpecification;

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { register, resetView } = useMap();
  const isEmbed = useIsEmbed();

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style,
      transformRequest: withMapTilerKey,
      // maxBounds を渡すと既定の中心 [0, 0] が範囲の端に寄せられ、スタイルの中心が使われなくなるため明示する。
      ...INITIAL_VIEW,
      // 会場の外まで迷い出ないよう、キャンパス周辺に動かせる範囲を絞る。
      maxBounds: [
        [140.07, 36.08],
        [140.135, 36.135],
      ],
      minZoom: 14,
      // 埋め込みでは、地図の上でも埋め込み先のページをスクロールできるよう、
      // Ctrl＋ホイールや2本指のときだけ地図を動かす。
      cooperativeGestures: isEmbed,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText':
          'Ctrl キーを押しながらスクロールで拡大・縮小',
        'CooperativeGesturesHandler.MacHelpText':
          '⌘ キーを押しながらスクロールで拡大・縮小',
        'CooperativeGesturesHandler.MobileHelpText': '2本指で地図を動かす',
      },
    });
    map.current = instance;
    // 統一操作 API から参照できるよう登録する。
    register(instance);
    resetView(0);

    // デバッグ用：URL に ?debug があるときだけ建物・通路データを重ねる。
    const debugEnabled = new URLSearchParams(window.location.search).has(
      'debug',
    );
    if (debugEnabled) {
      const showDebug = () => addDebugLayers(instance);
      if (instance.isStyleLoaded()) {
        showDebug();
      } else {
        instance.on('load', showDebug);
      }
    }

    return () => {
      register(null);
      instance.remove();
      map.current = null;
    };
  }, [register, resetView, isEmbed]);

  return (
    <div
      className={css({
        position: 'fixed',
        top: 0,
        left: 0,
        w: '100vw',
        h: '100dvh',
        bg: 'gray.100',
      })}
    >
      <div
        ref={mapContainer}
        className={css({
          position: 'absolute',
          top: 0,
          left: 0,
          w: '100%',
          h: '100%',
        })}
      />
    </div>
  );
}
