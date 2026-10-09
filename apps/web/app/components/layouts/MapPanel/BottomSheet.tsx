import {
  type PointerEvent,
  type ReactNode,
  useCallback,
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
const rubberDim = 200;

interface BottomSheetProps {
  children?: ReactNode;
}

const rubberband = (overflow: number) =>
  (1 - 1 / ((overflow * 0.55) / rubberDim + 1)) * rubberDim;

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
  const [dragging, setDragging] = useState(false);
  // シートの下端のうち画面外にはみ出している高さ。中身のスクロール領域をこの分だけ縮め、
  // どの開き具合でも末尾まで画面内にスクロールできるようにする。広げるのは即座に、縮めるのは
  // シートが下がりきってからにして、閉じる途中で中身が先に切れて空白が見えないようにする。
  const [offscreen, setOffscreen] = useState(0);
  const drag = useRef({
    pointerY: 0,
    baseY: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
  });

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

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerY: e.clientY,
      baseY: y,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
    setDragging(true);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dt = Math.max(e.timeStamp - drag.current.lastT, 1);
    drag.current.velocity = (e.clientY - drag.current.lastY) / dt;
    drag.current.lastY = e.clientY;
    drag.current.lastT = e.timeStamp;

    const max = getSnaps().peek;
    const raw = drag.current.baseY + (e.clientY - drag.current.pointerY);
    const next = raw < 0 ? 0 : raw > max ? max + rubberband(raw - max) : raw;
    setY(next);
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const idle = e.timeStamp - drag.current.lastT > releaseIdleMs;
    const projected = y + (idle ? 0 : drag.current.velocity * projectionMs);
    const { full, half, peek } = getSnaps();
    const next = [full, half, peek].reduce((a, b) =>
      Math.abs(b - projected) < Math.abs(a - projected) ? b : a,
    );
    setY(next);
    setDragging(false);
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
