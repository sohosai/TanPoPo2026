import { helloRouter } from './routers/hello';
import { t } from './trpc';

export const appRouter = t.mergeRouters(helloRouter);

export type AppRouter = typeof appRouter;
