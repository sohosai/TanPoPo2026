import { useEffect, useRef, useState } from 'react';
import {
  detectInAppBrowser,
  openInExternalBrowser,
  permissionSteps,
} from '~/lib/geolocation';
import { css, cx } from '../../../../styled-system/css';

/** `intro`: 初めて使う前の説明。`denied`: 拒否されているときの許可し直す手順。 */
export type LocationDialogKind = 'intro' | 'denied';

type Props = {
  kind: LocationDialogKind | null;
  /** もう一度取得を試す意味があるか（ブラウザが拒否を覚えていれば、試しても確認は出ない）。 */
  canRetry: boolean;
  /** 位置情報の取得を始める。ブラウザの確認を出すため、ボタンのクリックの中で同期的に呼ぶ。 */
  onAllow: () => void;
  onClose: () => void;
};

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

export default function LocationPermissionDialog({
  kind,
  canRetry,
  onAllow,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copyResult, setCopyResult] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (kind && !dialog.open) dialog.showModal();
    if (!kind && dialog.open) dialog.close();
    setCopyResult(null);
  }, [kind]);

  const inAppBrowser = kind ? detectInAppBrowser() : null;

  const openExternal = async () => {
    const result = await openInExternalBrowser();
    if (result === 'copied') {
      setCopyResult('URL をコピーしました。ブラウザに貼り付けてください。');
    } else if (result === 'failed') {
      setCopyResult('メニューの「ブラウザで開く」から開いてください。');
    }
  };

  return (
    // 背景（::backdrop）のクリックは dialog 自身へのクリックとして届く。Esc での閉じる操作は dialog が持つ。
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボードでは Esc で閉じられる
    <dialog
      ref={ref}
      aria-labelledby="location-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
      {kind && (
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
            id="location-dialog-title"
            className={css({
              fontSize: '16px',
              fontWeight: 700,
              color: 'fg.strong',
            })}
          >
            {kind === 'intro' ? '現在地を表示' : '位置情報がオフです'}
          </h2>

          {kind === 'intro' && <p>次の画面で「許可」を選んでください。</p>}

          {kind === 'denied' && !inAppBrowser && (
            <ol className={css({ pl: '1.4em', listStyle: 'decimal' })}>
              {permissionSteps().map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}

          {inAppBrowser && (
            <p>
              {inAppBrowser} 内では使えないことがあります。
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

          {kind === 'intro' && (
            <p className={css({ fontSize: '11px', color: 'fg.subtle' })}>
              位置情報は人流解析のため、匿名化してサーバーに送信することがあります。
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
              onClick={onClose}
              className={cx(button, textButton)}
            >
              {kind === 'intro' ? '今はしない' : '閉じる'}
            </button>
            {(kind === 'intro' || canRetry) && (
              <button
                type="button"
                onClick={onAllow}
                className={cx(button, primaryButton)}
              >
                {kind === 'intro' ? '表示する' : 'もう一度試す'}
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
