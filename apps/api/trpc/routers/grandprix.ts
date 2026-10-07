import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { isDuplicateKeyError } from '../../db/errors';
import {
  grandprixDraws,
  grandprixGeneralVotes,
  grandprixStages,
  grandprixStageVotes,
  grandprixVotes,
  users,
} from '../../db/schema';
import { protectedProcedure, t } from '../trpc';

const MAX_GENERAL_VOTES = 4;
export type MaxGeneralVotes = typeof MAX_GENERAL_VOTES;

function drawResult(winRate: string): 'win' | 'lose' {
  return Math.random() < Number.parseFloat(winRate) ? 'win' : 'lose';
}

const submitInputSchema = z.object({
  // 一般部門: 最大4件、重複投票不可（同一企画への複数投票は禁止）。
  generalShopIds: z
    .array(z.string())
    .max(MAX_GENERAL_VOTES)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: '同じ企画に複数回投票することはできません',
    }),
  // ステージ部門: 1〜3件を独立に選択できる（1つだけでも、全部でもよい）。
  // 「大学会館ステージ（講堂/ホール）」は 'kaikan' に統合済み。
  stagePlaceIds: z
    .array(z.enum(grandprixStages))
    .max(grandprixStages.length)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: '同じステージに複数回投票することはできません',
    }),
  isTsukubaStudent: z.boolean(),
});

export const grandprixRouter = t.router({
  grandprix: t.router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const vote = await ctx.db.query.grandprixVotes.findFirst({
        where: eq(grandprixVotes.userId, ctx.user.id),
        with: { draw: true },
      });

      if (!vote) {
        return { hasVoted: false as const, result: null };
      }

      return { hasVoted: true as const, result: vote.draw?.result ?? null };
    }),

    submit: protectedProcedure
      .input(submitInputSchema)
      .mutation(async ({ ctx, input }) => {
        // クライアント側のボタンdisableだけに頼らず、サーバー側でも必ず再検証する。
        if (input.generalShopIds.length < 1 || input.stagePlaceIds.length < 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              '一般部門は1票以上、ステージ部門は1つ以上選択してから送信してください',
          });
        }

        const shops = await ctx.sos.getLiveShops().catch(() => {
          throw new TRPCError({
            code: 'SERVICE_UNAVAILABLE',
            message:
              '企画一覧を取得できませんでした。時間をおいて再度お試しください',
          });
        });
        const validShopIds = new Set(shops.map((shop) => shop.id));
        for (const shopId of input.generalShopIds) {
          if (!validShopIds.has(shopId)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `無効な企画IDです: ${shopId}`,
            });
          }
        }

        const voteId = crypto.randomUUID();
        const result = drawResult(ctx.env.GRANDPRIX_WIN_RATE);
        const { db } = ctx;

        try {
          // D1 は対話的トランザクションを持たないため、batch で全件を原子的に書き込む。
          await db.batch([
            db
              .insert(grandprixVotes)
              .values({ id: voteId, userId: ctx.user.id }),
            db
              .insert(grandprixGeneralVotes)
              .values(
                input.generalShopIds.map((shopId) => ({ voteId, shopId })),
              ),
            db
              .insert(grandprixStageVotes)
              .values(input.stagePlaceIds.map((stage) => ({ voteId, stage }))),
            db
              .update(users)
              .set({ isTsukubaStudent: input.isTsukubaStudent })
              .where(eq(users.id, ctx.user.id)),
            db
              .insert(grandprixDraws)
              .values({ id: crypto.randomUUID(), voteId, result }),
          ]);

          return { result };
        } catch (error) {
          if (isDuplicateKeyError(error)) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: '既に投票済みです',
            });
          }
          throw error;
        }
      }),
  }),
});
