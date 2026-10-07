import { DrizzleQueryError } from 'drizzle-orm';

export function isDuplicateKeyError(error: unknown): boolean {
  const cause = error instanceof DrizzleQueryError ? error.cause : undefined;
  return (
    !!cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    cause.code === 'ER_DUP_ENTRY'
  );
}
