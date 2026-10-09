import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const parsedWebPort = Number.parseInt(env.PORT ?? '5173', 10);
  const webPort = Number.isNaN(parsedWebPort) ? 5173 : parsedWebPort;
  const apiDevUrl = 'http://localhost:8787';

  return {
    plugins: [reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: 'localhost',
      port: webPort,
      // 本番と同じく同一オリジンで API を叩けるよう、wrangler dev へ転送する。
      proxy: {
        '/trpc': apiDevUrl,
        '/auth': apiDevUrl,
      },
    },
  };
});
