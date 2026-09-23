import { trpc } from '~/lib/trcp';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/trpc'
).replace(/\/trpc\/?$/, '');

/** LINEログイン状態を取得するフック。未ログイン時は `user: null`（エラーにはならない）。 */
export function useAuth() {
  const { data, status } = trpc.auth.me.useQuery();
  return {
    user: data ?? null,
    isLoading: status === 'pending',
  };
}

/** ログイン後に戻ってくる相対パスを指定して、LINEログインを開始するURLを組み立てる。 */
export function getLineLoginUrl(redirectPath: string): string {
  return `${API_BASE_URL}/auth/line/login?redirect=${encodeURIComponent(redirectPath)}`;
}
