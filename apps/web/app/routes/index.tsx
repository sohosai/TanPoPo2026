import MapView from '../components/Map/View';
import MapBottomSheet from '../components/BottomSheet/MapBottomSheet';

export default function Index() {
  return (
    <div>
      {/* 背景に表示されているMap */}
      <MapView />
      <MapBottomSheet />
    </div>
  );
}
