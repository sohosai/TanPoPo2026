import type { LngLat } from 'maplibre-gl';
import {
  type PointerEvent,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMap } from '~/components/features/Map/MapController';
import { css } from '../../../../styled-system/css';
import { type MapPanelApi, MapPanelContext } from './mapPanel';

/** 最小段の高さ(px)。検索欄(44px)を上下に 6px ずつの余白で囲む。 */
export const SHEET_PEEK = 56;
/** 最大段・中段の高さ（画面縦幅に対する割合）。 */
const fullRatio = 0.95;
const halfRatio = 0.5;
// 指を離した位置に「速度(px/ms) × この時間」を足した位置を、止まる位置の予測とする。
const projectionMs = 200;
// 指を止めてから離すまでにこれ以上間が空いたら、勢いはないものとする。
const releaseIdleMs = 100;
// 指がこれ以上動くまではタップとみなし、シートを動かさない。
const dragSlop = 8;
const rubberDim = 200;
// 地図をこれ以上動かしたら（画面上の移動量 px、ズームの段数）、シートを最小段に下げる。
const mapPanThreshold = 60;
const mapZoomThreshold = 0.5;
// 段へ動かすばね。応答時間(秒)と減衰比。減衰比が1未満だと、目標をわずかに行き過ぎてから戻る。
const springResponse = 0.45;
const springDamping = 0.85;

interface Shape {
  /** カードの左右の余白 */
  side: number;
  /** カードの下の余白 */
  gap: number;
  /**
   * 中身に足す左右の余白。中段ではカードの縁から中身（各ページの左右の余白 16px を含む）の端まで
   * 18px にする。中段と最小段で同じ値にし、地図操作などで最も多い中段と最小段の移動では
   * 中身の幅を変えない（最小段で細くなる分は、最小段で見える行だけが自分で合わせる）。
   */
  pad: number;
  radiusTop: number;
  radiusBottom: number;
}

// 段ごとのカードの形(px)。段の間は線形に補間する。
// 角丸は、検索欄の角丸 22px に検索欄からカードの縁までの余白を足して同心にする
// （中段は余白 18px で 40px、最小段は余白 6px で 28px）。最小段のカードは検索欄を囲むカプセルになる。
const fullShape: Shape = {
  side: 0,
  gap: 0,
  pad: 0,
  radiusTop: 22,
  radiusBottom: 0,
};
const halfShape: Shape = {
  side: 8,
  gap: 8,
  pad: 10,
  radiusTop: 40,
  radiusBottom: 40,
};
// 最小段は中段より横幅を狭くする。
const peekShape: Shape = {
  side: 28,
  gap: 24,
  pad: 10,
  radiusTop: 28,
  radiusBottom: 28,
};

type Stage = 'full' | 'half' | 'peek';

interface BottomSheetProps {
  children?: ReactNode;
  /** シートの上端に追従させる地図コントロールの要素。 */
  controlsRef?: RefObject<HTMLDivElement | null>;
}

interface Snaps {
  full: number;
  half: number;
  peek: number;
  /** シート要素の高さ */
  height: number;
  /** 画面下端の安全領域の高さ */
  safeArea: number;
  /** 最小段のカードの下の余白。安全領域より狭くしない */
  peekGap: number;
}

const rubberband = (overflow: number) =>
  (1 - 1 / ((overflow * 0.55) / rubberDim + 1)) * rubberDim;

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

const mix = (a: Shape, b: Shape, t: number): Shape => ({
  side: a.side + (b.side - a.side) * t,
  gap: a.gap + (b.gap - a.gap) * t,
  pad: a.pad + (b.pad - a.pad) * t,
  radiusTop: a.radiusTop + (b.radiusTop - a.radiusTop) * t,
  radiusBottom: a.radiusBottom + (b.radiusBottom - a.radiusBottom) * t,
});

// シートの位置 y でのカードの形。
const shapeAt = (y: number, s: Snaps): Shape => {
  if (y <= s.half) return mix(fullShape, halfShape, clamp01(y / s.half));
  const peek = { ...peekShape, gap: s.peekGap };
  return mix(halfShape, peek, clamp01((y - s.half) / (s.peek - s.half)));
};

// シート要素の下端から、カードの下端までの距離。最小段より下へ引っ張ったときは、
// カードの高さを最小段のまま保ってカードごと下げる。
const cardBottomAt = (y: number, s: Snaps) =>
  Math.min(y + shapeAt(y, s).gap, s.height - SHEET_PEEK);

const stageAt = (y: number, s: Snaps): Stage =>
  y > (s.half + s.peek) / 2 ? 'peek' : y < s.half / 2 ? 'full' : 'half';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 触れた要素からシートまで遡り、最も近い縦スクロール領域を返す。
// 一覧や場所詳細は、シートの中身の中にさらに自前のスクロール領域を持つため。
const findScroller = (target: EventTarget | null, root: Element) => {
  for (
    let el = target instanceof Element ? target : null;
    el && el !== root;
    el = el.parentElement
  ) {
    const { overflowY } = getComputedStyle(el);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      return el;
    }
  }
  return null;
};

type GestureMode = 'pending' | 'sheet' | 'scroll' | 'horizontal';

// 指の動きから、シートを伸縮させるか、ブラウザのスクロール（縦・横）に任せるかを決める。
// 最大段に達していないとき、または中身が先頭にあって下へ動かしたときはシートを動かす。
const classify = (
  dx: number,
  dy: number,
  belowFull: boolean,
  atTop: boolean,
): Exclude<GestureMode, 'pending'> => {
  if (Math.abs(dx) > Math.abs(dy)) return 'horizontal';
  return belowFull || (dy > 0 && atTop) ? 'sheet' : 'scroll';
};

const prevent = (e: TouchEvent) => {
  if (e.cancelable) e.preventDefault();
};

const sheetStyles = css({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,
  h: `${fullRatio * 100}dvh`,
  // 操作を受け付けるのはカードの内側だけにし、カードの外の余白では地図を操作できるようにする。
  pointerEvents: 'none',
  willChange: 'transform',
  // 動いていないあいだに描画された data-sheet-morph の要素にも、いまの段の進み具合を渡す。
  // 動いているあいだは place() が要素ごとに上書きする。
  '&[data-peek] [data-sheet-morph]': { '--sheet-peek': '1' },
  // 中身をスクロールできるのは最大段だけなので、それ以外の段ではスクロールバーを出さない。
  '&:not([data-stage="full"])': {
    '& *': {
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    },
  },
});

// カード。背景と影を描き、中身をカードの形で切り抜く。位置と角丸は place() が毎フレーム書き込む。
// overflow: hidden による切り抜きは、clip-path と違って枠が変わっても中身を描き直さない。
const cardStyles = css({
  position: 'absolute',
  top: 0,
  overflow: 'hidden',
  bg: 'sheet.background',
  boxShadow: 'panel',
  pointerEvents: 'auto',
});

// 取っ手と中身。カードの大きさが変わっても中身をレイアウトし直さないよう、シートと同じ大きさで
// 固定し、カードの左の余白の分だけ place() が左へずらして画面上の位置を保つ。
const innerStyles = css({
  position: 'absolute',
  top: 0,
  w: '100vw',
  h: `${fullRatio * 100}dvh`,
  display: 'flex',
  flexDirection: 'column',
  touchAction: 'none',
});

const contentStyles = css({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  touchAction: 'pan-y',
  // 最小段では中身をスクロールさせないため、見えている高さを超える中身にスクロールバーを出さない。
  '[data-peek] &': { overflowY: 'hidden' },
});

// 取っ手。上へ広げられることを示すため、どの段でも見せる。カードに切り抜かれないよう
// カードの外に置き、中段と最大段ではカードの上端に重ね、最小段ではカプセルの上へ
// place() が持ち上げる。中身の配置に場所を取らない（各ページが上の余白を取る）。
// 押せる範囲は WCAG 2.5.8 の最小寸法を満たす幅 44px・高さ 24px にする。
const handleAreaStyles = css({
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  w: '44px',
  h: '24px',
  pt: '5px',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  pointerEvents: 'auto',
  touchAction: 'none',
  cursor: 'grab',
  _focusVisible: {
    outline: '2px solid',
    outlineColor: 'accent',
    outlineOffset: '-4px',
    borderRadius: 'full',
  },
});

const handleStyles = css({
  w: '42px',
  h: '5px',
  borderRadius: 'full',
  bg: 'sheet.handle',
});

// 画面下端の安全領域の高さを測るための見えない要素。
const safeAreaStyles = css({
  position: 'absolute',
  w: 0,
  h: 'env(safe-area-inset-bottom, 0px)',
  visibility: 'hidden',
});

export default function BottomSheet({
  children,
  controlsRef,
}: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const safeAreaRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  // シートの位置（上端が最大段の位置から下がる距離）。毎フレーム変わるため、React の state を
  // 通さず、place() で DOM に直接書き込む。
  const yRef = useRef(0);
  // 中身に足している左右の余白。変わると中身をレイアウトし直すため、整数pxが変わったときだけ書き換える。
  const padRef = useRef(-1);
  // 指の動きを描画に反映する、次のフレームの予約。
  const dragFrame = useRef<number | null>(null);
  const animation = useRef<number | null>(null);
  // 動いているあいだカードの下端に留める要素（中身の下端に貼り付く data-sheet-bottom）。
  const pinned = useRef<HTMLElement[]>([]);
  // 最小段へ寄る進み具合を渡す要素（data-sheet-morph）。動いているあいだだけ集めておく。
  const morphs = useRef<HTMLElement[]>([]);
  const [stage, setStage] = useState<Stage>('half');
  const stageRef = useRef<Stage>('half');
  const drag = useRef({
    pointerY: 0,
    baseY: 0,
    y: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
    snaps: null as Snaps | null,
  });
  const mouseDrag = useRef<{ startY: number; moved: boolean } | null>(null);
  const handleDragged = useRef(false);

  // 各段でのシートの位置。
  const getSnaps = useCallback((): Snaps => {
    const height = ref.current?.offsetHeight ?? 0;
    const viewport = height / fullRatio;
    const safeArea = safeAreaRef.current?.offsetHeight ?? 0;
    const peekGap = Math.max(peekShape.gap, safeArea);
    return {
      full: 0,
      half: Math.max(height - viewport * halfRatio, 0),
      peek: Math.max(height - SHEET_PEEK - peekGap, 0),
      height,
      safeArea,
      peekGap,
    };
  }, []);

  // シートを位置 y に置き、カードの形、地図コントロール、下端の操作バーをそれに合わせる。
  const place = useCallback(
    (y: number, snaps: Snaps) => {
      const sheet = ref.current;
      const card = cardRef.current;
      const inner = innerRef.current;
      if (!sheet || !card || !inner) return;
      yRef.current = y;
      // 小数pxだと中身がサブピクセル位置で描画され、境目に隙間やちらつきが出るため丸める。
      sheet.style.transform = `translate3d(0, ${Math.round(y)}px, 0)`;

      const { side, pad, radiusTop, radiusBottom } = shapeAt(y, snaps);
      const bottom = cardBottomAt(y, snaps);
      card.style.left = `${side}px`;
      card.style.right = `${side}px`;
      card.style.bottom = `${bottom}px`;
      card.style.borderRadius = `${radiusTop}px ${radiusTop}px ${radiusBottom}px ${radiusBottom}px`;
      inner.style.left = `${-side}px`;
      const roundedPad = Math.round(pad);
      if (roundedPad !== padRef.current) {
        padRef.current = roundedPad;
        inner.style.paddingInline = `${roundedPad}px`;
      }

      // 地図コントロールはカードの上端に追従させる。追従は中段までとし、それより上ではシートに隠れる。
      const controls = controlsRef?.current;
      if (controls) {
        const cardTop = snaps.height - Math.max(y, snaps.half);
        const lift = cardTop - SHEET_PEEK - snaps.safeArea;
        controls.style.transform = `translate3d(0, ${-Math.round(lift)}px, 0)`;
      }

      // 動いているあいだは中身の下端がシート要素の下端（画面外）にあるため、
      // 下端に貼り付く要素をその分だけ戻し、カードの下端に留める。
      for (const el of pinned.current) {
        el.style.transform = `translate3d(0, ${-Math.round(bottom)}px, 0)`;
      }

      // 中段から最小段へ寄る進み具合（0〜1）。各ページはこれで最小段の形へ連続的に変わる。
      const progress = clamp01((y - snaps.half) / (snaps.peek - snaps.half));
      for (const el of morphs.current) {
        el.style.setProperty('--sheet-peek', progress.toFixed(3));
      }
      // 取っ手は最小段へ寄るにつれて上へ移し、最小段ではカプセルの上端から 7px 上に棒が来る。
      if (handleRef.current) {
        handleRef.current.style.transform = `translate3d(-50%, ${-17 * progress}px, 0)`;
      }

      // 最小段の付近（中段との中間より下）にあるあいだ data-peek を付け、中身が最小段向けの表示に
      // 切り替えられるようにする。ドラッグ中も位置で判定し、最小段から上下に引いても表示を保つ。
      const next = stageAt(y, snaps);
      if (next !== stageRef.current) {
        stageRef.current = next;
        setStage(next);
      }
    },
    [controlsRef],
  );

  // シートが動き出すときに呼ぶ。動いているあいだは中身の下端をシート要素の下端まで伸ばし、
  // フレームごとにレイアウトし直さない。
  const beginMotion = useCallback(() => {
    const sheet = ref.current;
    const content = contentRef.current;
    if (!sheet || !content) return;
    content.style.marginBottom = '0px';
    pinned.current = Array.from(
      sheet.querySelectorAll<HTMLElement>('[data-sheet-bottom]'),
    );
    morphs.current = Array.from(
      sheet.querySelectorAll<HTMLElement>('[data-sheet-morph]'),
    );
  }, []);

  // シートが止まったときに呼ぶ。中身の下端をカードの下端にそろえ、どの段でも末尾まで
  // 見える範囲にスクロールできるようにする。留めていた要素は本来の位置に戻す。
  const endMotion = useCallback((snaps: Snaps) => {
    const content = contentRef.current;
    if (!content) return;
    content.style.marginBottom = `${Math.round(cardBottomAt(yRef.current, snaps))}px`;
    for (const el of pinned.current) el.style.transform = '';
    pinned.current = [];
    // 止まった段の値は上の CSS が渡すので、要素ごとの値は外す。
    for (const el of morphs.current) el.style.removeProperty('--sheet-peek');
    morphs.current = [];
  }, []);

  const stopAnimation = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
  }, []);

  // ばねの動きで target の位置へ動かす。velocity(px/ms) は指を離したときの速度で、ばねの初速にする。
  const animateTo = useCallback(
    (target: number, velocity = 0, snaps: Snaps = getSnaps()) => {
      stopAnimation();
      const settled =
        Math.abs(yRef.current - target) < 0.5 && Math.abs(velocity) < 0.02;
      if (settled || prefersReducedMotion()) {
        place(target, snaps);
        endMotion(snaps);
        return;
      }

      beginMotion();
      const omega = (2 * Math.PI) / springResponse;
      const stiffness = omega * omega;
      const damping = 2 * springDamping * omega;
      let y = yRef.current;
      let v = velocity * 1000;
      let last: number | null = null;

      const step = (now: number) => {
        // フレームが落ちても動きが崩れないよう、経過時間を細かく刻んで積分する。
        const dt =
          last === null ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
        last = now;
        const steps = Math.max(Math.ceil(dt * 240), 1);
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
          v += (-stiffness * (y - target) - damping * v) * h;
          y += v * h;
        }
        // 最大段より上には行き過ぎない。
        if (y < snaps.full) {
          y = snaps.full;
          v = 0;
        }
        if (Math.abs(y - target) < 0.5 && Math.abs(v) < 20) {
          animation.current = null;
          place(target, snaps);
          endMotion(snaps);
          return;
        }
        place(y, snaps);
        animation.current = requestAnimationFrame(step);
      };
      animation.current = requestAnimationFrame(step);
    },
    [getSnaps, stopAnimation, place, beginMotion, endMotion],
  );

  useLayoutEffect(() => {
    const snaps = getSnaps();
    place(snaps.half, snaps);
    endMotion(snaps);
  }, [getSnaps, place, endMotion]);

  useEffect(() => {
    const controls = controlsRef?.current;
    return () => {
      stopAnimation();
      if (controls) controls.style.transform = '';
    };
  }, [controlsRef, stopAnimation]);

  // シート内の入力欄からフォーカスを外し、キーボードを閉じる。
  const blurFocused = useCallback(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && ref.current?.contains(focused)) {
      focused.blur();
    }
  }, []);

  // 利用者が地図を一定量以上動かしたら、地図を広く見せるためにシートを最小段に下げる。
  // 詳細を開いたときの flyTo などの自動の移動には originalEvent が無いので数えない。
  const { getMap, isReady } = useMap();
  useEffect(() => {
    const map = getMap();
    if (!isReady || !map) return;

    let start: { center: LngLat; zoom: number } | null = null;
    const onMoveStart = (e: { originalEvent?: unknown }) => {
      start = e.originalEvent
        ? { center: map.getCenter(), zoom: map.getZoom() }
        : null;
    };
    const onMove = (e: { originalEvent?: unknown }) => {
      if (!start || !e.originalEvent) return;
      const from = map.project(start.center);
      const to = map.project(map.getCenter());
      const panned = Math.hypot(from.x - to.x, from.y - to.y);
      const zoomed = Math.abs(map.getZoom() - start.zoom);
      if (panned < mapPanThreshold && zoomed < mapZoomThreshold) return;
      start = null;
      const snaps = getSnaps();
      if (yRef.current < snaps.peek) animateTo(snaps.peek, 0, snaps);
      blurFocused();
    };
    const onMoveEnd = () => {
      start = null;
    };

    map.on('movestart', onMoveStart);
    map.on('move', onMove);
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('movestart', onMoveStart);
      map.off('move', onMove);
      map.off('moveend', onMoveEnd);
    };
  }, [getMap, isReady, getSnaps, animateTo, blurFocused]);

  const startDrag = useCallback(
    (clientY: number, timeStamp: number) => {
      // アニメーションの途中で掴んだときは、いま見えている位置からそのまま動かす。
      stopAnimation();
      const snaps = getSnaps();
      drag.current = {
        pointerY: clientY,
        baseY: yRef.current,
        y: yRef.current,
        lastY: clientY,
        lastT: timeStamp,
        velocity: 0,
        snaps,
      };
      beginMotion();
      place(yRef.current, snaps);
    },
    [stopAnimation, getSnaps, beginMotion, place],
  );

  const moveDrag = useCallback(
    (clientY: number, timeStamp: number) => {
      const { snaps } = drag.current;
      if (!snaps) return;
      const dt = Math.max(timeStamp - drag.current.lastT, 1);
      drag.current.velocity = (clientY - drag.current.lastY) / dt;
      drag.current.lastY = clientY;
      drag.current.lastT = timeStamp;

      const max = snaps.peek;
      const raw = drag.current.baseY + (clientY - drag.current.pointerY);
      drag.current.y =
        raw < 0 ? 0 : raw > max ? max + rubberband(raw - max) : raw;
      // 指の動きのイベントは画面の更新より多く届くことがあるため、描画は1フレームに1回にまとめる。
      if (dragFrame.current !== null) return;
      dragFrame.current = requestAnimationFrame(() => {
        dragFrame.current = null;
        if (drag.current.snaps) place(drag.current.y, drag.current.snaps);
      });
    },
    [place],
  );

  const endDrag = useCallback(
    (timeStamp: number) => {
      const { snaps } = drag.current;
      if (!snaps) return;
      // まだ描画していない指の位置を反映してから、そこを起点に動かす。
      stopAnimation();
      place(drag.current.y, snaps);
      const idle = timeStamp - drag.current.lastT > releaseIdleMs;
      const velocity = idle ? 0 : drag.current.velocity;
      const projected = drag.current.y + velocity * projectionMs;
      const { full, half, peek } = snaps;
      const next = [full, half, peek].reduce((a, b) =>
        Math.abs(b - projected) < Math.abs(a - projected) ? b : a,
      );
      animateTo(next, velocity, snaps);
      // 検索中に手でシートを下げたら、キーボードも閉じる。
      if (next !== full) blurFocused();
    },
    [stopAnimation, place, animateTo, blurFocused],
  );

  // タッチはシート全体で受け、シートを伸縮させるかスクロールに任せるかを指の動きから決める。
  // スクロールを止めるには touchmove で preventDefault する必要があり、
  // React のタッチイベントは passive で登録されるため、ネイティブのリスナーを使う。
  useEffect(() => {
    const sheet = ref.current;
    if (!sheet) return;

    let gesture: {
      id: number;
      startX: number;
      startY: number;
      lastY: number;
      scroller: Element | null;
      mode: GestureMode;
    } | null = null;
    let suppressClick = false;

    const findTouch = (list: TouchList) =>
      Array.from(list).find((t) => t.identifier === gesture?.id);

    const toSheet = (fromY: number, timeStamp: number) => {
      if (!gesture) return;
      gesture.mode = 'sheet';
      suppressClick = true;
      startDrag(fromY, timeStamp);
    };

    // 動き始めの向きを判定する。シートを動かすと決まったら true を返す。
    const settle = (e: TouchEvent, touch: Touch, atTop: boolean) => {
      if (!gesture) return false;
      const dx = touch.clientX - gesture.startX;
      const dy = touch.clientY - gesture.startY;
      const mode = classify(dx, dy, yRef.current > 0, atTop);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < dragSlop) {
        // 判定がつくまでの間にブラウザのスクロールが始まらないよう止めておく。
        if (mode === 'sheet') prevent(e);
        return false;
      }
      if (mode !== 'sheet') {
        gesture.mode = mode;
        return false;
      }
      toSheet(gesture.startY, e.timeStamp);
      return true;
    };

    // 最大段で中身を先頭までスクロールしたら、同じ指の動きのままシートの縮みに切り替える。
    // 切り替えたら true を返す。
    const handoff = (touch: Touch, atTop: boolean, timeStamp: number) => {
      if (!gesture) return false;
      const movingDown = touch.clientY > gesture.lastY;
      if (!atTop || !movingDown) return false;
      toSheet(touch.clientY, timeStamp);
      return true;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (gesture) return;
      const touch = e.changedTouches[0];
      suppressClick = false;
      gesture = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        scroller: findScroller(e.target, sheet),
        mode: 'pending',
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = findTouch(e.touches);
      if (!gesture || !touch) return;
      const atTop = !gesture.scroller || gesture.scroller.scrollTop <= 0;
      const { mode } = gesture;
      const moveSheet =
        mode === 'sheet' ||
        (mode === 'pending' && settle(e, touch, atTop)) ||
        (mode === 'scroll' && handoff(touch, atTop, e.timeStamp));
      gesture.lastY = touch.clientY;
      if (!moveSheet) return;

      prevent(e);
      moveDrag(touch.clientY, e.timeStamp);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!gesture || !findTouch(e.changedTouches)) return;
      if (gesture.mode === 'sheet') endDrag(e.timeStamp);
      gesture = null;
    };

    // シートを動かした指を離したときに、指の下の企画行などが押されないようにする。
    const onClick = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd);
    sheet.addEventListener('touchcancel', onTouchEnd);
    sheet.addEventListener('click', onClick, true);
    return () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
      sheet.removeEventListener('touchcancel', onTouchEnd);
      sheet.removeEventListener('click', onClick, true);
    };
  }, [startDrag, moveDrag, endDrag]);

  // マウスでは取っ手だけを掴んで動かす。タッチは上のリスナーが扱う。
  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    mouseDrag.current = { startY: e.clientY, moved: false };
    startDrag(e.clientY, e.timeStamp);
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!mouseDrag.current) return;
    if (Math.abs(e.clientY - mouseDrag.current.startY) >= dragSlop) {
      mouseDrag.current.moved = true;
    }
    moveDrag(e.clientY, e.timeStamp);
  };

  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!mouseDrag.current) return;
    handleDragged.current = mouseDrag.current.moved;
    mouseDrag.current = null;
    endDrag(e.timeStamp);
  };

  // 取っ手を押したら段を切り替える。ドラッグできない利用者にも段の切り替えを用意するため。
  const onHandleClick = () => {
    if (handleDragged.current) {
      handleDragged.current = false;
      return;
    }
    const snaps = getSnaps();
    animateTo(stageRef.current === 'half' ? snaps.full : snaps.half, 0, snaps);
  };

  // 最小段でカードの余白や名前をタップしたら、中段に広げる。
  const onCardClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (stageRef.current !== 'peek') return;
    const target = e.target as Element;
    if (
      target.closest(
        'a, button, input, select, textarea, label, [role="button"]',
      )
    ) {
      return;
    }
    animateTo(getSnaps().half);
  };

  // 最小段でキーボード操作によりカードの外へフォーカスが移ったら、中段に広げて見せる。
  const onCardFocus = (e: ReactFocusEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (stageRef.current !== 'peek' || !card) return;
    const cardBottom = card.getBoundingClientRect().bottom;
    if (e.target.getBoundingClientRect().bottom > cardBottom) {
      animateTo(getSnaps().half);
    }
  };

  const panelApi = useMemo<MapPanelApi>(
    () => ({
      expand: () => animateTo(getSnaps().full),
      raise: () => animateTo(getSnaps().half),
      collapse: () => animateTo(getSnaps().peek),
    }),
    [getSnaps, animateTo],
  );

  return (
    <div
      ref={ref}
      data-stage={stage}
      data-peek={stage === 'peek' || undefined}
      className={sheetStyles}
    >
      <div ref={safeAreaRef} className={safeAreaStyles} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: キーボードでは取っ手のボタンで同じ操作ができる */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: 最小段のタップを広げる操作として扱う */}
      <div
        ref={cardRef}
        className={cardStyles}
        onClick={onCardClick}
        onFocus={onCardFocus}
      >
        <div ref={innerRef} className={innerStyles}>
          <MapPanelContext.Provider value={panelApi}>
            <div ref={contentRef} className={contentStyles}>
              {children}
            </div>
          </MapPanelContext.Provider>
        </div>
      </div>
      <button
        ref={handleRef}
        type="button"
        aria-label={stage === 'full' ? 'シートを縮める' : 'シートを広げる'}
        className={handleAreaStyles}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onHandleClick}
      >
        <span className={handleStyles} />
      </button>
    </div>
  );
}
