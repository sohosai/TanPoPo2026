import { QueryClient } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import { del, get, set } from 'idb-keyval';
import { type ReactNode, useState } from 'react';
import { trpc } from './trpc';

const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

// 端末に残すのは誰が見ても同じ公開データだけにする。ログイン状態や回答などの個人データは
// 残さず、オフライン時にログイン済みと誤って見せないようにする。
const PERSISTED_ROUTERS = new Set(['project', 'place']);

const PERSIST_KEY = 'tanpopo-query-cache';

const persister: Persister = {
  persistClient: (client) => set(PERSIST_KEY, client),
  restoreClient: () => get(PERSIST_KEY),
  removeClient: () => del(PERSIST_KEY),
};

export function TrpcProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            // 保存より先に破棄されると端末に残らないため、保存期間と揃える。
            gcTime: CACHE_MAX_AGE,
            retry: 2,
            refetchOnWindowFocus: false,
            // 既定の online だと、キャッシュの無いオフライン時に読み込み中のまま止まる。
            networkMode: 'offlineFirst',
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
          persister,
          maxAge: CACHE_MAX_AGE,
          // デプロイで応答の形が変わっても、古い形のデータを読み込まないようにする。
          buster: __BUILD_ID__,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const [path] = query.queryKey as [string[]?];
              return (
                query.state.status === 'success' &&
                PERSISTED_ROUTERS.has(path?.[0] ?? '')
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
