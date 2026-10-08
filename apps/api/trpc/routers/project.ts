import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Project, ProjectDetail } from '../../domain/project';
import { SosClientError } from '../../services/sos';
import { t } from '../trpc';

export const projectRouter = t.router({
  project: t.router({
    list: t.procedure.query(async ({ ctx }): Promise<Project[]> => {
      try {
        return await ctx.sos.getProjects();
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '店舗一覧の取得に失敗しました',
        });
      }
    }),

    detail: t.procedure
      .input(z.object({ number: z.string() }))
      .query(async ({ ctx, input }): Promise<ProjectDetail> => {
        try {
          return await ctx.sos.getProjectDetail(input.number);
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
