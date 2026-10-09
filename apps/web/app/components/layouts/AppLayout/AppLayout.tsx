import { useRef } from 'react';
import { Outlet } from 'react-router';
import CampusLayers from '~/components/features/Map/CampusLayers';
import { MapProvider } from '~/components/features/Map/MapController';
import MapControls from '~/components/features/Map/MapControls';
import MapView from '~/components/features/Map/MapView';
import BottomSheet from '~/components/layouts/MapPanel/BottomSheet';
import SidePanel from '~/components/layouts/MapPanel/SidePanel';
import { useIsDesktop } from '~/lib/viewport';

export default function AppLayout() {
  const isDesktop = useIsDesktop();
  const controlsRef = useRef<HTMLDivElement>(null);

  return (
    // 地図実体を MapProvider で共有し、シート内（Outlet）からも統一APIで操作する。
    <MapProvider>
      <div>
        <MapView />
        <CampusLayers />
        <MapControls ref={controlsRef} />

        {isDesktop ? (
          <SidePanel>
            <Outlet />
          </SidePanel>
        ) : (
          <BottomSheet controlsRef={controlsRef}>
            <Outlet />
          </BottomSheet>
        )}
      </div>
    </MapProvider>
  );
}
