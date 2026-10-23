import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from 'api';
import { trpc } from '~/lib/trpc';

// React の外（clientLoader）から呼ぶため、フックとは別にクライアントを持つ。
const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })],
});

/** LINE ログインを使う機能がサーバーで有効か。取得できないときは無効として扱う。 */
export async function fetchLineLoginEnabled(): Promise<boolean> {
  try {
    return await client.auth.enabled.query();
  } catch {
    return false;
  }
}

/** LINE ログインを使う機能がサーバーで有効か。取得するまでは無効として扱う。 */
export function useLineLoginEnabled(): boolean {
  const { data } = trpc.auth.enabled.useQuery();
  return data ?? false;
}

/** LINEログイン状態を取得するフック。未ログイン時は `user: null`（エラーにはならない）。 */
export function useAuth() {
  const { data, status } = trpc.auth.me.useQuery();
  return {
    user: data ?? null,
    isLoading: status === 'pending',
  };
}

export function getLineLoginUrl(redirectPath: string): string {
  return `/auth/line/login?redirect=${encodeURIComponent(redirectPath)}`;
}
