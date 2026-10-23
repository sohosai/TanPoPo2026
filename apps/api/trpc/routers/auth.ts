import { isLineLoginEnabled } from '../../domain/features';
import { lineProcedure, t } from '../trpc';

export const authRouter = t.router({
  auth: t.router({
    /** LINE ログインと、それを使う機能が有効か。無効でもエラーにしない。 */
    enabled: t.procedure.query(({ ctx }) => isLineLoginEnabled(ctx.env)),
    /** ログイン状態の確認。未ログイン時は null を返す（エラーにしない）。 */
    me: lineProcedure.query(({ ctx }) => ctx.user),
  }),
});
