import { initTRPC, TRPCError } from '@trpc/server';
import {
  type Feature,
  isFeatureEnabled,
  isLineLoginEnabled,
} from '../domain/features';
import type { TRPCContext } from './context';

export const t = initTRPC.context<TRPCContext>().create();

/** LINE ログインそのもののプロシージャ。LINE ログインを使う機能がどれも無効なら NOT_FOUND を投げる。 */
export const lineProcedure = t.procedure.use(({ ctx, next }) => {
  if (!isLineLoginEnabled(ctx.env)) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return next();
});

/** 機能のプロシージャ。その機能が無効なら NOT_FOUND を投げる。 */
export const featureProcedure = (feature: Feature) =>
  t.procedure.use(({ ctx, next }) => {
    if (!isFeatureEnabled(ctx.env, feature)) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    return next();
  });

/** ログイン必須の機能のプロシージャ。その機能が無効なら NOT_FOUND、未ログイン時は UNAUTHORIZED を投げる。 */
export const protectedProcedure = (feature: Feature) =>
  featureProcedure(feature).use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'ログインが必要です',
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
