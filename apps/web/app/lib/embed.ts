import { useLocation } from 'react-router';

// 埋め込みの URL は、アプリ本体の URL の先頭に /embed を付けたもの。
const EMBED_PREFIX = /^\/embed(?=\/|$)/;

export function isEmbedPath(pathname: string): boolean {
  return EMBED_PREFIX.test(pathname);
}

/** 他サイトの iframe に埋め込む地図（/embed 以下）を表示中か。 */
export function useIsEmbed(): boolean {
  return isEmbedPath(useLocation().pathname);
}

/** 埋め込みのパスを、アプリ本体で同じ対象を開くパスにする。 */
export function toAppPath(pathname: string): string {
  return pathname.replace(EMBED_PREFIX, '') || '/';
}
