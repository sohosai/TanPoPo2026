import { helloRouter } from './routers/hello';
import { shopRouter } from './routers/shop';
import { t } from './trpc';

export const appRouter = t.mergeRouters(helloRouter, shopRouter);

export type AppRouter = typeof appRouter;
