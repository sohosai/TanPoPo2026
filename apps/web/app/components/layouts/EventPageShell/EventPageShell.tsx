import { IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import RequireLineLogin from '~/components/features/Auth/RequireLineLogin';
import { useOnline } from '~/lib/pwa';
import { css } from '../../../../styled-system/css';

type EventPageShellProps = {
  title: string;
  /** ログイン成功後、`/auth/line/login` へ渡す戻り先の相対パス。 */
  redirectPath: string;
  children: ReactNode;
};

/**
 * 地図に紐づかない独立イベントページ（グランプリ投票・来場者アンケート等）の共通シェル。
 * スティッキーヘッダー（タイトル＋閉じるボタン）とLINEログインゲートをまとめて提供する。
 * LINE ログインも送信も通信が要るため、オフラインの間は中身の代わりに案内を出す。
 */
export default function EventPageShell({
  title,
  redirectPath,
  children,
}: EventPageShellProps) {
  const online = useOnline();

  return (
    <div
      className={css({
        height: '100%',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        bg: 'sheet.background',
      })}
    >
      <header
        className={css({
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '16px',
          py: '14px',
          bg: 'sheet.background',
          borderBottom:
            'token(borderWidths.divider) solid token(colors.border.subtle)',
        })}
      >
        <h1
          className={css({
            fontSize: 'xl',
            fontWeight: 700,
            color: 'fg.strong',
          })}
        >
          {title}
        </h1>
        <Link
          to="/"
          aria-label="閉じる"
          className={css({
            display: 'flex',
            alignItems: 'center',
            color: 'fg.subtle',
          })}
        >
          <IconX size={22} />
        </Link>
      </header>

      {online ? (
        <RequireLineLogin redirectPath={redirectPath}>
          {children}
        </RequireLineLogin>
      ) : (
        <p
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            px: '24px',
            textAlign: 'center',
            fontSize: 'md',
            color: 'fg.muted',
            lineHeight: 1.7,
          })}
        >
          オフラインのため利用できません。
          <br />
          通信が戻ると表示されます。
        </p>
      )}
    </div>
  );
}
