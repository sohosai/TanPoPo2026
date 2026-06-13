import { get, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';

/**
 * お気に入り（いいね）した企画 ID の集合を IndexedDB に永続化するストア。
 *
 * 一覧・詳細など複数の画面から同じ状態を参照するため、React の外に1つの
 * ストアを置き useSyncExternalStore で購読する。これにより props の
 * バケツリレーを避けつつ、どこでトグルしても全画面が同期する。
 */

const STORAGE_KEY = 'tanpopo-favorites';

// SSR / ハイドレーション時に安定した参照を返すための空集合。
const EMPTY: ReadonlySet<string> = new Set();

let favorites: ReadonlySet<string> = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** IndexedDB へ現在の集合を書き出す（失敗は致命的でないため握りつぶす）。 */
function persist() {
  void set(STORAGE_KEY, [...favorites]).catch(() => {});
}

// ブラウザでのみ初期ロードする（IndexedDB はサーバーに無い）。
if (typeof window !== 'undefined') {
  void get<string[]>(STORAGE_KEY)
    .then((stored) => {
      if (stored && stored.length > 0) {
        favorites = new Set(stored);
        emit();
      }
    })
    .catch(() => {});
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ReadonlySet<string> {
  return favorites;
}

function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

/** お気に入りをトグルする。新しい Set を作って参照を変え、購読者へ通知する。 */
export function toggleFavorite(id: string): void {
  const next = new Set(favorites);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  favorites = next;
  persist();
  emit();
}

/** お気に入り集合と操作関数を返すフック。 */
export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    /** お気に入りの ID 集合 */
    favorites: ids,
    /** 指定 ID がお気に入りかどうか */
    isFavorite: (id: string) => ids.has(id),
    /** お気に入りのトグル */
    toggle: toggleFavorite,
  };
}
