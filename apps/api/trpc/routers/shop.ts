import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Shop, ShopDetail } from '../../domain/shop';
import { SosClientError } from '../../services/sos';
import { t } from '../trpc';

export const shopRouter = t.router({
  shop: t.router({
    list: t.procedure.query(async ({ ctx }): Promise<Shop[]> => {
      try {
        return await ctx.sos.getShops();
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '店舗一覧の取得に失敗しました',
        });
      }
    }),

    detail: t.procedure
      .input(z.object({ number: z.string() }))
      .query(async ({ ctx, input }): Promise<ShopDetail> => {
        try {
          return await ctx.sos.getShopDetail(input.number);
        } catch (error: unknown) {
          if (error instanceof SosClientError && error.code === 'NOT_FOUND') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '店舗詳細の取得に失敗しました',
          });
        }
      }),
  }),
});
