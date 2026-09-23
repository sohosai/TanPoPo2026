import { TRPCError } from '@trpc/server';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client';
import {
  grandprixDraws,
  grandprixGeneralVotes,
  grandprixStages,
  grandprixStageVotes,
  grandprixVotes,
  users,
} from '../../db/schema';
import { sosClient } from '../../services/sos';
import { protectedProcedure, t } from '../trpc';

type GrandprixResult = 'win' | 'lose';

function isDuplicateKeyError(error: unknown): boolean {
  const cause = error instanceof DrizzleQueryError ? error.cause : undefined;
  return (
    !!cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    cause.code === 'ER_DUP_ENTRY'
  );
}

function drawResult(): GrandprixResult {
  const winRate = Number.parseFloat(process.env.GRANDPRIX_WIN_RATE ?? '0.2');
  return Math.random() < winRate ? 'win' : 'lose';
}

const submitInputSchema = z.object({
  // 一般部門: 最大4件、重複投票不可（同一企画への複数投票は禁止）。
  generalShopIds: z
    .array(z.string())
    .max(4)
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
      const vote = await db.query.grandprixVotes.findFirst({
        where: eq(grandprixVotes.userId, ctx.user.id),
        with: { draw: true },
      });

      if (!vote) {
        return { hasVoted: false as const, result: null };
      }

      return {
        hasVoted: true as const,
        result: (vote.draw?.result ?? null) as GrandprixResult | null,
      };
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

        if (input.generalShopIds.length > 0) {
          const shops = await sosClient.getShops();
          const validShopIds = new Set(shops.map((shop) => shop.id));
          for (const shopId of input.generalShopIds) {
            if (!validShopIds.has(shopId)) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `無効な企画IDです: ${shopId}`,
              });
            }
          }
        }

        const voteId = crypto.randomUUID();

        try {
          const result = await db.transaction(async (tx) => {
            await tx.insert(grandprixVotes).values({
              id: voteId,
              userId: ctx.user.id,
            });

            if (input.generalShopIds.length > 0) {
              await tx
                .insert(grandprixGeneralVotes)
                .values(
                  input.generalShopIds.map((shopId) => ({ voteId, shopId })),
                );
            }

            await tx
              .insert(grandprixStageVotes)
              .values(input.stagePlaceIds.map((stage) => ({ voteId, stage })));

            await tx
              .update(users)
              .set({ isTsukubaStudent: input.isTsukubaStudent })
              .where(eq(users.id, ctx.user.id));

            const result = drawResult();
            await tx.insert(grandprixDraws).values({
              id: crypto.randomUUID(),
              voteId,
              result,
            });

            return result;
          });

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
