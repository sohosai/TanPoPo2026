import { type RefObject, useEffect } from 'react';
import {
  dragSlop,
  projectionMs,
  releaseIdleMs,
} from '~/components/layouts/MapPanel/BottomSheet';
import { isDesktopViewport } from '~/lib/viewport';

const RETURN_TRANSITION = 'transform 0.2s ease-out';

type Gesture = {
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  /** シートを動かし始めた指の位置。ここからの移動量だけシートを下げる。 */
  base: number;
  offset: number;
  inContent: boolean;
  mode: 'pending' | 'sheet' | 'scroll';
};

type Swipe = {
  sheet: HTMLElement;
  content: HTMLElement;
  close: () => void;
  gesture: Gesture | null;
  suppressClick: boolean;
};

// 動き出しの向きと中身のスクロール位置から、シートを動かすかを決める。
// 中身の外か、先頭まで出ている中身を下へ引いたらシートを動かす。中身をスクロール中でも、
// 先頭に戻ったところで下へ引いていれば、同じ指の動きのままシートに切り替える。
function nextMode(
  g: Gesture,
  y: number,
  atTop: boolean,
  movingDown: boolean,
): Gesture['mode'] {
  if (g.mode === 'pending') {
    const dy = y - g.startY;
    if (Math.abs(dy) < dragSlop) return 'pending';
    return dy > 0 && (!g.inContent || atTop) ? 'sheet' : 'scroll';
  }
  if (g.mode === 'scroll' && movingDown && atTop) return 'sheet';
  return g.mode;
}

function onStart(s: Swipe, e: TouchEvent) {
  const y = e.touches[0].clientY;
  // 後ろの暗い部分から始めた操作は、タップで閉じるだけにする。
  if (s.gesture || y < s.sheet.getBoundingClientRect().top) return;
  s.suppressClick = false;
  s.gesture = {
    startY: y,
    lastY: y,
    lastTime: e.timeStamp,
    velocity: 0,
    base: y,
    offset: 0,
    inContent: s.content.contains(e.target as Node),
    mode: 'pending',
  };
}

function onMove(s: Swipe, e: TouchEvent) {
  const g = s.gesture;
  if (!g) return;
  const y = e.touches[0].clientY;
  const dt = e.timeStamp - g.lastTime;
  if (dt > 0) g.velocity = (y - g.lastY) / dt;
  const mode = nextMode(g, y, s.content.scrollTop <= 0, y > g.lastY);
  g.lastY = y;
  g.lastTime = e.timeStamp;
  if (mode !== 'sheet') {
    g.mode = mode;
    return;
  }
  // 中身の外から引いたときは指を置いた位置から、中身から引き継いだときは引き継いだ位置から動かす。
  if (g.mode !== 'sheet') g.base = g.inContent ? y : g.startY;
  g.mode = mode;

  e.preventDefault();
  g.offset = Math.max(0, y - g.base);
  s.sheet.style.transition = 'none';
  s.sheet.style.transform = `translateY(${g.offset}px)`;
}

function onEnd(s: Swipe, e: TouchEvent) {
  const g = s.gesture;
  s.gesture = null;
  if (g?.mode !== 'sheet') return;
  s.suppressClick = true;
  const velocity = e.timeStamp - g.lastTime > releaseIdleMs ? 0 : g.velocity;
  // 開いた位置と閉じた位置のうち、止まる位置の予測に近いほうへ動かす。
  if (g.offset + velocity * projectionMs > s.sheet.offsetHeight / 2) {
    s.close();
    return;
  }
  s.sheet.style.transition = RETURN_TRANSITION;
  s.sheet.style.transform = '';
}

// 引いた指を離したときに、指の下の選択肢が押されないようにする。
function onClick(s: Swipe, e: MouseEvent) {
  if (!s.suppressClick) return;
  s.suppressClick = false;
  e.preventDefault();
  e.stopPropagation();
}

/**
 * 下から出したシートを、下へのスワイプで閉じられるようにする。スマホだけで働く。
 * 判定は地図パネルのシート（docs/web/bottom-sheet.md の 2.1、2.2）にそろえ、シートのどこからでも引ける。
 * `close` は閉じる動きを見せてから閉じる関数で、引いた位置から続けて動かせるよう transform を書き換えない。
 */
export function useSwipeToClose(
  sheetRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
) {
  useEffect(() => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!open || !sheet || !content || isDesktopViewport()) return;

    const s: Swipe = {
      sheet,
      content,
      close,
      gesture: null,
      suppressClick: false,
    };
    const start = (e: TouchEvent) => onStart(s, e);
    const move = (e: TouchEvent) => onMove(s, e);
    const end = (e: TouchEvent) => onEnd(s, e);
    const click = (e: MouseEvent) => onClick(s, e);

    sheet.addEventListener('touchstart', start, { passive: true });
    sheet.addEventListener('touchmove', move, { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
    sheet.addEventListener('click', click, true);
    return () => {
      sheet.removeEventListener('touchstart', start);
      sheet.removeEventListener('touchmove', move);
      sheet.removeEventListener('touchend', end);
      sheet.removeEventListener('touchcancel', end);
      sheet.removeEventListener('click', click, true);
    };
  }, [sheetRef, contentRef, open, close]);
}
