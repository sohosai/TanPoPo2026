import { initTRPC, TRPCError } from '@trpc/server';
import { LINE_LOGIN_ENABLED } from '../domain/features';
import type { TRPCContext } from './context';

export const t = initTRPC.context<TRPCContext>().create();

/** LINE ログインを使う機能のプロシージャ。LINE ログインが無効なら NOT_FOUND を投げる。 */
export const lineProcedure = t.procedure.use(({ next }) => {
  if (!LINE_LOGIN_ENABLED) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return next();
});

/** ログイン必須のプロシージャ。LINE ログインが無効なら NOT_FOUND、未ログイン時は UNAUTHORIZED を投げる。 */
export const protectedProcedure = lineProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'ログインが必要です',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
