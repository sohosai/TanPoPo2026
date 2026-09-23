import { initTRPC, TRPCError } from '@trpc/server';
import type { TRPCContext } from './context';

export const t = initTRPC.context<TRPCContext>().create();

/** ログイン必須のプロシージャ。未ログイン時は UNAUTHORIZED を投げる。 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'ログインが必要です',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
