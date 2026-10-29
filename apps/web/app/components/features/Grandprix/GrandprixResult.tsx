import {
  IconChevronRight,
  IconClipboardText,
  IconSparkles,
  IconTicket,
} from '@tabler/icons-react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import RedemptionSchedule from '~/components/features/Questionnaire/RedemptionSchedule';
import { css } from '../../../../styled-system/css';
import { token } from '../../../../styled-system/tokens';

// Panda は animation の値を静的に読むため、css() の中では同じ値を文字列で書く。
const SPIN_MS = 1800;
const DROP_MS = 900;

type Phase = 'spinning' | 'dropping' | 'revealed';

type GrandprixResultProps = {
  result: 'win' | 'lose' | null;
  /** 抽選した日時（ISO 8601）。 */
  drawnAt: string | null;
  /**
   * true の場合のみ抽選器を回す演出を再生する。
   * 既に結果が確定しているページの再訪問時（false）は演出なしで即結果を表示する。
   */
  animate?: boolean;
};

export default function GrandprixResult({
  result,
  drawnAt,
  animate = false,
}: GrandprixResultProps) {
  const [phase, setPhase] = useState<Phase>(() =>
    animate && !prefersReducedMotion() ? 'spinning' : 'revealed',
  );

  useEffect(() => {
    if (phase === 'revealed') return;
    const timer = setTimeout(
      () => setPhase(phase === 'spinning' ? 'dropping' : 'revealed'),
      phase === 'spinning' ? SPIN_MS : DROP_MS,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const isWin = result === 'win';

  if (phase !== 'revealed') {
    return (
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '70vh',
          px: '24px',
        })}
      >
        <Garapon isWin={isWin} dropping={phase === 'dropping'} />
        <p
          aria-live="polite"
          className={css({
            fontSize: 'md',
            fontWeight: 'bold',
            color: 'fg.muted',
          })}
        >
          抽選中...
        </p>
      </div>
    );
  }

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        maxW: '480px',
        mx: 'auto',
        px: '16px',
        pt: '32px',
        pb: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        textAlign: 'center',
        overflow: 'hidden',
      })}
    >
      {isWin ? (
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
          <WinBadge />
        </div>
      ) : (
        <LoseBadge />
      )}

      <h2
        className={css({
          fontSize: '2xl',
          fontWeight: 'bold',
          color: 'fg.strong',
        })}
      >
        {isWin ? 'おめでとうございます！' : 'ご参加ありがとうございました'}
      </h2>

      {isWin ? <PrizeCard drawnAt={drawnAt} /> : <QuestionnaireLink />}

      <Link
        to="/"
        className={css({
          fontSize: 'sm',
          fontWeight: 'bold',
          color: 'accent.text',
          textDecoration: 'none',
        })}
      >
        企画検索に戻る
      </Link>
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const clockFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** 当たりの引換証。係員が本物の画面か見分けられるよう、秒まで動く現在時刻を出す。 */
function PrizeCard({ drawnAt }: { drawnAt: string | null }) {
  const now = useNow();

  return (
    <section
      className={css({
        w: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        p: '16px',
        borderRadius: 'xl',
        border: 'token(borderWidths.thin) solid',
        borderColor: 'accent.border',
        bg: 'surface',
        boxShadow: 'card',
        textAlign: 'left',
      })}
    >
      <div
        className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}
      >
        <span
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            w: '36px',
            h: '36px',
            borderRadius: 'full',
            bg: 'accent.subtle',
            color: 'accent',
          })}
        >
          <IconTicket size={20} />
        </span>
        <div>
          <p
            className={css({
              fontSize: 'md',
              fontWeight: 'bold',
              color: 'fg.strong',
            })}
          >
            グランプリ抽選 引換証
          </p>
          <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>
            福引所でこの画面を係員に見せてください
          </p>
        </div>
      </div>

      <dl
        className={css({
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '6px 16px',
          fontSize: 'sm',
        })}
      >
        <dt className={css({ color: 'fg.subtle' })}>抽選日時</dt>
        <dd className={css({ color: 'fg.strong', fontWeight: 'bold' })}>
          {drawnAt ? dateTimeFormat.format(new Date(drawnAt)) : '—'}
        </dd>
        <dt className={css({ color: 'fg.subtle' })}>現在時刻</dt>
        <dd
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'fg.strong',
            fontWeight: 'bold',
            fontVariantNumeric: 'tabular-nums',
          })}
        >
          <span
            aria-hidden
            className={css({
              w: '8px',
              h: '8px',
              borderRadius: 'full',
              bg: 'accent',
              animation: 'sparkleTwinkle 1s ease-in-out infinite',
            })}
          />
          {clockFormat.format(now)}
        </dd>
      </dl>

      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        })}
      >
        <p
          className={css({
            fontSize: 'xs',
            fontWeight: 'bold',
            color: 'fg.muted',
          })}
        >
          引き換えできる時間
        </p>
        <RedemptionSchedule />
      </div>
    </section>
  );
}

/** はずれのときの、来場者アンケート（回答で福引券）への導線。 */
function QuestionnaireLink() {
  return (
    <Link
      to="/questionnaire"
      className={css({
        w: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        p: '16px',
        borderRadius: 'xl',
        bg: 'accent.subtle',
        color: 'fg.strong',
        textAlign: 'left',
        textDecoration: 'none',
      })}
    >
      <IconClipboardText
        size={28}
        className={css({ flexShrink: 0, color: 'accent' })}
      />
      <span className={css({ flex: 1 })}>
        <span
          className={css({
            display: 'block',
            fontSize: 'md',
            fontWeight: 'bold',
          })}
        >
          来場者アンケートに答える
        </span>
        <span
          className={css({
            display: 'block',
            fontSize: 'xs',
            color: 'fg.muted',
          })}
        >
          回答すると福引券がもらえます
        </span>
      </span>
      <IconChevronRight size={20} className={css({ color: 'accent' })} />
    </Link>
  );
}

/** 福引の抽選器。回したあと、口から結果の色の玉が受け皿へ落ちる（当たりは金、はずれは白）。 */
function Garapon({ isWin, dropping }: { isWin: boolean; dropping: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={220}
      height={220}
      role="img"
      aria-label="抽選器"
      className={css({ overflow: 'visible' })}
    >
      {/* 台 */}
      <path
        d="M60 170 L80 120 M140 170 L120 120"
        stroke={token.var('colors.accent.deep')}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <rect
        x={40}
        y={166}
        width={120}
        height={10}
        rx={5}
        fill={token.var('colors.accent.deep')}
      />
      {/* 受け皿 */}
      <path
        d="M30 150 Q48 166 66 150"
        fill="none"
        stroke={token.var('colors.accent.deep')}
        strokeWidth={5}
        strokeLinecap="round"
      />

      <g
        className={css({
          // 取っ手まで含めると図形の中心がずれるため、ドラムの中心を軸にする。
          transformBox: 'view-box',
          transformOrigin: '100px 90px',
          animation: 'garaponSpin 1800ms cubic-bezier(0.45, 0, 0.2, 1) 1',
        })}
        style={dropping ? { animation: 'none' } : undefined}
      >
        <polygon
          points="100,30 142,47 160,90 142,133 100,150 58,133 40,90 58,47"
          fill={token.var('colors.accent')}
          stroke={token.var('colors.accent.deep')}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <polygon
          points="100,48 129,60 142,90 129,120 100,132 71,120 58,90 71,60"
          fill={token.var('colors.accent.subtle')}
        />
        <line
          x1={100}
          y1={90}
          x2={178}
          y2={90}
          stroke={token.var('colors.accent.deep')}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <circle cx={178} cy={90} r={7} fill={token.var('colors.accent.deep')} />
      </g>

      {dropping && (
        <circle
          cx={70}
          cy={120}
          r={9}
          fill={
            isWin
              ? token.var('colors.result.confetti.gold')
              : token.var('colors.white')
          }
          stroke={token.var('colors.result.dust.dark')}
          strokeWidth={2}
          className={css({
            transformBox: 'fill-box',
            transformOrigin: 'center',
            animation: 'ballDrop 900ms cubic-bezier(0.3, 0.7, 0.4, 1) forwards',
          })}
        />
      )}
    </svg>
  );
}

const WIN_CONFETTI_COLORS = [
  token.var('colors.brand.500'),
  token.var('colors.result.confetti.gold'),
  token.var('colors.favorite'),
  token.var('colors.result.confetti.blue'),
  token.var('colors.result.confetti.mint'),
];
const LOSE_DUST_COLORS = [
  token.var('colors.result.dust.mid'),
  token.var('colors.result.dust.dark'),
  token.var('colors.result.dust.light'),
];

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
        color:
          colors[i % colors.length] ??
          colors[0] ??
          token.var('colors.brand.500'),
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
            'radial-gradient(circle, token(colors.result.winGlow), transparent 70%)',
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
          fontSize: '4xl',
          fontWeight: 'bold',
          border: '4px double token(colors.white)',
          boxShadow: '0 0 0 4px token(colors.accent), token(shadows.win)',
          animation: 'resultReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        })}
      >
        当たり
      </div>
    </>
  );
}

function LoseBadge() {
  const dust = useParticles(8, LOSE_DUST_COLORS, 70);

  return (
    <div className={css({ position: 'relative', py: '24px' })}>
      <Particles particles={dust} duration="0.9s" />
      <p
        className={css({
          fontSize: '5xl',
          fontWeight: 'bold',
          letterSpacing: '0.12em',
          color: 'result.lose',
          animation:
            'resultReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), resultShake 0.6s ease-in-out 0.6s 1',
        })}
      >
        はずれ
      </p>
    </div>
  );
}
