import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

// 埋め込みの URL は、アプリ本体の URL の先頭に /embed を付けたもの。
const EMBED_PREFIX = /^\/embed(?=\/|$)/;

export function isEmbedPath(pathname: string): boolean {
  return EMBED_PREFIX.test(pathname);
}

/** 他サイトの iframe に埋め込む地図（/embed 以下）を表示中か。 */
export function useIsEmbed(): boolean {
  return isEmbedPath(useLocation().pathname);
}

/** アプリ本体のページを開く。埋め込みでは、埋め込み先のページを離れさせないよう新しいタブで開く。 */
export function useOpenAppPath(): (path: string) => void {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  return useCallback(
    (path: string) => {
      if (isEmbed) window.open(path, '_blank', 'noopener');
      else navigate(path);
    },
    [isEmbed, navigate],
  );
}

/** 埋め込みのパスを、アプリ本体で同じ対象を開くパスにする。 */
export function toAppPath(pathname: string): string {
  return pathname.replace(EMBED_PREFIX, '') || '/';
}
