import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { css } from '../../../../styled-system/css';

/** 退場アニメの長さ(ms)。下の detailExitStyles の秒数と揃える。 */
const DETAIL_EXIT_MS = 100;

// 企画一覧で最後に使っていた検索条件（URL クエリ）。場所・エリアの詳細を閉じたときはこの条件の一覧へ戻す。
// 地図のピンや場所詳細を経由して開いた詳細からも戻れるよう、リンクの state ではなくここに持つ。
let listSearch = '';
// 最後に見ていた一覧（企画一覧・場所・エリア）のパス。企画詳細を閉じたときはここへ戻す。
let lastListPath = '/';

/** 企画一覧の検索条件を覚えておく。企画一覧が条件の変わるたびに呼ぶ。 */
export function rememberListSearch(search: string) {
  listSearch = search;
  lastListPath = listPath();
}

/** 場所・エリアの企画一覧を開いたときに、企画詳細の戻り先として覚えておく。 */
export function rememberListPath(path: string) {
  lastListPath = path;
}

/** 場所・エリアの詳細を閉じたときに戻る企画一覧の URL。 */
export function listPath() {
  return listSearch ? `/?${listSearch}` : '/';
}

/** 企画詳細を閉じたときに戻る、最後に見ていた一覧の URL。 */
export function lastListUrl() {
  return lastListPath;
}

/** 一覧へ戻ったことを一覧側に伝えるための location.state。 */
export interface FromDetailState {
  fromDetail?: boolean;
}

/** 詳細の入場アニメ。 */
export const detailEnterStyles = css({
  animation: 'detailEnter 0.28s ease-out',
});

/** 詳細の退場アニメ。閉じている最中の二重操作も防ぐ。 */
export const detailExitStyles = css({
  animation: 'detailExit 0.1s cubic-bezier(0.4, 0, 1, 1) forwards',
  transformOrigin: 'top center',
  pointerEvents: 'none',
});

/** 詳細から一覧へ戻ってきたときの、一覧全体（検索バー含む）の素早いフェードイン。 */
export const listEnterStyles = css({
  animation: 'viewerFade 0.06s ease-out',
});

/**
 * 一覧の各行が上から順に少しずつ出てくる演出。itemEnterStyle(index) と組み合わせる。
 * fill-mode は backwards にし、終了後は中止企画の半透明など本来のスタイルに戻す。
 */
export const itemEnterStyles = css({
  animation: 'itemEnter 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) backwards',
  animationDelay: 'calc(var(--enter-index) * 35ms)',
});

/** 画面外の行まで待たされないよう、遅延は先頭の数件分で打ち止めにする。 */
const MAX_STAGGER = 10;

export function itemEnterStyle(index: number): CSSProperties {
  return { '--enter-index': Math.min(index, MAX_STAGGER) } as CSSProperties;
}

/**
 * 詳細を × で閉じるときに、退場アニメを再生してから to の一覧へ遷移する。
 * 新しいタブで開く等の修飾キー付きクリックや、視差効果を減らす設定では即座に遷移する。
 */
export function useDetailClose(to: string) {
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const close = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      e.preventDefault();
      if (closing) return;

      const state: FromDetailState = { fromDetail: true };
      const go = () => navigate(to, { state });
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        go();
        return;
      }
      setClosing(true);
      timer.current = window.setTimeout(go, DETAIL_EXIT_MS);
    },
    [closing, navigate, to],
  );

  return { to, closing, close };
}
