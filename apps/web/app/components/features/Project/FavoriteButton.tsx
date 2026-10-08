import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { css, cx } from '../../../../styled-system/css';

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
 * ON にする瞬間だけハートがポップし、拡散リングが広がる演出を加えて特別感を出す。
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
      {/* position は外側の className に委ね、リングはこの内側ラッパー基準で配置する */}
      <span
        className={css({
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {/* 拡散リング（ON の瞬間のみ） */}
        {burst && (
          <span
            aria-hidden
            style={{ width: size, height: size }}
            className={css({
              position: 'absolute',
              top: '50%',
              left: '50%',
              borderRadius: '999px',
              border: '2px solid',
              borderColor: 'favorite',
              transform: 'translate(-50%, -50%)',
              animation: 'heartBurst 0.5s ease-out forwards',
              pointerEvents: 'none',
            })}
          />
        )}
        <span
          onAnimationEnd={() => setBurst(false)}
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
