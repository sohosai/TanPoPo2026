import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'api';

// バックエンドからインポートした型を使ってReact用のtRPCフックを作成
export const trpc = createTRPCReact<AppRouter>();
