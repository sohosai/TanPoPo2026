import { useSyncExternalStore } from 'react';
import { isEmbedPath } from './embed';

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
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);

  // 埋め込みは他サイトの中で開かれるため、アプリ一式を端末に保存させない。
  if (
    import.meta.env.PROD &&
    'serviceWorker' in navigator &&
    !isEmbedPath(location.pathname)
  ) {
    registerServiceWorker().catch((error) => {
      console.warn('Service Worker を登録できませんでした。', error);
    });
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
