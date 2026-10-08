import { authRouter } from './routers/auth';
import { grandprixRouter } from './routers/grandprix';
import { placeRouter } from './routers/place';
import { questionnaireRouter } from './routers/questionnaire';
import { projectRouter } from './routers/project';
import { t } from './trpc';

export const appRouter = t.mergeRouters(
  projectRouter,
  placeRouter,
  authRouter,
  grandprixRouter,
  questionnaireRouter,
);

export type AppRouter = typeof appRouter;
