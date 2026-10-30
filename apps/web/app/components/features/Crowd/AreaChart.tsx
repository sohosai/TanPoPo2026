import type { CrowdAreaMinute } from 'api';
import { ALL_AREAS_ID } from 'api/domain/crowdConstants';
import { type PointerEvent, useMemo, useState } from 'react';
import { css } from '../../../../styled-system/css';
import { type FestivalDay, formatDate, MINUTE_MS } from './api';

export type AreaSeries = { id: string; name: string; color: string };

const WIDTH = 320;
const HEIGHT = 140;
const PAD = { top: 8, right: 8, bottom: 18, left: 30 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  });

/** きりのよい目盛り（1, 2, 5 × 10^n）で、最大値を超える最小の上端。 */
function niceMax(value: number): number {
  if (value <= 0) return 5;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

/**
 * 会場エリアごとの人数（1分ごとの端末の数）の、雙峰祭の期間（days）全体での推移。全体は色を使わず文字の色の線にする。
 * 線の上をなぞると、その分の各エリアの人数を出す。押すとその時刻へ移る。
 * 各エリアの線の色は面とのコントラストが低いものがあるため、下の表で数値を必ず文字で示す。
 */
export default function AreaChart({
  rows,
  days,
  series,
  time,
  onSelectTime,
}: {
  rows: CrowdAreaMinute[];
  days: FestivalDay[];
  series: AreaSeries[];
  time: number;
  onSelectTime: (time: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const { byMinute, max } = useMemo(() => {
    const byMinute = new Map<number, Map<string, number>>();
    for (const { minute, areaId, devices } of rows) {
      const values = byMinute.get(minute) ?? new Map();
      values.set(areaId, devices);
      byMinute.set(minute, values);
    }
    return {
      byMinute,
      max: niceMax(Math.max(0, ...rows.map(({ devices }) => devices))),
    };
  }, [rows]);

  const from = days[0]?.start ?? 0;
  const to = (days.at(-1)?.end ?? from) - MINUTE_MS;
  const span = Math.max(to - from, MINUTE_MS);
  const x = (t: number) => PAD.left + ((t - from) / span) * PLOT_W;
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const minuteAt = (t: number) =>
    Math.min(to, Math.max(from, Math.round(t / MINUTE_MS) * MINUTE_MS));
  const valueAt = (minute: number, id: string) => byMinute.get(minute)?.get(id);
  // 集計の無い分（Cron が止まっていた間など）は0人と描かず、線を切る。
  const pathOf = (id: string) => {
    let d = '';
    let drawing = false;
    for (let m = from; m <= to; m += MINUTE_MS) {
      const value = valueAt(m, id);
      if (value === undefined) {
        drawing = false;
        continue;
      }
      d += `${drawing ? 'L' : 'M'}${x(m)},${y(value)}`;
      drawing = true;
    }
    return d;
  };

  const pointerTime = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    return minuteAt(from + ((svgX - PAD.left) / PLOT_W) * span);
  };
  const shown = hover ?? minuteAt(time);
  const inRange = time >= from && time <= to + MINUTE_MS;

  return (
    <div
      className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="会場エリアごとの人数の推移"
        className={css({
          w: '100%',
          h: 'auto',
          cursor: 'crosshair',
          touchAction: 'none',
        })}
        onPointerMove={(e) => setHover(pointerTime(e))}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(e) => onSelectTime(pointerTime(e))}
      >
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="#e4e3dd"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 4}
              y={y(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill="#6b6a62"
            >
              {v}
            </text>
          </g>
        ))}
        {days.map(({ start, end, label }) => (
          <g key={start}>
            <line
              x1={x(start)}
              x2={x(start)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="#e4e3dd"
              strokeWidth={1}
            />
            <text
              x={x((start + end) / 2)}
              y={HEIGHT - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#6b6a62"
            >
              {label}
            </text>
          </g>
        ))}
        {series.map(({ id, color }) => (
          <path
            key={id}
            d={pathOf(id)}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {inRange && (
          <line
            x1={x(minuteAt(time))}
            x2={x(minuteAt(time))}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="#1f2834"
            strokeWidth={1.5}
          />
        )}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="#6b6a62"
            strokeDasharray="3 3"
          />
        )}
      </svg>
      <table className={css({ fontSize: 'xs', borderCollapse: 'collapse' })}>
        <caption
          className={css({ textAlign: 'left', color: 'fg.subtle', mb: '2px' })}
        >
          {formatDate(shown)} {hhmm(shown)} の人数
          {hover !== null ? '（なぞった時刻）' : ''}
        </caption>
        <tbody>
          {series.map(({ id, name, color }) => (
            <tr key={id}>
              <td className={css({ py: '1px', pr: '6px' })}>
                <span
                  aria-hidden="true"
                  className={css({
                    display: 'inline-block',
                    w: '10px',
                    h: '3px',
                    borderRadius: '2px',
                    mr: '6px',
                    verticalAlign: 'middle',
                  })}
                  style={{ background: color }}
                />
                {name}
              </td>
              <td
                className={css({
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: id === ALL_AREAS_ID ? 700 : 400,
                  color: 'fg.strong',
                })}
              >
                {valueAt(shown, id) === undefined
                  ? '—'
                  : `${valueAt(shown, id)}人`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
