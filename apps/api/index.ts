import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { authRoutes } from './auth/routes';
import { SESSION_COOKIE_NAME } from './auth/session';
import type { AppEnv } from './env';
import { createTRPCContext } from './trpc/context';
import { appRouter } from './trpc/router';

export type { GrandprixStage } from './db/schema';
export type { AppRouter } from './trpc/router';
export type { MaxGeneralVotes } from './trpc/routers/grandprix';
export type { Place, PlaceKind } from './trpc/routers/place';
export type { MaxHeadcount } from './trpc/routers/questionnaire';
export type {
  ScheduleDay,
  Shop,
  ShopCategory,
  ShopDetail,
  ShopLocation,
} from './trpc/routers/shop';

// web の静的アセットと同一オリジンで配信するため CORS は不要。
// /trpc/* と /auth/* 以外は wrangler.jsonc の assets 設定で静的配信される。
const app = new Hono<{ Bindings: AppEnv }>();

app.route('/auth', authRoutes);

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) =>
      createTRPCContext(c.env, getCookie(c, SESSION_COOKIE_NAME)),
  }),
);

export default app;
