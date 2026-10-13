import type { DragEvent, MouseEvent, PointerEvent } from 'react';
import { useRef, useState } from 'react';

// マウスのドラッグをクリックと区別し始める移動量と、離したときに隣へ送る移動量（px）。
const DRAG_SLOP = 5;
const DRAG_THRESHOLD = 40;

/**
 * scroll-snap の横スクロールで1枚ずつ送るカルーセルの状態。スクロール領域に `ref` と `handlers` を渡し、
 * 各スライドには `scroll-snap-align: center` と `scroll-snap-stop: always` を付ける。
 * `edge` はマウスが左右どちらの端の範囲にあり、その向きに送れるかを表す。
 * 端の範囲は、スクロール領域の幅に対する割合 `edgeRatio` で決める。
 * マウスではドラッグでも1枚ずつ送れる。ドラッグの直後のクリックはスライドへ届けない。
 */
export function useSnapCarousel(
  count: number,
  initialIndex = 0,
  edgeRatio = 0.25,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [side, setSide] = useState<'left' | 'right' | null>(null);
  const drag = useRef<{
    x: number;
    left: number;
    from: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  // スライドの幅に余白や gap が加わるため、隣のスライドとの位置の差を1枚分の送り幅とする。
  const step = (el: HTMLDivElement) => {
    const [first, second] = el.children as unknown as HTMLElement[];
    return second ? second.offsetLeft - first.offsetLeft : el.clientWidth;
  };

  const goTo = (next: number, behavior: ScrollBehavior = 'smooth') => {
    const el = ref.current;
    if (!el) return;
    const clamped = Math.min(count - 1, Math.max(0, next));
    el.scrollTo({ left: clamped * step(el), behavior });
  };

  const edge =
    side === 'left' && index > 0
      ? 'prev'
      : side === 'right' && index < count - 1
        ? 'next'
        : null;

  /** マウスが端の範囲にあれば前後へ送って true を返す。スライドのクリックで先に呼ぶ。 */
  const goToEdge = () => {
    if (!edge) return false;
    goTo(edge === 'prev' ? index - 1 : index + 1);
    return true;
  };

  // ドラッグ中はスナップを外してマウスに追従させ、送り先へ着いたら戻す。
  // スナップを付けたままだと、途中の位置で直近の画像へ引き戻されるため。
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d?.moved || !el) return;
    suppressClick.current = true;
    el.style.cursor = '';
    const dx = e.clientX - d.x;
    const dir = Math.abs(dx) < DRAG_THRESHOLD ? 0 : dx < 0 ? 1 : -1;
    const restore = () => {
      el.style.scrollSnapType = '';
    };
    el.addEventListener('scrollend', restore, { once: true });
    // scrollend を出さないブラウザや、移動が無く発火しない場合に備える。
    setTimeout(restore, 500);
    goTo(d.from + dir);
  };

  /** ドラッグ中なら画像を追従させて true を返す。 */
  const moveDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return false;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) >= DRAG_SLOP) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = 'none';
      el.style.cursor = 'grabbing';
    }
    if (d.moved) el.scrollLeft = d.left - dx;
    return d.moved;
  };

  const handlers = {
    onScroll: () => {
      const el = ref.current;
      if (el) setIndex(Math.round(el.scrollLeft / step(el)));
    },
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      suppressClick.current = false;
      const el = ref.current;
      if (e.pointerType !== 'mouse' || e.button !== 0 || !el) return;
      drag.current = {
        x: e.clientX,
        left: el.scrollLeft,
        from: index,
        moved: false,
      };
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return;
      if (moveDrag(e)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      setSide(x < edgeRatio ? 'left' : x > 1 - edgeRatio ? 'right' : null);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onPointerLeave: () => setSide(null),
    onClickCapture: (e: MouseEvent<HTMLDivElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.stopPropagation();
    },
    // 画像をつかんだときに、ブラウザの画像のドラッグが始まらないようにする。
    onDragStart: (e: DragEvent<HTMLDivElement>) => e.preventDefault(),
  };

  return { ref, index, goTo, edge, goToEdge, handlers };
}
