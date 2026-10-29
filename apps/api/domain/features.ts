import type { AppEnv } from '../env';

/** LINE ログインを使う機能。機能ごとに環境変数で受付を切り替える。 */
export type Feature = 'grandprix' | 'questionnaire';

const FEATURE_ENV = {
  grandprix: 'GRANDPRIX_ENABLED',
  questionnaire: 'QUESTIONNAIRE_ENABLED',
} as const satisfies Record<Feature, keyof AppEnv>;

type FeatureEnv = Pick<AppEnv, (typeof FEATURE_ENV)[Feature]>;

export const isFeatureEnabled = (env: FeatureEnv, feature: Feature) =>
  env[FEATURE_ENV[feature]] === 'true';

/** どれかの機能が有効な間だけ、LINE ログインを受け付ける。 */
export const isLineLoginEnabled = (env: FeatureEnv) =>
  isFeatureEnabled(env, 'grandprix') || isFeatureEnabled(env, 'questionnaire');
