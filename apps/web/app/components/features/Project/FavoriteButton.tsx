import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { type CSSProperties, useState } from 'react';
import { css, cx } from '../../../../styled-system/css';
import { FluffSeed } from '../Fluff/Fluff';

// ハートから離れる種。行き先（dx, dy）はハートの大きさに対する比、tilt は昇りきったときの傾き。
const SEEDS = [
  { dx: -0.6, dy: -1.1, tilt: -10, delay: 0 },
  { dx: 0.1, dy: -1.5, tilt: 6, delay: 0.1 },
  { dx: 0.65, dy: -1.0, tilt: 12, delay: 0.2 },
];

type FavoriteButtonProps = {
  /** お気に入り済みか */
  active: boolean;
  /** トグル時に呼ばれる */
  onToggle: () => void;
  /** ハートのサイズ(px) */
  size?: number;
  /** 配置用の追加クラス(position など) */
  className?: string;
};

/**
 * いいね（お気に入り）ボタン。
 * ON にする瞬間だけハートがポップし、タンポポの綿毛がふわりと離れて昇る演出を加えて特別感を出す。
 * 一覧・詳細で共有するため、配置は className で外から制御する。
 */
export default function FavoriteButton({
  active,
  onToggle,
  size = 26,
  className,
}: FavoriteButtonProps) {
  // ON になった瞬間だけ演出する（一覧読み込み時に既存のいいねが一斉に弾けないように）。
  const [burst, setBurst] = useState(false);

  return (
    <button
      type="button"
      aria-label={active ? 'お気に入りから削除' : 'お気に入りに追加'}
      aria-pressed={active}
      onClick={(e) => {
        // Link の内側に置かれても遷移させない。
        e.preventDefault();
        e.stopPropagation();
        if (!active) setBurst(true);
        onToggle();
      }}
      className={cx(
        css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: '2px',
          color: active ? 'favorite' : 'favorite.inactive',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }),
        className,
      )}
    >
      {/* position は外側の className に委ね、綿毛はこの内側ラッパー基準で配置する */}
      <span
        className={css({
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {/* ON の瞬間のみ。動きを減らす設定でも animationend で片付けられるよう、止めずに隠す */}
        {burst &&
          SEEDS.map((seed, i) => (
            <FluffSeed
              // biome-ignore lint/suspicious/noArrayIndexKey: 本数が固定の飾り
              key={i}
              height={size * 0.55}
              strokeWidth={2}
              // 最後に出る種が消えたら片付ける。
              onAnimationEnd={
                i === SEEDS.length - 1 ? () => setBurst(false) : undefined
              }
              style={
                {
                  '--dx': `${seed.dx * size}px`,
                  '--dy': `${seed.dy * size}px`,
                  '--tilt': `${seed.tilt}deg`,
                  animationDelay: `${seed.delay}s`,
                } as CSSProperties
              }
              className={css({
                position: 'absolute',
                top: '50%',
                left: '50%',
                transformOrigin: '50% 33%',
                color: 'favorite',
                opacity: 0,
                animation:
                  'fluffLift 1.6s cubic-bezier(0.3, 0.6, 0.4, 1) forwards',
                pointerEvents: 'none',
                _motionReduce: { visibility: 'hidden' },
              })}
            />
          ))}
        <span
          className={css({
            display: 'flex',
            animation: burst ? 'heartPop 0.45s ease-out' : undefined,
          })}
        >
          {active ? <IconHeartFilled size={size} /> : <IconHeart size={size} />}
        </span>
      </span>
    </button>
  );
}
