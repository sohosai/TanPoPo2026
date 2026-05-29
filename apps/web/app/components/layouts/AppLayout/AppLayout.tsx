import { Outlet } from 'react-router';
import OverButtons from '~/components/features/OverButtons/OverButtons';
import MapView from '~/components/features/Map/View';
import MapBottomSheet from '~/components/layouts/BottomSheet/BottomSheet';

export default function AppLayout() {
  return (
    <div>
      <OverButtons />
      <MapView />

      <MapBottomSheet>
        <Outlet />
      </MapBottomSheet>
    </div>
  );
}
