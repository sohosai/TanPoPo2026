/** 必須環境変数を取得する。未設定なら例外を投げる。 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** 環境変数を取得する。未設定ならデフォルト値を返す。 */
export function getEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}
