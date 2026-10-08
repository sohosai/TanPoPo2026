import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
// 生成物の型定義は index.d.ts のみで、拡張子付きの import から TypeScript が解決できない。
// @ts-expect-error TS7016
import { token } from './styled-system/tokens/index.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const parsedWebPort = Number.parseInt(env.PORT ?? '5173', 10);
  const webPort = Number.isNaN(parsedWebPort) ? 5173 : parsedWebPort;
  const apiDevUrl = 'http://localhost:8787';

  return {
    plugins: [
      reactRouter(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['logo/square.webp'],
        manifest: {
          name: 'TanPoPo 企画検索システム',
          short_name: 'TanPoPo',
          description: '筑波大学 雙峰祭 企画検索システム',
          lang: 'ja',
          theme_color: token('colors.brand.500'),
          background_color: token('colors.surface'),
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/',
          // API と同一オリジンのため、LINEログインのリダイレクト等のページ遷移を
          // Service Worker が index.html で横取りしないよう除外する。
          navigateFallbackDenylist: [/^\/auth\//, /^\/trpc\//],
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
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
