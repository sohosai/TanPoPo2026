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

  return (
    // 地図実体を MapProvider で共有し、シート内（Outlet）からも統一APIで操作する。
    <MapProvider>
      <div>
        <MapView />
        <CampusLayers />
        <MapControls />

        {isDesktop ? (
          <SidePanel>
            <Outlet />
          </SidePanel>
        ) : (
          <BottomSheet>
            <Outlet />
          </BottomSheet>
        )}
      </div>
    </MapProvider>
  );
}
