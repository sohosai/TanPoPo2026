import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createTRPCContext } from './trpc/context';
import { appRouter } from './trpc/router';

export type { AppRouter } from './trpc/router';

const app = new Hono();

app.use(
  '/*',
  cors({
    origin: process.env.ORIGIN ?? 'http://localhost:5173',
  }),
);

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: () => createTRPCContext(),
  }),
);

export default {
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  fetch: app.fetch,
};
