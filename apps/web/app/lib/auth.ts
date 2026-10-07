import { trpc } from '~/lib/trcp';

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
