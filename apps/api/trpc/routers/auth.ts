import { isFeatureEnabled } from '../../domain/features';
import { lineProcedure, t } from '../trpc';

export const authRouter = t.router({
  auth: t.router({
    /** LINE ログインを使う機能ごとの受付状態。無効でもエラーにしない。 */
    enabled: t.procedure.query(({ ctx }) => ({
      grandprix: isFeatureEnabled(ctx.env, 'grandprix'),
      questionnaire: isFeatureEnabled(ctx.env, 'questionnaire'),
    })),
    /** ログイン状態の確認。未ログイン時は null を返す（エラーにしない）。 */
    me: lineProcedure.query(({ ctx }) => ctx.user),
  }),
});
