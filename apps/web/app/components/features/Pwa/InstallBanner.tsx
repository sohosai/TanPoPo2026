import { IconChevronRight, IconDownload } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { openInExternalBrowser } from '~/lib/geolocation';
import {
  hasSeenInstallIntro,
  markInstallIntroSeen,
  promptInstall,
  useInstallMethod,
} from '~/lib/pwa';
import { css, cx } from '../../../../styled-system/css';

const button = css({
  minH: '40px',
  px: '16px',
  borderRadius: '999px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
});

const primaryButton = css({ bg: 'accent', color: 'white' });

const textButton = css({ color: 'fg.muted' });

/**
 * 企画一覧の先頭に置く、ホーム画面への追加の導線。追加できる環境で未追加のときだけ表示する。
 * 押すとブラウザの確認を直接出す。確認を出せない iOS・アプリ内ブラウザでは手順のダイアログを出す。
 * ブラウザの確認はユーザー操作の中でしか出せないため、初めて開いたときはダイアログを一度だけ自動で出す。
 */
export default function InstallBanner() {
  const method = useInstallMethod();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [copyResult, setCopyResult] = useState<string | null>(null);

  useEffect(() => {
    if ((method === 'prompt' || method === 'ios') && !hasSeenInstallIntro()) {
      markInstallIntroSeen();
      setOpen(true);
    }
  }, [method]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    setCopyResult(null);
  }, [open]);

  if (!method) return null;

  const install = () => {
    setOpen(false);
    void promptInstall();
  };

  const openExternal = async () => {
    const result = await openInExternalBrowser();
    if (result === 'copied') {
      setCopyResult('URL をコピーしました。ブラウザに貼り付けてください。');
    } else if (result === 'failed') {
      setCopyResult('メニューの「ブラウザで開く」から開いてください。');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={method === 'prompt' ? install : () => setOpen(true)}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          w: 'calc(100% - 24px)',
          mx: '12px',
          mb: '10px',
          px: '10px',
          py: '8px',
          borderRadius: 'xl',
          border:
            'token(borderWidths.divider) solid token(colors.border.subtle)',
          bg: 'surface',
          color: 'fg.strong',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'transform 0.15s',
          _active: { transform: 'scale(0.98)' },
        })}
      >
        <span
          className={css({
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            w: '30px',
            h: '30px',
            borderRadius: 'full',
            bg: 'accent.subtle',
            color: 'accent.text',
          })}
        >
          <IconDownload size={18} />
        </span>
        <span
          className={css({
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          })}
        >
          <span
            className={css({
              fontSize: 'sm',
              fontWeight: 700,
              lineHeight: 1.35,
            })}
          >
            ホーム画面に追加
          </span>
          <span className={css({ fontSize: '2xs', color: 'fg.muted' })}>
            電波が届きにくい場所でも企画や地図を見られます
          </span>
        </span>
        <IconChevronRight
          size={18}
          className={css({ flexShrink: 0, color: 'fg.subtle' })}
        />
      </button>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: キーボードでは Esc で閉じられる */}
      <dialog
        ref={ref}
        aria-labelledby="install-dialog-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className={css({
          w: 'min(320px, calc(100vw - 32px))',
          maxH: 'calc(100dvh - 32px)',
          m: 'auto',
          p: '20px',
          border: 'none',
          borderRadius: '16px',
          bg: 'surface',
          color: 'fg',
          boxShadow: 'raised',
          overflowY: 'auto',
          _open: { animation: 'viewerZoom 0.15s ease-out' },
          _backdrop: { bg: 'overlay.scrim' },
        })}
      >
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '14px',
            lineHeight: 1.7,
          })}
        >
          <h2
            id="install-dialog-title"
            className={css({
              fontSize: '16px',
              fontWeight: 700,
              color: 'fg.strong',
            })}
          >
            ホーム画面に追加
          </h2>

          <p>
            アプリのようにすぐ開けて、電波が届きにくい場所でも企画や地図を見られます。
          </p>

          {method === 'ios' && (
            <ol className={css({ pl: '1.4em', listStyle: 'decimal' })}>
              <li>共有ボタン（四角から矢印が出たアイコン）をタップ</li>
              <li>「ホーム画面に追加」を選ぶ</li>
            </ol>
          )}

          {method === 'in-app' && (
            <p>
              アプリ内のブラウザでは追加できません。
              <button
                type="button"
                onClick={openExternal}
                className={css({
                  color: 'accent.text',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                })}
              >
                ブラウザで開く
              </button>
            </p>
          )}
          {copyResult && (
            <p role="status" className={css({ color: 'fg.muted' })}>
              {copyResult}
            </p>
          )}

          <div
            className={css({
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '4px',
              mt: '4px',
            })}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cx(button, textButton)}
            >
              {method === 'prompt' ? '今はしない' : '閉じる'}
            </button>
            {method === 'prompt' && (
              <button
                type="button"
                onClick={install}
                className={cx(button, primaryButton)}
              >
                追加する
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
