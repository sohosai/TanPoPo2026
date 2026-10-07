import { IconBrandLine, IconLoader2 } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { getLineLoginUrl, useAuth } from '~/lib/auth';
import { css } from '../../../../styled-system/css';

type RequireLineLoginProps = {
  /** ログイン成功後、`/auth/line/login` へ渡す戻り先の相対パス。 */
  redirectPath: string;
  children: ReactNode;
};

/** ログイン必須のページを包み、未ログイン時はLINEログイン導線を表示する。 */
export default function RequireLineLogin({
  redirectPath,
  children,
}: RequireLineLoginProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          minHeight: '60vh',
          color: 'fg.subtle',
        })}
      >
        <IconLoader2
          size={28}
          className={css({ animation: 'spin 1s linear infinite' })}
        />
        <p className={css({ fontSize: '13px' })}>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '60vh',
          px: '24px',
          textAlign: 'center',
        })}
      >
        <p
          className={css({
            fontSize: '14px',
            color: 'fg.muted',
            lineHeight: 1.7,
          })}
        >
          この機能を利用するにはLINEでログインしてください。
        </p>
        <a
          href={getLineLoginUrl(redirectPath)}
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            px: '20px',
            py: '10px',
            borderRadius: '999px',
            bg: 'accent',
            color: 'surface',
            fontSize: '14px',
            fontWeight: 'bold',
            textDecoration: 'none',
          })}
        >
          <IconBrandLine size={20} />
          LINEでログイン
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
