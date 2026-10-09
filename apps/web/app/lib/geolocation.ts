import { useSyncExternalStore } from 'react';

/**
 * 位置情報の許可状態。Permissions API で状態を取れないブラウザでは `unknown` とし、
 * 実際に取得を試みるまで分からないものとして扱う。
 */
export type GeolocationPermission = PermissionState | 'unknown';

let permission: GeolocationPermission = 'unknown';
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

if (typeof navigator !== 'undefined' && navigator.permissions) {
  navigator.permissions
    .query({ name: 'geolocation' })
    .then((status) => {
      const sync = () => {
        permission = status.state;
        emit();
      };
      sync();
      // 設定画面やアドレスバーから許可を変えて戻ってきたときにも追従する。
      status.addEventListener('change', sync);
    })
    // iOS 16 未満の Safari などは geolocation の問い合わせ自体を reject する。
    .catch(() => {});
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGeolocationPermission(): GeolocationPermission {
  return useSyncExternalStore(
    subscribe,
    () => permission,
    () => 'unknown',
  );
}

const INTRO_SEEN_KEY = 'tanpopo-geolocation-intro-seen';

/** 位置情報を使う前の説明を、一度承諾したかどうか。 */
export function hasSeenGeolocationIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGeolocationIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // 保存できなくても次回また説明が出るだけなので無視する。
  }
}

const IN_APP_BROWSERS: [RegExp, string][] = [
  [/\bLine\//i, 'LINE'],
  [/Instagram/, 'Instagram'],
  [/FBAN|FBAV|FB_IAB/, 'Facebook'],
  [/Twitter/, 'X'],
  [/BytedanceWebview|musical_ly|TikTok/i, 'TikTok'],
];

function isIos(ua: string): boolean {
  // iPadOS の Safari は Mac と同じ UA を名乗るため、タッチ対応かどうかで見分ける。
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

/**
 * SNS などのアプリ内ブラウザで開かれていれば、そのアプリ名を返す。
 * アプリ内ブラウザは位置情報を使えないか、許可の設定場所が分かりにくいことが多い。
 */
export function detectInAppBrowser(): string | null {
  const ua = navigator.userAgent;
  const found = IN_APP_BROWSERS.find(([pattern]) => pattern.test(ua));
  if (found) return found[1];
  // Android の WebView は UA に `; wv)` を含む。
  return /Android.*; wv\)/.test(ua) ? 'アプリ' : null;
}

/**
 * 今のページを端末の標準ブラウザで開き直す。開き直す手段の無い環境（iOS の多くのアプリ）では
 * 代わりに URL をコピーする。
 */
export async function openInExternalBrowser(): Promise<
  'opened' | 'copied' | 'failed'
> {
  const url = new URL(location.href);
  const ua = navigator.userAgent;
  if (/\bLine\//i.test(ua)) {
    // LINE はこのクエリ付きの URL を外部ブラウザで開く。
    url.searchParams.set('openExternalBrowser', '1');
    location.href = url.href;
    return 'opened';
  }
  if (/Android/.test(ua)) {
    location.href = `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=https;package=com.android.chrome;end`;
    return 'opened';
  }
  try {
    await navigator.clipboard.writeText(url.href);
    return 'copied';
  } catch {
    return 'failed';
  }
}

const RELOAD_STEP = 'ページを再読み込み';

const IOS_OTHER_BROWSERS: [RegExp, string][] = [
  [/CriOS/, 'Chrome'],
  [/FxiOS/, 'Firefox'],
  [/EdgiOS/, 'Edge'],
];

function iosSteps(ua: string): string[] {
  const locationServices =
    '設定 →「プライバシーとセキュリティ」→「位置情報サービス」をオン';
  const other = IOS_OTHER_BROWSERS.find(([pattern]) => pattern.test(ua));
  if (other) {
    return [
      `設定 →「${other[1]}」→「位置情報」を「このAppの使用中」に`,
      locationServices,
      RELOAD_STEP,
    ];
  }
  return [
    'アドレスバーの「ぁあ」→「Webサイトの設定」→「位置情報」を「許可」に',
    `${locationServices}にし、「Safari Webサイト」を「使用中のみ」に`,
    RELOAD_STEP,
  ];
}

function desktopSteps(ua: string): string[] {
  const isMac = /Macintosh/.test(ua);
  const browserStep = /Firefox/.test(ua)
    ? 'アドレスバーの位置情報アイコン →「ブロック」を解除'
    : isMac && /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)
      ? '「Safari」→「設定」→「Webサイト」→「位置情報」で「許可」に'
      : 'アドレスバー左のアイコン →「位置情報」を「許可」に';
  // ブラウザで許可していても、OS 側で位置情報が切られていると取得に失敗する。
  const osStep = isMac
    ? 'システム設定 →「プライバシーとセキュリティ」→「位置情報サービス」でブラウザをオン'
    : /Windows/.test(ua)
      ? 'Windows の設定 →「プライバシーとセキュリティ」→「位置情報」をオン'
      : null;
  return [browserStep, ...(osStep ? [osStep] : []), RELOAD_STEP];
}

/** ブラウザで拒否された位置情報を許可し直す手順。端末とブラウザに合わせて出し分ける。 */
export function permissionSteps(): string[] {
  const ua = navigator.userAgent;
  if (isIos(ua)) return iosSteps(ua);
  if (/Android/.test(ua)) {
    return [
      'アドレスバー左のアイコン →「権限」→「位置情報」を許可',
      '端末の「位置情報」をオン',
      RELOAD_STEP,
    ];
  }
  return desktopSteps(ua);
}
