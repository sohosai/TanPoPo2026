import { initTRPC } from '@trpc/server';
import type { TRPCContext } from './context';

export const t = initTRPC.context<TRPCContext>().create();
