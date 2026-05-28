import OverButtons from '~/components/OverButtons/OverButtons';
import MapBottomSheet from '../components/BottomSheet/MapBottomSheet';
import MapView from '../components/Map/View';

export default function Index() {
  return (
    <div>
      {/* ロゴや外部リンクなど */}
      <OverButtons />

      {/* 背景に表示されているMap */}
      <MapView />

      {/* 下から生えてくる部分*/}
      <MapBottomSheet />
    </div>
  );
}
