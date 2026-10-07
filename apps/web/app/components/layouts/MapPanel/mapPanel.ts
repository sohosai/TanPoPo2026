import { createContext, useContext } from 'react';

/**
 * 地図に重ねた一覧パネル（スマホは下部シート、PC は左サイドパネル）の開閉操作。
 * パネル内の画面から、検索欄のフォーカス時に広げる・地図を見せたいときに畳む、などに使う。
 */
export interface MapPanelApi {
  /** 全体を開く */
  expand: () => void;
  /** 地図とパネルを半々に見せる */
  raise: () => void;
  /** 畳んで地図を見せる */
  collapse: () => void;
}

export const MapPanelContext = createContext<MapPanelApi>({
  expand: () => {},
  raise: () => {},
  collapse: () => {},
});

export function useMapPanel(): MapPanelApi {
  return useContext(MapPanelContext);
}
