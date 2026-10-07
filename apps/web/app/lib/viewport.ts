import { useSyncExternalStore } from 'react';

/** PC 向けレイアウト（左サイドパネル）に切り替える幅。Panda の md ブレークポイントと揃える。 */
const DESKTOP_QUERY = '(min-width: 768px)';

export function isDesktopViewport(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** PC 向けレイアウトで表示すべき幅かどうか。ウィンドウのリサイズにも追従する。 */
export function useIsDesktop(): boolean {
  // SPA モードのビルド時プリレンダーではスマホ版を出し、ハイドレーション後に切り替える。
  return useSyncExternalStore(subscribe, isDesktopViewport, () => false);
}
