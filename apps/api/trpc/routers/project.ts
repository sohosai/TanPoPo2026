import { TRPCError } from '@trpc/server';
import type { ProjectDetail } from '../../domain/project';
import { t } from '../trpc';

export const projectRouter = t.router({
  project: t.router({
    // 詳細も一覧に含めて一度に返す。web はこれを端末に保存し、オフラインでも全企画の詳細を見せる。
    list: t.procedure.query(async ({ ctx }): Promise<ProjectDetail[]> => {
      try {
        return await ctx.sos.getProjectDetails();
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '店舗一覧の取得に失敗しました',
        });
      }
    }),
  }),
});
