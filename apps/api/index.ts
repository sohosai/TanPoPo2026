import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './auth/routes';
import { createTRPCContext } from './trpc/context';
import { appRouter } from './trpc/router';

export type { AppRouter } from './trpc/router';
export type { Place, PlaceKind } from './trpc/routers/place';
export type {
  ScheduleDay,
  Shop,
  ShopCategory,
  ShopDetail,
  ShopLocation,
} from './trpc/routers/shop';

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
    createContext: (_opts, c) => createTRPCContext(c),
  }),
);

export default {
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  fetch: app.fetch,
};
