import type { CSSProperties, SVGProps } from 'react';
import { css } from '../../../../styled-system/css';

// 種の付け根を原点に、上へ伸びる軸と、その先で扇形に開く冠毛。
const SEED_PATH =
  'M0 0V-12M0 -12L-6.58 -14.39M0 -12L-4.95 -16.95M0 -12L-2.39 -18.58M0 -12L0 -19M0 -12L2.39 -18.58M0 -12L4.95 -16.95M0 -12L6.58 -14.39';
const LOADER_SEED_COUNT = 3;
// 1本が昇りきるまでの秒数。種どうしはこれを本数で割った間隔でずらす。
const LOADER_RISE_SECONDS = 4.5;

/**
 * タンポポの綿毛の種1本。色は currentColor。
 * 冠毛の付け根は横の中央・上から 33% の位置にある。
 */
export function FluffSeed({
  height,
  ...props
}: { height: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="-8 -20 16 24"
      width={(height * 16) / 24}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d={SEED_PATH} />
      <ellipse
        cx="0"
        cy="1.5"
        rx="1.1"
        ry="2"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/**
 * 宙に浮いている種1本。
 * 上下の浮き沈みと、冠毛を支点にした振り子の揺れを別の周期で重ね、同じ動きの繰り返しに見せない。
 */
export function FluffDrift({
  size,
  strokeWidth,
}: {
  size: number;
  strokeWidth?: number;
}) {
  return (
    <span
      className={css({
        display: 'inline-flex',
        animation: 'fluffBob 6s ease-in-out infinite',
        _motionReduce: { animation: 'none' },
      })}
    >
      <FluffSeed
        height={size}
        strokeWidth={strokeWidth}
        className={css({
          transformOrigin: '50% 33%',
          animation: 'fluffSway 8s ease-in-out infinite',
          _motionReduce: { animation: 'none' },
        })}
      />
    </span>
  );
}

/** 読み込み中の表示。宙に浮いた種が、間を置いて1本ずつゆっくり昇っていく。 */
export function FluffLoader({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
      })}
    >
      {Array.from({ length: LOADER_SEED_COUNT }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 本数が固定の飾り
          key={i}
          style={
            {
              '--rise': `${size * 0.3}px`,
              // 負の遅れで、表示した時点からそれぞれ昇る途中にいるようにする。
              animationDelay: `${(-i * LOADER_RISE_SECONDS) / LOADER_SEED_COUNT}s`,
            } as CSSProperties
          }
          className={css({
            display: 'inline-flex',
            animation: 'fluffRise 4.5s ease-in-out infinite',
            _motionReduce: { animation: 'none' },
          })}
        >
          <FluffDrift size={size * 0.5} strokeWidth={2} />
        </span>
      ))}
    </span>
  );
}
