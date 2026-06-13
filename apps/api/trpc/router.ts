import { helloRouter } from './routers/hello';
import { placeRouter } from './routers/place';
import { shopRouter } from './routers/shop';
import { t } from './trpc';

export const appRouter = t.mergeRouters(helloRouter, shopRouter, placeRouter);

export type AppRouter = typeof appRouter;
