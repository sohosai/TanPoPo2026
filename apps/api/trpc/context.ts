export type TRPCContext = {
  env: NodeJS.ProcessEnv;
};

export async function createTRPCContext(): Promise<TRPCContext> {
  return {
    env: process.env,
  };
}
