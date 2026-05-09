import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import styles from './MapBottomSheet.module.scss';

const peek = 50;
const flingVelocity = 0.5;
const rubberDim = 200;

const rubberband = (overflow: number) =>
  (1 - 1 / ((overflow * 0.55) / rubberDim + 1)) * rubberDim;

export default function MapBottomSheet() {
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

  const getMax = () => Math.max((ref.current?.offsetHeight ?? 0) - peek, 0);

  useLayoutEffect(() => {
    setY(getMax());
  }, []);

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
      Math.abs(v) > flingVelocity
        ? v > 0
          ? max
          : 0
        : y < max / 2
          ? 0
          : max;
    setY(next);
    setDragging(false);
  };

  return (
    <div
      ref={ref}
      className={`${styles.sheet} ${dragging ? styles.noTransition : ''}`}
      style={{ transform: `translateY(${y}px)` }}
    >
      <div
        className={styles.handleArea}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className={styles.handle} />
      </div>
    </div>
  );
}
