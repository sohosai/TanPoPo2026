import { IconSparkles } from '@tabler/icons-react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { css } from '../../../../styled-system/css';

const DRAW_DURATION_MS = 1800;

type GrandprixResultProps = {
  result: 'win' | 'lose' | null;
  /**
   * true の場合のみ「回している最中」の演出を再生する。
   * 既に結果が確定しているページの再訪問時（false）は演出なしで即結果を表示する。
   */
  animate?: boolean;
};

export default function GrandprixResult({
  result,
  animate = false,
}: GrandprixResultProps) {
  const [phase, setPhase] = useState<'drawing' | 'revealed'>(
    animate ? 'drawing' : 'revealed',
  );

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setPhase('revealed'), DRAW_DURATION_MS);
    return () => clearTimeout(timer);
  }, [animate]);

  const isWin = result === 'win';

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        minHeight: '60vh',
        px: '24px',
        textAlign: 'center',
        overflow: 'hidden',
      })}
    >
      {phase === 'drawing' && (
        <p className={css({ fontSize: '13px', color: 'fg.subtle' })}>
          抽選中です...
        </p>
      )}

      <div
        className={css({
          position: 'relative',
          width: '200px',
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {phase === 'drawing' ? (
          <RouletteWheel />
        ) : isWin ? (
          <WinBadge key={result} />
        ) : (
          <LoseBadge key={result} />
        )}
      </div>

      {phase === 'revealed' && (
        <p
          className={css({
            fontSize: '13px',
            color: 'fg.muted',
            lineHeight: 1.7,
          })}
        >
          {isWin
            ? 'この画面を福引所の係員にお見せください。'
            : 'ご参加ありがとうございました。また次の機会にぜひ！'}
        </p>
      )}
    </div>
  );
}

function RouletteWheel() {
  return (
    <>
      {/* ルーレットの位置マーカー */}
      <div
        className={css({
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '12px solid token(colors.accent)',
          zIndex: 1,
        })}
      />
      <div
        className={css({
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background:
            'conic-gradient(token(colors.accent) 0deg 60deg, token(colors.accent.subtle) 60deg 120deg, token(colors.accent) 120deg 180deg, token(colors.accent.subtle) 180deg 240deg, token(colors.accent) 240deg 300deg, token(colors.accent.subtle) 300deg 360deg)',
          // Pandaはanimation値を静的解析するため、DRAW_DURATION_MSと
          // 同じ値(1800ms)を固定文字列で書く必要がある。
          animation: 'rouletteSpin 1800ms cubic-bezier(0.15, 0.65, 0.2, 1) 1',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.18)',
          border: '4px solid white',
        })}
      />
    </>
  );
}

const WIN_CONFETTI_COLORS = [
  '#3bb6b6',
  '#ffd166',
  '#ff6b81',
  '#4A93D7',
  '#7ed6a5',
];
const LOSE_DUST_COLORS = ['#b8c2c2', '#9aa5a5', '#c7d6d6'];

type Particle = {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
  size: number;
  color: string;
  round: boolean;
};

function useParticles(count: number, colors: string[], spread: number) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (360 / count) * i + (Math.random() * 24 - 12);
      const distance = spread * 0.6 + Math.random() * spread * 0.4;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        dx: Math.cos(rad) * distance,
        dy: Math.sin(rad) * distance,
        rotate: Math.round(Math.random() * 360),
        delay: Math.random() * 0.2,
        size: 6 + Math.round(Math.random() * 4),
        color: colors[i % colors.length] ?? colors[0] ?? '#3bb6b6',
        round: i % 2 === 0,
      } satisfies Particle;
    });
  }, [count, colors, spread]);
}

function Particles({
  particles,
  duration,
}: {
  particles: Particle[];
  duration: string;
}) {
  return (
    <div
      className={css({ position: 'absolute', inset: 0, pointerEvents: 'none' })}
      aria-hidden
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={
            {
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.round ? '50%' : '2px',
              animation: `confettiPop ${duration} ease-out ${p.delay}s forwards`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rotate}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Sparkle({ style }: { style: CSSProperties }) {
  return (
    <span
      className={css({
        position: 'absolute',
        color: 'accent',
        animation: 'sparkleTwinkle 1.6s ease-in-out infinite',
      })}
      style={style}
      aria-hidden
    >
      <IconSparkles size={18} />
    </span>
  );
}

const RING_DELAYS = [0, 0.35];

function WinBadge() {
  const confetti = useParticles(18, WIN_CONFETTI_COLORS, 110);

  return (
    <>
      <div
        className={css({
          position: 'absolute',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(59, 182, 182, 0.45), transparent 70%)',
          animation: 'resultGlow 1s ease-out forwards',
        })}
      />

      <Particles particles={confetti} duration="1.1s" />

      <Sparkle style={{ top: '4px', left: '18px', animationDelay: '0.1s' }} />
      <Sparkle style={{ top: '20px', right: '6px', animationDelay: '0.5s' }} />
      <Sparkle
        style={{ bottom: '10px', left: '2px', animationDelay: '0.9s' }}
      />
      <Sparkle
        style={{ bottom: '0px', right: '18px', animationDelay: '1.3s' }}
      />

      {RING_DELAYS.map((delay) => (
        <div
          key={delay}
          className={css({
            position: 'absolute',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            border: '3px solid',
            borderColor: 'accent',
          })}
          style={{ animation: `resultRing 1.3s ease-out ${delay}s 1` }}
        />
      ))}

      <div
        className={css({
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          bg: 'accent',
          color: 'surface',
          fontSize: '30px',
          fontWeight: 'bold',
          border: '4px double white',
          boxShadow:
            '0 0 0 4px token(colors.accent), 0 8px 28px rgba(59, 182, 182, 0.5)',
          animation: 'resultReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        })}
      >
        当たり
      </div>
    </>
  );
}

function LoseBadge() {
  const dust = useParticles(8, LOSE_DUST_COLORS, 60);

  return (
    <>
      <div
        className={css({
          position: 'absolute',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(31, 58, 95, 0.35), transparent 70%)',
          animation: 'resultGlow 1s ease-out forwards',
        })}
      />

      <Particles particles={dust} duration="0.9s" />

      <div
        className={css({
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          bg: '#1f3a5f',
          color: 'surface',
          fontSize: '36px',
          fontWeight: 'normal',
          fontFamily: "'Yuji Syuku', serif",
          border: '3px solid white',
          boxShadow: '0 8px 24px rgba(31, 58, 95, 0.4)',
          animation:
            'resultReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), resultShake 0.6s ease-in-out 0.6s 1',
        })}
      >
        はずれ
      </div>
    </>
  );
}
