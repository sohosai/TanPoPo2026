import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { cors } from 'hono/cors';
import { authRoutes } from './auth/routes';
import { SESSION_COOKIE_NAME } from './auth/session';
import { requireEnv } from './env';
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

requireEnv('DATABASE_URL');

const app = new Hono();

app.use(
  '/*',
  cors({
    origin: process.env.ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
);

app.route('/auth', authRoutes);

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) =>
      createTRPCContext(getCookie(c, SESSION_COOKIE_NAME)),
  }),
);

export default {
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  fetch: app.fetch,
};
