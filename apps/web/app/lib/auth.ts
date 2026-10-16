import { trpc } from '~/lib/trpc';

// API と同じ定数を見る。api の入口（index.ts）から読むとサーバーのコードまで画面に入るため、定数のファイルを直接読む。
export { LINE_LOGIN_ENABLED } from 'api/domain/features';

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
