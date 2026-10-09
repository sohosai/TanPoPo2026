import { IconBrandLine, IconLoader2 } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
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
  const { user, isLoading: authLoading } = useAuth();
  const [liffLoading, setLiffLoading] = useState(false);

  // コンポーネントマウント時（またはLIFFリダイレクトから戻ってきた時）に自動ログインを試みる
  useEffect(() => {
    // 既に自社セッションがあるなら何もしない
    if (user || authLoading) return;

    const liffId = import.meta.env.VITE_LIFF_ID;
    if (!liffId) return;

    let mounted = true;
    (async () => {
      try {
        setLiffLoading(true);
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const idToken = liff.getIDToken();
          if (!idToken) throw new Error('ID Token not found');

          const res = await fetch('/auth/line/liff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });

          if (!res.ok) throw new Error('Server login failed');
          if (mounted) window.location.reload();
        }
      } catch (error) {
        console.error('LIFF Auto Login Error:', error);
      } finally {
        if (mounted) setLiffLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  const handleLiffLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setLiffLoading(true);
      const liffId = import.meta.env.VITE_LIFF_ID;
      if (!liffId) {
        window.location.href = getLineLoginUrl(redirectPath);
        return;
      }

      const liff = (await import('@line/liff')).default;
      await liff.init({ liffId });

      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const idToken = liff.getIDToken();
      if (!idToken) throw new Error('ID Token not found');

      const res = await fetch('/auth/line/liff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) throw new Error('Server login failed');

      window.location.reload();
    } catch (error) {
      console.error('LIFF Login Error:', error);
      window.location.href = getLineLoginUrl(redirectPath);
    }
  };

  const isLoading = authLoading || liffLoading;

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
        <p className={css({ fontSize: 'sm' })}>読み込み中...</p>
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
            fontSize: 'md',
            color: 'fg.muted',
            lineHeight: 1.7,
          })}
        >
          この機能を利用するにはLINEでログインしてください。
        </p>
        <button
          onClick={handleLiffLogin}
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            px: '20px',
            py: '10px',
            borderRadius: 'full',
            bg: 'accent',
            color: 'surface',
            fontSize: 'md',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
          })}
        >
          <IconBrandLine size={20} />
          <span className={css({ textBox: 'trim-both cap alphabetic' })}>
            LINEでログイン
          </span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
