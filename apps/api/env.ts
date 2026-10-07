export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function getEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}
