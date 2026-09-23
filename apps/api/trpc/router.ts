import { authRouter } from './routers/auth';
import { grandprixRouter } from './routers/grandprix';
import { helloRouter } from './routers/hello';
import { placeRouter } from './routers/place';
import { questionnaireRouter } from './routers/questionnaire';
import { shopRouter } from './routers/shop';
import { t } from './trpc';

export const appRouter = t.mergeRouters(
  helloRouter,
  shopRouter,
  placeRouter,
  authRouter,
  grandprixRouter,
  questionnaireRouter,
);

export type AppRouter = typeof appRouter;
