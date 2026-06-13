import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import { del, get, set } from 'idb-keyval';
import { type ReactNode, useState } from 'react';
import { trpc } from './trcp';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/trpc';

// 取得済みデータを IndexedDB にキャッシュする。
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
            gcTime: Number.POSITIVE_INFINITY,
            staleTime: 1000 * 60 * 5,
            networkMode: 'offlineFirst',
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: API_URL })],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: indexedDbPersister,
          // 24時間はキャッシュを有効とみなす。
          maxAge: 1000 * 60 * 60 * 24,
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}
