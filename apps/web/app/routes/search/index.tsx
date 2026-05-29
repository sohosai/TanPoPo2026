import { Outlet } from 'react-router';
import OverButtons from '~/components/OverButtons/OverButtons';
import MapView from '../../components/Map/View';
import MapBottomSheet from '../../components/BottomSheet/MapBottomSheet';

export default function SearchLayout() {
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