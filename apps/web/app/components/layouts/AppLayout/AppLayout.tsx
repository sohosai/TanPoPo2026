import { Outlet, useSearchParams } from 'react-router';
import { MapProvider } from '~/components/features/Map/MapController';
import MapView from '~/components/features/Map/View';
import OverButtons from '~/components/features/OverButtons/OverButtons';
import MapBottomSheet from '~/components/layouts/BottomSheet/BottomSheet';

export default function AppLayout() {
  // 検索/絞り込み条件付きのURL（共有リンク等）で開いた場合は、
  // シートを畳んだ状態ではなくある程度引き上げた状態から開始する。
  const [searchParams] = useSearchParams();
  const openedWithSearch = searchParams.toString() !== '';

  return (
    // 地図実体を MapProvider で共有し、シート内（Outlet）からも統一APIで操作する。
    <MapProvider>
      <div>
        <OverButtons />
        <MapView />

        <MapBottomSheet initiallyRaised={openedWithSearch}>
          <Outlet />
        </MapBottomSheet>
      </div>
    </MapProvider>
  );
}
