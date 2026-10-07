// D1 の制約違反はエラーコードを持たず、メッセージでしか判別できない。
// drizzle が DrizzleQueryError で包む場合と包まない場合(batch)があるため cause を辿る。
export function isDuplicateKeyError(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) {
    if (e.message.includes('UNIQUE constraint failed')) return true;
  }
  return false;
}
