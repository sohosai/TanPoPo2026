import { t } from '../trpc';

export const authRouter = t.router({
  auth: t.router({
    /** ログイン状態の確認。未ログイン時は null を返す（エラーにしない）。 */
    me: t.procedure.query(({ ctx }) => ctx.user),
  }),
});
