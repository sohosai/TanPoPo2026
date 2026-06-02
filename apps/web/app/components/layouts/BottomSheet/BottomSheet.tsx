import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { css, cx } from '../../../../styled-system/css';

// デフォルトは50
const peek = 50;
const flingVelocity = 0.5;
const rubberDim = 200;

interface MapBottomSheetProps {
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
  h: '95vh',
  bg: 'sheet.background',
  borderRadius: '16px 16px 0 0',
  boxShadow: '0 -8px 24px {colors.sheet.shadow}',
  transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
  touchAction: 'none',
});

const noTransitionStyles = css({
  transition: 'none!',
});

const handleAreaStyles = css({
  h: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
});

const handleStyles = css({
  w: '42px',
  h: '5px',
  borderRadius: '999px',
  bg: 'sheet.handle',
});

export default function MapBottomSheet({ children }: MapBottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({
    pointerY: 0,
    baseY: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
  });

  const getMax = useCallback(
    () => Math.max((ref.current?.offsetHeight ?? 0) - peek, 0),
    [],
  );

  useLayoutEffect(() => {
    setY(getMax());
  }, [getMax]);

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

    const max = getMax();
    const raw = drag.current.baseY + (e.clientY - drag.current.pointerY);
    const next = raw < 0 ? 0 : raw > max ? max + rubberband(raw - max) : raw;
    setY(next);
  };

  const onUp = () => {
    const max = getMax();
    const v = drag.current.velocity;
    const next =
      Math.abs(v) > flingVelocity ? (v > 0 ? max : 0) : y < max / 2 ? 0 : max;
    setY(next);
    setDragging(false);
  };

  return (
    <div
      ref={ref}
      className={cx(sheetStyles, dragging && noTransitionStyles)}
      style={{ transform: `translateY(${y}px)` }}
    >
      <div
        className={handleAreaStyles}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className={handleStyles} />
        {children}
      </div>
    </div>
  );
}
