import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { isDuplicateKeyError } from '../../db/errors';
import {
  type GrandprixStage,
  grandprixDraws,
  grandprixGeneralVotes,
  grandprixPrizes,
  grandprixStages,
  grandprixStageVotes,
  grandprixVotes,
  users,
} from '../../db/schema';
import type { Project } from '../../domain/project';
import { parseProjectNumbers } from '../../services/sos';
import { lineProcedure, protectedProcedure, t } from '../trpc';

const MAX_GENERAL_VOTES = 4;
export type MaxGeneralVotes = typeof MAX_GENERAL_VOTES;

// 投票のステージ → そのステージの place。会館は講堂とホールを1つのステージとして扱う。
const STAGE_PLACES: Record<GrandprixStage, string[]> = {
  '1a': ['stage-1a'],
  united: ['stage-united'],
  kaikan: ['stage-kaikan-kodo', 'stage-kaikan-hall'],
};

/** ステージ企画をステージごとにまとめる。投票画面のタブと投票時の検証で同じ区分けを使う。 */
function groupStageProjects(projects: Project[]) {
  return grandprixStages.map((stage) => ({
    stage,
    projects: projects.filter((project) =>
      project.locations.some(({ placeId }) =>
        STAGE_PLACES[stage].includes(placeId),
      ),
    ),
  }));
}

/** グランプリ投票の対象から、環境変数で非表示にした企画を除く。 */
function votableProjects(projects: Project[], hiddenNumbers?: string) {
  const hidden = parseProjectNumbers(hiddenNumbers);
  return projects.filter(({ number }) => !hidden.has(number));
}

/**
 * 日本時間の日付ごとの、その日までに出せる当たりの累計。載っていない日は 0。
 * 前日に余った枠はあとの日にも取れる。全体の上限は grandprix_prizes の行数（5）で、ここで増やしても超えない。
 */
const PRIZE_LIMITS: Record<string, number> = {
  '2026-10-31': 3,
  '2026-11-01': 5,
};

function prizeLimitOn(date: Date): number {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return PRIZE_LIMITS[jstDate] ?? 0;
}

const submitInputSchema = z.object({
  // 一般部門: 最大4件、重複投票不可（同一企画への複数投票は禁止）。
  generalProjectIds: z
    .array(z.string())
    .max(MAX_GENERAL_VOTES)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: '同じ企画に複数回投票することはできません',
    }),
  // ステージ部門: 任意。ステージごとに1企画まで。
  stageProjectIds: z.array(z.string()).max(grandprixStages.length),
  isTsukubaStudent: z.boolean(),
});

export const grandprixRouter = t.router({
  grandprix: t.router({
    stageProjects: lineProcedure.query(async ({ ctx }) =>
      groupStageProjects(
        votableProjects(
          await ctx.sos.getProjects(),
          ctx.env.GRANDPRIX_HIDDEN_PROJECT_NUMBERS,
        ),
      ),
    ),

    // ステージ企画はステージ部門でだけ投票できるため、一般部門の一覧から除く。
    generalProjects: lineProcedure.query(async ({ ctx }) => {
      const projects = votableProjects(
        await ctx.sos.getProjects(),
        ctx.env.GRANDPRIX_HIDDEN_PROJECT_NUMBERS,
      );
      const stageProjectIds = new Set(
        groupStageProjects(projects).flatMap((group) =>
          group.projects.map((project) => project.id),
        ),
      );
      return projects.filter((project) => !stageProjectIds.has(project.id));
    }),

    status: protectedProcedure.query(async ({ ctx }) => {
      const vote = await ctx.db.query.grandprixVotes.findFirst({
        where: eq(grandprixVotes.userId, ctx.user.id),
        with: { draw: true },
      });

      if (!vote) {
        return { hasVoted: false as const, result: null, drawnAt: null };
      }

      return {
        hasVoted: true as const,
        result: vote.draw?.result ?? null,
        // superjson を使っていないため、Date のままだと型と実際の値（文字列）が食い違う。
        drawnAt: vote.draw?.drawnAt.toISOString() ?? null,
      };
    }),

    submit: protectedProcedure
      .input(submitInputSchema)
      .mutation(async ({ ctx, input }) => {
        // クライアント側のボタンdisableだけに頼らず、サーバー側でも必ず再検証する。
        if (input.generalProjectIds.length < 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '一般部門は1票以上投票してから送信してください',
          });
        }

        const projects = votableProjects(
          await ctx.sos.getProjects(),
          ctx.env.GRANDPRIX_HIDDEN_PROJECT_NUMBERS,
        );
        const validProjectIds = new Set(projects.map((project) => project.id));
        const stageOf = new Map(
          groupStageProjects(projects).flatMap(
            ({ stage, projects: stageProjects }) =>
              stageProjects.map((project) => [project.id, stage] as const),
          ),
        );
        for (const projectId of input.generalProjectIds) {
          if (!validProjectIds.has(projectId) || stageOf.has(projectId)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `一般部門に投票できない企画です: ${projectId}`,
            });
          }
        }
        const stageVotes = input.stageProjectIds.map((projectId) => {
          const stage = stageOf.get(projectId);
          if (!stage) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `ステージ部門に投票できない企画です: ${projectId}`,
            });
          }
          return { stage, projectId };
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
        const drawnAt = new Date();
        const prizeLimit = prizeLimitOn(drawnAt);
        const rolledWin =
          Math.random() < Number.parseFloat(ctx.env.GRANDPRIX_WIN_RATE);
        const { db } = ctx;

        try {
          // D1 は対話的トランザクションを持たないため、batch で全件を原子的に書き込む。
          // batch は他の書き込みと混ざらずに実行されるため、同時に当たっても同じ枠を二重に取らない。
          const results = await db.batch([
            db
              .insert(grandprixVotes)
              .values({ id: voteId, userId: ctx.user.id }),
            db.insert(grandprixGeneralVotes).values(
              input.generalProjectIds.map((projectId) => ({
                voteId,
                projectId,
              })),
            ),
            // 空の values は drizzle が拒むため、ステージ部門に投票したときだけ書き込む。
            ...(stageVotes.length > 0
              ? [
                  db
                    .insert(grandprixStageVotes)
                    .values(stageVotes.map((vote) => ({ voteId, ...vote }))),
                ]
              : []),
            db
              .update(users)
              .set({ isTsukubaStudent: input.isTsukubaStudent })
              .where(eq(users.id, ctx.user.id)),
            ...(rolledWin && prizeLimit > 0
              ? [
                  db
                    .update(grandprixPrizes)
                    .set({ voteId })
                    .where(
                      eq(
                        grandprixPrizes.id,
                        sql`(SELECT ${grandprixPrizes.id} FROM ${grandprixPrizes} WHERE ${grandprixPrizes.voteId} IS NULL AND ${grandprixPrizes.id} <= ${prizeLimit} ORDER BY ${grandprixPrizes.id} LIMIT 1)`,
                      ),
                    ),
                ]
              : []),
            // 枠が残っていなければ、確率で当たっていてもはずれにする。
            db
              .insert(grandprixDraws)
              .values({
                id: crypto.randomUUID(),
                voteId,
                result: sql`CASE WHEN EXISTS (SELECT 1 FROM ${grandprixPrizes} WHERE ${grandprixPrizes.voteId} = ${voteId}) THEN 'win' ELSE 'lose' END`,
                drawnAt,
              })
              .returning({ result: grandprixDraws.result }),
          ]);
          const [draw] = results[results.length - 1] as {
            result: 'win' | 'lose';
          }[];
          if (!draw) throw new Error('抽選結果を記録できませんでした');

          return { result: draw.result, drawnAt: drawnAt.toISOString() };
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
