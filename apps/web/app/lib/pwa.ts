import { useSyncExternalStore } from 'react';
import { detectInAppBrowser, isIos } from './geolocation';

/**
 * ホーム画面への追加の方法。
 * `prompt`: ブラウザの確認を出せる（Chromium 系）。`ios`: 共有メニューから手で追加する。
 * `in-app`: アプリ内ブラウザのため、標準のブラウザで開き直す必要がある。
 */
export type InstallMethod = 'prompt' | 'ios' | 'in-app';

type BeforeInstallPromptEvent = Event & { prompt(): Promise<void> };

let installPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isStandalone(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    // iOS の Safari は display-mode を返さず、独自のプロパティで示す。
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function installMethod(): InstallMethod | null {
  if (installed || isStandalone()) return null;
  if (installPrompt) return 'prompt';
  if (detectInAppBrowser()) return 'in-app';
  if (isIos(navigator.userAgent)) return 'ios';
  return null;
}

async function registerServiceWorker() {
  const registration = await navigator.serviceWorker.register('/sw.js');

  // controller が無いのは初めてのインストールで、更新ではないので知らせない。
  const onInstalled = (worker: ServiceWorker) => {
    if (!navigator.serviceWorker.controller) return;
    waitingWorker = worker;
    emit();
  };
  if (registration.waiting) onInstalled(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') onInstalled(worker);
    });
  });
  // 新しい版に切り替わると、古い版の画面が後から読み込むファイルは消えている。
  // 別のタブで更新された場合も含め、切り替わったら読み込み直す。
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    location.reload();
  });
  // ホーム画面から開いたアプリは閉じられずに使い続けられるため、戻ってきたときにも更新を確かめる。
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void registration.update();
  });

  // 端末の容量が減ったときに、保存した企画データや地図が消されにくくする。
  void navigator.storage?.persist?.();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // ブラウザ標準の小さな案内は出さず、こちらのダイアログから確認を出す。
    event.preventDefault();
    installPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    emit();
  });
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    registerServiceWorker().catch((error) => {
      console.warn('Service Worker を登録できませんでした。', error);
    });
  }
}

export function useInstallMethod(): InstallMethod | null {
  return useSyncExternalStore(subscribe, installMethod, () => null);
}

/** ブラウザのインストール確認を出す。ユーザー操作の中で呼ぶ。 */
export async function promptInstall(): Promise<void> {
  const prompt = installPrompt;
  if (!prompt) return;
  // 一度出した確認は使い回せない。断られても、ブラウザが次に発火するまで出せない。
  installPrompt = null;
  emit();
  await prompt.prompt();
}

const INSTALL_INTRO_SEEN_KEY = 'tanpopo-install-intro-seen';

/** 初回のインストール案内を、すでに一度出したかどうか。 */
export function hasSeenInstallIntro(): boolean {
  try {
    return localStorage.getItem(INSTALL_INTRO_SEEN_KEY) === '1';
  } catch {
    // 読めない環境で毎回出してしまわないよう、出したものとして扱う。
    return true;
  }
}

export function markInstallIntroSeen(): void {
  try {
    localStorage.setItem(INSTALL_INTRO_SEEN_KEY, '1');
  } catch {
    // 保存できなくても困るのは案内の出し分けだけなので無視する。
  }
}

/** 新しい版がダウンロード済みで、切り替えを待っているか。 */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => waitingWorker !== null,
    () => false,
  );
}

/** 待機中の新しい版に切り替える。切り替わると controllerchange で読み込み直す。 */
export function applyUpdate(): void {
  waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
