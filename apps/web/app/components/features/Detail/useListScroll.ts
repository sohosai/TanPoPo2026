import { type UIEvent, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';

// 一覧のスクロール位置をパスごとに覚えておく。一覧は詳細へ移るとアンマウントされるため、ここに持つ。
const positions = new Map<string, number>();

/**
 * 一覧のスクロール位置を、詳細から戻ってきたときに復元する。
 * 返り値をスクロールする要素に渡す。ready は一覧の中身がそろって高さが決まったら true にする。
 */
export function useListScroll(ready: boolean) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  // 場所を切り替えたときは同じ画面が使い回されるため、復元済みかをパスで判定する。
  const restoredPath = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!ready || restoredPath.current === pathname || !ref.current) return;
    restoredPath.current = pathname;
    ref.current.scrollTop = positions.get(pathname) ?? 0;
  }, [ready, pathname]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    if (restoredPath.current === pathname)
      positions.set(pathname, e.currentTarget.scrollTop);
  };

  return { ref, onScroll };
}
