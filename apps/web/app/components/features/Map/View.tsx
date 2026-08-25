import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { css } from '../../../../styled-system/css';
import { addDebugLayers } from './debugLayers';
import { useMap } from './MapController';
import sohosaiMap from './sohosai-map.json';

export default function View() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { register } = useMap();

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: sohosaiMap as unknown as StyleSpecification,
    });

    instance.on('load', () => {
      // 建物を初期状態では非表示にする。
      instance.setLayoutProperty('3d-buildings', 'visibility', 'none');

      // コンパス
      instance.addControl(
        new maplibregl.NavigationControl({
          showZoom: false,
          showCompass: true,
          visualizePitch: true,
        }),
        'top-right'
      );

      // 傾き0では建物を非表示にする。
      instance.on('pitch', () => {
        const pitch = instance.getPitch();
        instance.setLayoutProperty('3d-buildings', 'visibility', pitch > 0 ? 'visible' : 'none');
      });
    });

    map.current = instance;
    // 統一操作 API から参照できるよう登録する。
    register(instance);

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
  }, [register]);

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