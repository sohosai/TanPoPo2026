import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import sohosaiMap from './sohosai-map.json';
import { css } from '../../../../styled-system/css';

export default function View() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: sohosaiMap as unknown as StyleSpecification,
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

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
