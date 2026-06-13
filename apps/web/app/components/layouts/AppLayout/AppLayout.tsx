import { Outlet } from 'react-router';
import { MapProvider } from '~/components/features/Map/MapController';
import MapView from '~/components/features/Map/View';
import OverButtons from '~/components/features/OverButtons/OverButtons';
import MapBottomSheet from '~/components/layouts/BottomSheet/BottomSheet';

export default function AppLayout() {
  return (
    // 地図実体を MapProvider で共有し、シート内（Outlet）からも統一APIで操作する。
    <MapProvider>
      <div>
        <OverButtons />
        <MapView />

        <MapBottomSheet>
          <Outlet />
        </MapBottomSheet>
      </div>
    </MapProvider>
  );
}
