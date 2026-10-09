import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css, cx } from '../../../../styled-system/css';
import { type MapPanelApi, MapPanelContext } from './mapPanel';

/** 最小段の高さ(px)。取っ手と検索欄（ProjectSearchBar の1段目）が見える。 */
export const SHEET_PEEK = 78;
/** 最大段・中段の高さ（画面縦幅に対する割合）。 */
const fullRatio = 0.9;
const halfRatio = 0.5;
// 指を離した位置に「速度(px/ms) × この時間」を足した位置を、止まる位置の予測とする。
const projectionMs = 200;
// 指を止めてから離すまでにこれ以上間が空いたら、勢いはないものとする。
const releaseIdleMs = 100;
// 指がこれ以上動くまではタップとみなし、シートを動かさない。
const dragSlop = 8;
const rubberDim = 200;

interface BottomSheetProps {
  children?: ReactNode;
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
  transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
  touchAction: 'none',
});

const contentStyles = css({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  touchAction: 'pan-y',
});

const noTransitionStyles = css({
  transition: 'none!',
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

export default function BottomSheet({ children }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  const yRef = useRef(y);
  yRef.current = y;
  const [dragging, setDragging] = useState(false);
  // シートの下端のうち画面外にはみ出している高さ。中身のスクロール領域をこの分だけ縮め、
  // どの開き具合でも末尾まで画面内にスクロールできるようにする。広げるのは即座に、縮めるのは
  // シートが下がりきってからにして、閉じる途中で中身が先に切れて空白が見えないようにする。
  const [offscreen, setOffscreen] = useState(0);
  const drag = useRef({
    pointerY: 0,
    baseY: 0,
    y: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
  });
  const mouseDragging = useRef(false);

  // 各段でのシートの移動量（上端が最大段の位置から下がる距離）。
  const getSnaps = useCallback(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const viewport = height / fullRatio;
    return {
      full: 0,
      half: Math.max(height - viewport * halfRatio, 0),
      peek: Math.max(height - SHEET_PEEK, 0),
    };
  }, []);

  useLayoutEffect(() => {
    const { half } = getSnaps();
    setY(half);
    setOffscreen(half);
  }, [getSnaps]);

  useLayoutEffect(() => {
    if (y < offscreen) setOffscreen(y);
  }, [y, offscreen]);

  const startDrag = useCallback((clientY: number, timeStamp: number) => {
    drag.current = {
      pointerY: clientY,
      baseY: yRef.current,
      y: yRef.current,
      lastY: clientY,
      lastT: timeStamp,
      velocity: 0,
    };
    setDragging(true);
  }, []);

  const moveDrag = useCallback(
    (clientY: number, timeStamp: number) => {
      const dt = Math.max(timeStamp - drag.current.lastT, 1);
      drag.current.velocity = (clientY - drag.current.lastY) / dt;
      drag.current.lastY = clientY;
      drag.current.lastT = timeStamp;

      const max = getSnaps().peek;
      const raw = drag.current.baseY + (clientY - drag.current.pointerY);
      const next = raw < 0 ? 0 : raw > max ? max + rubberband(raw - max) : raw;
      drag.current.y = next;
      setY(next);
    },
    [getSnaps],
  );

  const endDrag = useCallback(
    (timeStamp: number) => {
      const idle = timeStamp - drag.current.lastT > releaseIdleMs;
      const projected =
        drag.current.y + (idle ? 0 : drag.current.velocity * projectionMs);
      const { full, half, peek } = getSnaps();
      const next = [full, half, peek].reduce((a, b) =>
        Math.abs(b - projected) < Math.abs(a - projected) ? b : a,
      );
      setY(next);
      setDragging(false);
      // 検索中に手でシートを下げたら、キーボードも閉じる。
      const focused = document.activeElement;
      if (
        next !== full &&
        focused instanceof HTMLElement &&
        ref.current?.contains(focused)
      ) {
        focused.blur();
      }
    },
    [getSnaps],
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
      expand: () => setY(getSnaps().full),
      raise: () => setY(getSnaps().half),
      collapse: () => setY(getSnaps().peek),
    }),
    [getSnaps],
  );

  return (
    <div
      ref={ref}
      className={cx(sheetStyles, dragging && noTransitionStyles)}
      // 小数pxだと中身がサブピクセル位置で描画され、境目に隙間やちらつきが出るため丸める。
      style={{ transform: `translate3d(0, ${Math.round(y)}px, 0)` }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'transform') {
          setOffscreen(y);
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
        <div
          className={contentStyles}
          style={{ marginBottom: Math.round(offscreen) }}
        >
          {children}
        </div>
      </MapPanelContext.Provider>
    </div>
  );
}
