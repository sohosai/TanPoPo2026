import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client';
import {
  questionnaireResponses,
  questionnaireSubmissions,
  questionnaireTickets,
} from '../../db/schema';
import { protectedProcedure, t } from '../trpc';

// 子供の分もまとめて回答するケースを想定した人数上限。
const MAX_HEADCOUNT = 10;

const submitInputSchema = z.object({
  headcount: z.number().int().min(1).max(MAX_HEADCOUNT),
  // 質問内容は今後調整のため、回答は汎用的な key-value として受け取る。
  responses: z.array(z.record(z.string(), z.unknown())),
});

export const questionnaireRouter = t.router({
  questionnaire: t.router({
    myTickets: protectedProcedure.query(async ({ ctx }) => {
      const submissions = await db.query.questionnaireSubmissions.findMany({
        where: eq(questionnaireSubmissions.userId, ctx.user.id),
        with: { responses: { with: { ticket: true } } },
      });

      const tickets = submissions.flatMap((submission) =>
        submission.responses.flatMap((response) =>
          response.ticket
            ? [
                {
                  ticketId: response.ticket.id,
                  status: response.ticket.status,
                  usedAt: response.ticket.usedAt,
                  personIndex: response.personIndex,
                  submittedAt: submission.submittedAt,
                },
              ]
            : [],
        ),
      );

      return tickets.sort(
        (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
      );
    }),

    submit: protectedProcedure
      .input(submitInputSchema)
      .mutation(async ({ ctx, input }) => {
        // クライアント側の入力ステップ数だけに頼らず、サーバー側でも件数を再検証する。
        if (input.responses.length !== input.headcount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '回答件数が人数と一致しません',
          });
        }

        const submissionId = crypto.randomUUID();
        const responseRows = input.responses.map((answers, index) => ({
          id: crypto.randomUUID(),
          submissionId,
          personIndex: index + 1,
          answers,
        }));
        const ticketRows = responseRows.map((response) => ({
          id: crypto.randomUUID(),
          responseId: response.id,
        }));

        await db.transaction(async (tx) => {
          await tx.insert(questionnaireSubmissions).values({
            id: submissionId,
            userId: ctx.user.id,
            headcount: input.headcount,
          });
          await tx.insert(questionnaireResponses).values(responseRows);
          await tx.insert(questionnaireTickets).values(ticketRows);
        });

        return { submissionId };
      }),

    markUsed: protectedProcedure
      .input(z.object({ ticketId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // 「係員が操作する」はUI上の運用であって認可境界ではないため、
        // 他人のticketIdを渡されても更新できないよう本人のチケットか必ず確認する。
        const rows = await db
          .select({ userId: questionnaireSubmissions.userId })
          .from(questionnaireTickets)
          .innerJoin(
            questionnaireResponses,
            eq(questionnaireTickets.responseId, questionnaireResponses.id),
          )
          .innerJoin(
            questionnaireSubmissions,
            eq(
              questionnaireResponses.submissionId,
              questionnaireSubmissions.id,
            ),
          )
          .where(eq(questionnaireTickets.id, input.ticketId))
          .limit(1);

        const owner = rows[0];
        if (!owner || owner.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'チケットが見つかりません',
          });
        }

        await db
          .update(questionnaireTickets)
          .set({ status: 'used', usedAt: new Date() })
          .where(eq(questionnaireTickets.id, input.ticketId));

        return { ok: true };
      }),
  }),
});
