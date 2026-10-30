import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { css } from '../../../../styled-system/css';
import { type FestivalDay, formatDate, formatTime, MINUTE_MS } from './api';

const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const JST_OFFSET_MS = 9 * HOUR_MS;

// Canvas は CSS 変数を解釈できないため、トークンの値を直接持つ。
const TICK_COLOR = '#a3c8eb'; // token('colors.brand.100')
const LABEL_COLOR = '#2f6fb0'; // token('colors.accent.text')
const DAY_LINE_COLOR = '#4a93d7'; // token('colors.accent')
// 記録の無い時間帯は期間の中でも薄く色を付け、期間の外は灰色の斜線ではっきり分ける。
const NO_DATA_COLOR = 'rgba(74, 147, 215, 0.08)';
const OUTSIDE_COLOR = '#e9ecef';
const OUTSIDE_STRIPE_COLOR = '#d3d8de';

/** 表示している幅に合う目盛りの間隔（ミリ秒）。 */
function tickInterval(viewDuration: number): number {
  if (viewDuration > 2 * DAY_MS) return 6 * HOUR_MS;
  if (viewDuration > 12 * HOUR_MS) return 3 * HOUR_MS;
  if (viewDuration > 4 * HOUR_MS) return HOUR_MS;
  if (viewDuration > HOUR_MS) return 15 * MINUTE_MS;
  if (viewDuration > 20 * MINUTE_MS) return 5 * MINUTE_MS;
  return MINUTE_MS;
}

/** 日本時間の 0時の目盛りは日付、それ以外は時刻。 */
function tickLabel(t: number): string {
  const jst = new Date(t + JST_OFFSET_MS);
  if (jst.getUTCHours() === 0 && jst.getUTCMinutes() === 0) {
    return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`;
  }
  return `${jst.getUTCHours()}:${String(jst.getUTCMinutes()).padStart(2, '0')}`;
}

type View = { start: number; duration: number; msPerPx: number };

const toX = ({ start, msPerPx }: View, t: number) => (t - start) / msPerPx;

const fillRange = (
  ctx: CanvasRenderingContext2D,
  view: View,
  from: number,
  to: number,
) => {
  if (to > from) {
    ctx.fillRect(toX(view, from), 0, toX(view, to) - toX(view, from), HEIGHT);
  }
};

/** 期間の外を灰色の斜線で塗る。 */
function drawOutside(
  ctx: CanvasRenderingContext2D,
  view: View,
  width: number,
  min: number,
  max: number,
) {
  const left = Math.max(0, Math.min(width, toX(view, min)));
  const right = Math.max(0, Math.min(width, toX(view, max)));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, left, HEIGHT);
  ctx.rect(right, 0, width - right, HEIGHT);
  ctx.clip();
  ctx.fillStyle = OUTSIDE_COLOR;
  ctx.fillRect(0, 0, width, HEIGHT);
  ctx.strokeStyle = OUTSIDE_STRIPE_COLOR;
  ctx.lineWidth = 1;
  for (let x = -HEIGHT; x < width; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, HEIGHT);
    ctx.lineTo(x + HEIGHT, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** 日の区切りに線を引き、各日の左端（画面に入っている所）に日の名前を出す。 */
function drawDays(
  ctx: CanvasRenderingContext2D,
  view: View,
  width: number,
  days: FestivalDay[],
) {
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const { start, end, label } of days) {
    const x0 = toX(view, start);
    const x1 = toX(view, end);
    if (x1 < 0 || x0 > width) continue;
    ctx.strokeStyle = DAY_LINE_COLOR;
    ctx.lineWidth = 2;
    for (const x of [x0, x1]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    // 日の始まりが画面の左へ出ても、名前は画面の左端に残す（次の日の名前とは重ねない）。
    const textX = Math.min(
      Math.max(x0, 0) + 6,
      x1 - ctx.measureText(label).width - 6,
    );
    if (textX < x0) continue;
    ctx.fillStyle = DAY_LINE_COLOR;
    ctx.fillText(label, textX, HEIGHT - 6);
  }
}

/** 目盛りと時刻を描く。0時は日の区切り（drawDays）に任せ、日付だけを出す。 */
function drawTicks(
  ctx: CanvasRenderingContext2D,
  view: View,
  min: number,
  max: number,
) {
  const interval = tickInterval(view.duration);
  const first =
    Math.ceil((view.start + JST_OFFSET_MS) / interval) * interval -
    JST_OFFSET_MS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (
    let t = Math.max(first, min);
    t <= Math.min(view.start + view.duration, max);
    t += interval
  ) {
    const x = toX(view, t);
    const isDay = (t + JST_OFFSET_MS) % DAY_MS === 0;
    if (!isDay) {
      ctx.strokeStyle = TICK_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 19);
      ctx.lineTo(x, 25);
      ctx.stroke();
    }
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `${isDay ? 700 : 600} 10px sans-serif`;
    // 日付は日の区切りの線に重ねず、その右に置く。
    ctx.textAlign = isDay ? 'left' : 'center';
    ctx.fillText(tickLabel(t), isDay ? x + 6 : x, 6);
  }
}

function useWidth(ref: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const HEIGHT = 44;

/**
 * 時間軸を左右にドラッグして動かし、ホイールで拡大・縮小し、押した所の時刻へ移るバー。
 * 動かせるのは days（雙峰祭の日）の中だけ。日ごとに区切って名前を出し、期間の外は斜線、
 * 記録の無い時間帯は薄い色で塗る。
 */
export default function TimeBar({
  time,
  days,
  dataFrom,
  dataTo,
  onChange,
}: {
  time: number;
  days: FestivalDay[];
  dataFrom: number | null;
  dataTo: number | null;
  onChange: (time: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const width = useWidth(containerRef);
  const min = days[0]?.start ?? 0;
  const max = days.at(-1)?.end ?? 0;
  const clampTime = (t: number) => Math.min(max, Math.max(min, t));

  const [viewDuration, setViewDuration] = useState(6 * HOUR_MS);
  const [viewCenter, setViewCenter] = useState(time);
  const start = viewCenter - viewDuration / 2;
  const msPerPx = viewDuration / width;

  // 再生などで時刻が表示の外へ出たら、その時刻を中心に表示し直す。
  useEffect(() => {
    const margin = viewDuration * 0.05;
    if (
      time < viewCenter - viewDuration / 2 + margin ||
      time > viewCenter + viewDuration / 2 - margin
    ) {
      setViewCenter(time);
    }
  }, [time, viewCenter, viewDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);
    const view = { start, duration: viewDuration, msPerPx };
    ctx.fillStyle = NO_DATA_COLOR;
    if (dataFrom === null || dataTo === null) fillRange(ctx, view, min, max);
    else {
      fillRange(ctx, view, min, dataFrom);
      fillRange(ctx, view, dataTo, max);
    }
    drawOutside(ctx, view, width, min, max);
    drawDays(ctx, view, width, days);
    drawTicks(ctx, view, min, max);
  }, [width, start, msPerPx, viewDuration, min, max, days, dataFrom, dataTo]);

  // ホイールの既定のスクロールを止めるため、passive でない登録にする。
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = Math.min(
        max - min,
        Math.max(
          10 * MINUTE_MS,
          viewDuration * (e.deltaY > 0 ? 1.15 : 1 / 1.15),
        ),
      );
      const rect = container.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const atPointer = start + ratio * viewDuration;
      setViewDuration(next);
      setViewCenter(clampTime(atPointer - ratio * next + next / 2));
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  });

  const drag = useRef<{ startX: number; lastX: number; moved: boolean } | null>(
    null,
  );
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, lastX: e.clientX, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    if (Math.abs(e.clientX - current.startX) > 5) current.moved = true;
    const deltaX = e.clientX - current.lastX;
    current.lastX = e.clientX;
    setViewCenter((center) => clampTime(center - deltaX * msPerPx));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = null;
    if (!current || current.moved || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onChange(clampTime(start + (e.clientX - rect.left) * msPerPx));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 * MINUTE_MS : MINUTE_MS;
    if (e.key === 'ArrowLeft') onChange(clampTime(time - step));
    else if (e.key === 'ArrowRight') onChange(clampTime(time + step));
    else return;
    e.preventDefault();
  };

  const currentX = (time - start) / msPerPx;

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="表示する時刻"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={time}
      aria-valuetext={`${formatDate(time)} ${formatTime(time)}`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={onKeyDown}
      className={css({
        position: 'relative',
        h: `${HEIGHT}px`,
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        _active: { cursor: 'grabbing' },
        _focusVisible: {
          outline: '2px solid token(colors.accent)',
          outlineOffset: '-2px',
        },
      })}
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${HEIGHT}px` }}
        className={css({ display: 'block' })}
      />
      {currentX >= 0 && currentX <= width && (
        <div
          aria-hidden="true"
          className={css({
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            w: '2px',
            bg: 'accent',
            pointerEvents: 'none',
          })}
          style={{ transform: `translateX(${currentX - 1}px)` }}
        />
      )}
    </div>
  );
}
