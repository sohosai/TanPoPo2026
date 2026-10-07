import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { isDuplicateKeyError } from '../../db/errors';
import {
  type GrandprixStage,
  grandprixDraws,
  grandprixGeneralVotes,
  grandprixStages,
  grandprixStageVotes,
  grandprixVotes,
  users,
} from '../../db/schema';
import type { Shop } from '../../domain/shop';
import { protectedProcedure, t } from '../trpc';

const MAX_GENERAL_VOTES = 4;
export type MaxGeneralVotes = typeof MAX_GENERAL_VOTES;

// 投票のステージ → そのステージの place。会館は講堂とホールを1つのステージとして扱う。
const STAGE_PLACES: Record<GrandprixStage, string[]> = {
  '1a': ['stage-1a'],
  united: ['stage-united'],
  kaikan: ['stage-kaikan-kodo', 'stage-kaikan-hall'],
};

/** ステージ企画をステージごとにまとめる。投票画面のタブと投票時の検証で同じ区分けを使う。 */
function groupStageShops(shops: Shop[]) {
  return grandprixStages.map((stage) => ({
    stage,
    shops: shops.filter((shop) =>
      shop.locations.some(({ placeId }) =>
        STAGE_PLACES[stage].includes(placeId),
      ),
    ),
  }));
}

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
  // ステージ部門: ステージごとに1企画まで。どこか1つのステージに投票すればよい。
  stageShopIds: z.array(z.string()).max(grandprixStages.length),
  isTsukubaStudent: z.boolean(),
});

export const grandprixRouter = t.router({
  grandprix: t.router({
    stageShops: t.procedure.query(async ({ ctx }) =>
      groupStageShops(await ctx.sos.getShops()),
    ),

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
        if (input.generalShopIds.length < 1 || input.stageShopIds.length < 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              '一般部門は1票以上、ステージ部門はどこか1つのステージで投票してから送信してください',
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
        const stageOf = new Map(
          groupStageShops(shops).flatMap(({ stage, shops: stageShops }) =>
            stageShops.map((shop) => [shop.id, stage] as const),
          ),
        );
        for (const shopId of input.generalShopIds) {
          if (!validShopIds.has(shopId) || stageOf.has(shopId)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `一般部門に投票できない企画です: ${shopId}`,
            });
          }
        }
        const stageVotes = input.stageShopIds.map((shopId) => {
          const stage = stageOf.get(shopId);
          if (!stage) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `ステージ部門に投票できない企画です: ${shopId}`,
            });
          }
          return { stage, shopId };
        });
        if (
          new Set(stageVotes.map(({ stage }) => stage)).size < stageVotes.length
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '1つのステージに投票できるのは1企画までです',
          });
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
              .values(stageVotes.map((vote) => ({ voteId, ...vote }))),
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
