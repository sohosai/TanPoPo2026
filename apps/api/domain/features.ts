import type { AppEnv } from '../env';

/** LINE ログインと、それを使う機能（グランプリ投票・来場者アンケート）を有効にするか。 */
export const isLineLoginEnabled = (env: Pick<AppEnv, 'LINE_LOGIN_ENABLED'>) =>
  env.LINE_LOGIN_ENABLED === 'true';
