import type { ScheduledController } from '@cloudflare/workers-types';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { authRoutes } from './auth/routes';
import { SESSION_COOKIE_NAME } from './auth/session';
import { aggregateCrowd } from './crowd/aggregate';
import { crowdApiRoutes, telemetryRoutes } from './crowd/routes';
import { isLineLoginEnabled } from './domain/features';
import type { AppEnv } from './env';
import { ogpRoutes } from './ogp/routes';
import { createTRPCContext } from './trpc/context';
import { appRouter } from './trpc/router';

export type { GrandprixStage } from './db/schema';
export type {
  CrowdAreaMinute,
  CrowdPoint,
  LocationPoint,
  LocationReport,
} from './domain/crowd';
export type { Feature } from './domain/features';
export type { Place, PlaceKind } from './domain/place';
export type {
  Performance,
  Project,
  ProjectCategory,
  ProjectDetail,
  ProjectImage,
  ProjectLink,
  ProjectLinkKind,
  ProjectLocation,
  ScheduleDay,
} from './domain/project';
export type { AppRouter } from './trpc/router';
export type { MaxGeneralVotes } from './trpc/routers/grandprix';
export type { MaxHeadcount } from './trpc/routers/questionnaire';

// web の静的アセットと同一オリジンで配信するため CORS は不要。
// wrangler.jsonc の run_worker_first に挙げたパス以外は、assets 設定で静的配信される。
const app = new Hono<{ Bindings: AppEnv }>();

// LINE ログインを無効にしている間は、ログイン・ログアウトの入口ごと塞ぐ。
app.use('/auth/*', async (c, next) => {
  if (!isLineLoginEnabled(c.env)) return c.notFound();
  await next();
});
app.route('/auth', authRoutes);
app.route('/', ogpRoutes);
app.route('/telemetry', telemetryRoutes);
app.route('/crowd/api', crowdApiRoutes);

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) =>
      createTRPCContext(c.env, getCookie(c, SESSION_COOKIE_NAME)),
  }),
);

export default {
  fetch: app.fetch,
  // 人流の集計（crowd_area_minutes）。wrangler.jsonc の triggers.crons で毎分呼ばれる。
  scheduled: (controller: ScheduledController, env: AppEnv) =>
    aggregateCrowd(env.DB, controller.scheduledTime),
};
