import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './View.module.scss';

export default function View() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lng] = useState(140.1022);
  const [lat] = useState(36.1055);
  const [zoom] = useState(14);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json`,
      center: [lng, lat],
      zoom: zoom,
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    new maplibregl.Marker({ color: '#FF0000' })
      .setLngLat([139.7525, 35.6846])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [lng, lat, zoom]);

  return (
    <div className={styles.root}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
}
