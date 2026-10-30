import { IconBrandLine } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getLineLoginUrl, useAuth } from '~/lib/auth';
import { css } from '../../../../styled-system/css';
import { FluffLoader } from '../Fluff/Fluff';

/** 未ログイン時に出す案内。 */
export type LoginPrompt = {
  /** 背景にぼかして見せる、ログイン後の最初の画面。操作はできない。 */
  preview: ReactNode;
  title: string;
  /** ログインしたあとの流れ。先頭の「LINEでログイン」は共通で足す。 */
  steps: string[];
};

type RequireLineLoginProps = {
  /** ログイン成功後、`/auth/line/login` へ渡す戻り先の相対パス。 */
  redirectPath: string;
  loginPrompt: LoginPrompt;
  children: ReactNode;
};

/** ログイン必須のページを包み、未ログイン時はLINEログイン導線を表示する。 */
export default function RequireLineLogin({
  redirectPath,
  loginPrompt,
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
        <FluffLoader size={40} />
        <p className={css({ fontSize: 'sm' })}>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginDialog prompt={loginPrompt} onLogin={handleLiffLogin} />;
  }

  return <>{children}</>;
}

function LoginDialog({
  prompt,
  onLogin,
}: {
  prompt: LoginPrompt;
  onLogin: (e: React.MouseEvent) => void;
}) {
  const steps = ['LINEでログイン', ...prompt.steps];

  return (
    <>
      <div
        inert
        aria-hidden
        className={css({ filter: 'blur(2px)', userSelect: 'none' })}
      >
        {prompt.preview}
      </div>

      <div
        className={css({
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          bg: 'overlay.scrim',
          animation: 'fadeIn 0.3s ease-out',
          md: { alignItems: 'center', p: '16px' },
          _motionReduce: { animation: 'none' },
        })}
      >
        <section
          role="dialog"
          aria-modal
          aria-labelledby="line-login-title"
          className={css({
            w: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            px: '20px',
            pt: '24px',
            pb: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            borderRadius: '22px 22px 0 0',
            bg: 'surface',
            boxShadow: 'raised',
            animation: 'sheetRise 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            md: {
              w: '400px',
              pb: '20px',
              borderRadius: '16px',
              animation: 'viewerZoom 0.15s ease-out',
            },
            _motionReduce: { animation: 'none' },
          })}
        >
          <div>
            <h2
              id="line-login-title"
              className={css({
                fontSize: 'lg',
                fontWeight: 'bold',
                color: 'fg.strong',
              })}
            >
              {prompt.title}
            </h2>
            <p
              className={css({
                mt: '4px',
                fontSize: 'sm',
                color: 'fg.subtle',
                lineHeight: 1.7,
              })}
            >
              1人1回の参加を確かめるため、LINEでログインしてください。
            </p>
          </div>

          <ol
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            })}
          >
            {steps.map((step, i) => (
              <li
                key={step}
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: 'sm',
                  color: i === 0 ? 'fg.strong' : 'fg.muted',
                  fontWeight: i === 0 ? 'bold' : 'normal',
                })}
              >
                <span
                  className={css({
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    w: '24px',
                    h: '24px',
                    borderRadius: 'full',
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    bg: i === 0 ? 'sns.line' : 'accent.subtle',
                    color: i === 0 ? 'white' : 'accent',
                  })}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            })}
          >
            <button
              type="button"
              onClick={onLogin}
              className={css({
                w: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                py: '12px',
                borderRadius: 'full',
                bg: 'sns.line',
                color: 'white',
                fontSize: 'md',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                _active: { filter: 'brightness(0.9)' },
              })}
            >
              <IconBrandLine size={22} />
              <span className={css({ textBox: 'trim-both cap alphabetic' })}>
                LINEでログイン
              </span>
            </button>
            <Link
              to="/"
              className={css({
                fontSize: 'sm',
                color: 'fg.subtle',
                textDecoration: 'none',
              })}
            >
              企画検索に戻る
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
