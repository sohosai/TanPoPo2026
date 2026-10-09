import type { LngLat } from 'maplibre-gl';
import {
  type PointerEvent,
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

/** 最小段の高さ(px)。取っ手と検索欄（ProjectSearchBar の1段目）が見える。 */
export const SHEET_PEEK = 78;
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
const sheetTransition = 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)';

interface BottomSheetProps {
  children?: ReactNode;
  /** シートの上端に追従させる地図コントロールの要素。 */
  controlsRef?: RefObject<HTMLDivElement | null>;
}

interface Snaps {
  full: number;
  half: number;
  peek: number;
}

const rubberband = (overflow: number) =>
  (1 - 1 / ((overflow * 0.55) / rubberDim + 1)) * rubberDim;

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
  display: 'flex',
  flexDirection: 'column',
  bg: 'sheet.background',
  borderTopRadius: '2xl',
  boxShadow: 'sheet',
  touchAction: 'none',
});

const contentStyles = css({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  touchAction: 'pan-y',
});

const handleAreaStyles = css({
  h: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
});

const handleStyles = css({
  w: '42px',
  h: '5px',
  borderRadius: 'full',
  bg: 'sheet.handle',
});

export default function BottomSheet({
  children,
  controlsRef,
}: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  // シートの位置（上端が最大段の位置から下がる距離）。ドラッグ中は指の動きごとに変わるため、
  // React の state を通さず、place() で DOM の transform に直接書き込む。
  const yRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  // 動いているあいだ画面の下端に留める要素（中身の下端に貼り付く data-sheet-bottom）。
  const pinned = useRef<HTMLElement[]>([]);
  const [atPeek, setAtPeek] = useState(false);
  const drag = useRef({
    pointerY: 0,
    baseY: 0,
    y: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
    snaps: { full: 0, half: 0, peek: 0 } as Snaps,
  });
  const mouseDragging = useRef(false);

  // 各段でのシートの位置。
  const getSnaps = useCallback((): Snaps => {
    const height = ref.current?.offsetHeight ?? 0;
    const viewport = height / fullRatio;
    return {
      full: 0,
      half: Math.max(height - viewport * halfRatio, 0),
      peek: Math.max(height - SHEET_PEEK, 0),
    };
  }, []);

  // いま画面に見えているシートの位置。アニメーションの途中では目標の段と異なる。
  const visualY = useCallback(() => {
    const sheet = ref.current;
    if (!sheet) return yRef.current;
    return new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;
  }, []);

  // シートが動き出すときに呼ぶ。動いているあいだは中身の下端をシートの下端（画面外）まで伸ばし、
  // 指の動きごとにレイアウトし直さない。中身の下端に貼り付く要素は、シートの動きを打ち消す向きに
  // 動かして画面の下端に留める。
  const beginMotion = useCallback((from: number) => {
    const sheet = ref.current;
    const content = contentRef.current;
    if (!sheet || !content) return;
    content.style.marginBottom = '0px';
    pinned.current = Array.from(
      sheet.querySelectorAll<HTMLElement>('[data-sheet-bottom]'),
    );
    for (const el of pinned.current) {
      el.style.transition = 'none';
      el.style.transform = `translate3d(0, ${-Math.round(from)}px, 0)`;
    }
    // 続けてアニメーションを指定したときに、ここで置いた位置から動き出すよう確定させる。
    sheet.getBoundingClientRect();
  }, []);

  // シートが止まったときに呼ぶ。中身の下端を画面の下端にそろえ、どの段でも末尾まで
  // 画面内にスクロールできるようにする。留めていた要素は本来の位置に戻す。
  const endMotion = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    content.style.marginBottom = `${Math.round(yRef.current)}px`;
    for (const el of pinned.current) {
      el.style.transition = '';
      el.style.transform = '';
    }
    pinned.current = [];
  }, []);

  // シートを next の位置へ動かす。animate が false のときはアニメーションせずに動かす。
  const place = useCallback(
    (next: number, animate: boolean, snaps: Snaps = getSnaps()) => {
      const sheet = ref.current;
      if (!sheet) return;
      yRef.current = next;
      const transition = animate ? sheetTransition : 'none';
      sheet.style.transition = transition;
      // 小数pxだと中身がサブピクセル位置で描画され、境目に隙間やちらつきが出るため丸める。
      sheet.style.transform = `translate3d(0, ${Math.round(next)}px, 0)`;

      // 地図コントロールも同じ動きでシートの上端に追従させる。
      // 追従は中段までとし、それより上ではシートに隠れる。
      const controls = controlsRef?.current;
      if (controls) {
        const lift = Math.max(next, snaps.half) - snaps.peek;
        controls.style.transition = transition;
        controls.style.transform = `translate3d(0, ${Math.round(lift)}px, 0)`;
      }

      for (const el of pinned.current) {
        el.style.transition = transition;
        el.style.transform = `translate3d(0, ${-Math.round(next)}px, 0)`;
      }

      // 最小段の付近（中段との中間より下）にあるあいだ data-peek を付け、中身が最小段向けの表示に
      // 切り替えられるようにする。ドラッグ中も位置で判定し、最小段から上下に引いても表示を保つ。
      setAtPeek(next > (snaps.half + snaps.peek) / 2);
    },
    [getSnaps, controlsRef],
  );

  // アニメーションで next の段へ動かす。
  const animateTo = useCallback(
    (next: number, snaps: Snaps = getSnaps()) => {
      const from = visualY();
      // 位置が変わらないと transitionend が来ないため、その場で止まったものとして扱う。
      if (Math.round(from) === Math.round(next)) {
        place(next, false, snaps);
        endMotion();
        return;
      }
      beginMotion(from);
      place(next, true, snaps);
    },
    [getSnaps, visualY, beginMotion, place, endMotion],
  );

  useLayoutEffect(() => {
    const snaps = getSnaps();
    place(snaps.half, false, snaps);
    endMotion();
  }, [getSnaps, place, endMotion]);

  useEffect(() => {
    const controls = controlsRef?.current;
    return () => {
      if (!controls) return;
      controls.style.transition = '';
      controls.style.transform = '';
    };
  }, [controlsRef]);

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
      if (yRef.current < snaps.peek) animateTo(snaps.peek, snaps);
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
      // アニメーションの途中で掴んだときは、目標の段ではなくいま見えている位置から動かす。
      const current = visualY();
      const snaps = getSnaps();
      drag.current = {
        pointerY: clientY,
        baseY: current,
        y: current,
        lastY: clientY,
        lastT: timeStamp,
        velocity: 0,
        snaps,
      };
      beginMotion(current);
      place(current, false, snaps);
    },
    [visualY, getSnaps, beginMotion, place],
  );

  const moveDrag = useCallback(
    (clientY: number, timeStamp: number) => {
      const dt = Math.max(timeStamp - drag.current.lastT, 1);
      drag.current.velocity = (clientY - drag.current.lastY) / dt;
      drag.current.lastY = clientY;
      drag.current.lastT = timeStamp;

      const { snaps } = drag.current;
      const max = snaps.peek;
      const raw = drag.current.baseY + (clientY - drag.current.pointerY);
      const next = raw < 0 ? 0 : raw > max ? max + rubberband(raw - max) : raw;
      drag.current.y = next;
      place(next, false, snaps);
    },
    [place],
  );

  const endDrag = useCallback(
    (timeStamp: number) => {
      const idle = timeStamp - drag.current.lastT > releaseIdleMs;
      const projected =
        drag.current.y + (idle ? 0 : drag.current.velocity * projectionMs);
      const { snaps } = drag.current;
      const { full, half, peek } = snaps;
      const next = [full, half, peek].reduce((a, b) =>
        Math.abs(b - projected) < Math.abs(a - projected) ? b : a,
      );
      animateTo(next, snaps);
      // 検索中に手でシートを下げたら、キーボードも閉じる。
      if (next !== full) blurFocused();
    },
    [animateTo, blurFocused],
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
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    mouseDragging.current = true;
    startDrag(e.clientY, e.timeStamp);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (mouseDragging.current) moveDrag(e.clientY, e.timeStamp);
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!mouseDragging.current) return;
    mouseDragging.current = false;
    endDrag(e.timeStamp);
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
      data-peek={atPeek || undefined}
      className={sheetStyles}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'transform') {
          endMotion();
        }
      }}
    >
      <div
        className={handleAreaStyles}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className={handleStyles} />
      </div>
      <MapPanelContext.Provider value={panelApi}>
        <div ref={contentRef} className={contentStyles}>
          {children}
        </div>
      </MapPanelContext.Provider>
    </div>
  );
}
