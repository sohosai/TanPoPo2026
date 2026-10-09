import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import { del, get, set } from 'idb-keyval';
import { type ReactNode, useState } from 'react';
import { trpc } from './trpc';

// キャッシュの互換性が壊れるような変更(APIレスポンス形状の変更など)をしたら値を上げる。
// 値を変えると、ユーザーのIndexedDBに残っている古いキャッシュ(ダミーデータ等)が破棄される。
const CACHE_BUSTER = '5';

// ログイン状態や投票結果などユーザー固有のデータを永続化すると、ログアウト後や
// 端末の共用時に別人の状態が表示されうるため、全員共通の公開データだけを保存する。
const PERSISTED_ROUTERS = new Set(['project', 'place']);

const indexedDbPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: 'tanpopo-query-cache',
});

export function TrpcProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24,
            staleTime: 1000 * 60 * 5,
            networkMode: 'offlineFirst',
            retry: 2,
            refetchOnMount: 'always',
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // API は同一オリジン（本番は同じ Worker、開発は Vite のプロキシ）で提供される。
        httpBatchLink({ url: '/trpc' }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: indexedDbPersister,
          maxAge: 1000 * 60 * 60 * 24,
          buster: CACHE_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const [path] = query.queryKey as [string[]?];
              return (
                PERSISTED_ROUTERS.has(path?.[0] ?? '') &&
                defaultShouldDehydrateQuery(query)
              );
            },
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}
