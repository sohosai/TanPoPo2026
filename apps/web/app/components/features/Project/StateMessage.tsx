import {
  IconHeartOff,
  IconSearchOff,
  type TablerIcon,
} from '@tabler/icons-react';
import { css } from '../../../../styled-system/css';

/** 読み込み中・エラー・該当なしなどの全画面状態を表す共通表示。 */
export function StateMessage({
  icon: Icon,
  title,
  description,
  spinning = false,
}: {
  icon: TablerIcon;
  title: string;
  description?: string;
  spinning?: boolean;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        px: '24px',
        py: '56px',
        textAlign: 'center',
      })}
    >
      <span
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: 'full',
          bg: 'accent.subtle',
          color: 'accent',
        })}
      >
        <Icon
          size={30}
          className={
            spinning ? css({ animation: 'spin 1s linear infinite' }) : undefined
          }
        />
      </span>
      <p
        className={css({
          fontSize: 'lg',
          fontWeight: 'bold',
          color: 'fg',
        })}
      >
        {title}
      </p>
      {description && (
        <p
          className={css({
            fontSize: 'sm',
            lineHeight: 1.6,
            color: 'fg.subtle',
            whiteSpace: 'pre-line',
          })}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/** 条件に合う企画が1件も無いときの表示。お気に入りだけに絞っているときは案内を変える。 */
export function NoProjectsMessage({ favoriteOnly }: { favoriteOnly: boolean }) {
  return favoriteOnly ? (
    <StateMessage
      icon={IconHeartOff}
      title="いいねした企画がありません"
      description={'ハートを押してお気に入りに追加すると\nここに表示されます。'}
    />
  ) : (
    <StateMessage
      icon={IconSearchOff}
      title="企画が見つかりませんでした"
      description={
        'キーワードを変えるか、絞り込み条件を\nゆるめてもう一度お試しください。'
      }
    />
  );
}
