import { generateSW } from 'workbox-build';

const DAY = 60 * 60 * 24;

// SPA モードの index.html は Vite のビルドが終わった後に作られるため、Vite のプラグインではなく
// ビルド結果に対して Service Worker を生成する。
const { count, size, warnings } = await generateSW({
  globDirectory: 'build/client',
  globPatterns: ['**/*.{html,js,css,svg,webp,png,ico,webmanifest}'],
  swDest: 'build/client/sw.js',
  navigateFallback: '/index.html',
  // LINE ログインのリダイレクト等は Worker に届かせる。
  // 埋め込みは他サイトの iframe に入れられるよう、保存した index.html（埋め込みを禁じるヘッダー付き）
  // ではなく、埋め込み用のヘッダーが付いた応答を毎回サーバーから受け取る。
  navigateFallbackDenylist: [/^\/trpc\//, /^\/auth\//, /^\/embed(\/|$)/],
  cleanupOutdatedCaches: true,
  // tRPC の応答は Service Worker では扱わず、web 側で TanStack Query のキャッシュとして端末に保存する。
  runtimeCaching: [
    {
      // 企画画像（SOS）。画像の URL は変わらないため、一度取れたものを使い続ける。
      urlPattern: /^https:\/\/[^/]+\/openapi\/images\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'project-images',
        // <img> は CORS なしで読み込むため、中身の見えない応答（status 0）も保存する。
        cacheableResponse: { statuses: [0, 200] },
        expiration: { maxEntries: 600, maxAgeSeconds: 30 * DAY },
      },
    },
    {
      urlPattern: /^https:\/\/api\.maptiler\.com\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'map-tiles',
        cacheableResponse: { statuses: [0, 200] },
        expiration: { maxEntries: 3000, maxAgeSeconds: 30 * DAY },
      },
    },
    {
      urlPattern:
        /^https:\/\/(openmaptiles\.github\.io|fonts\.googleapis\.com)\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'map-sprites-and-font-css',
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'fonts',
        cacheableResponse: { statuses: [0, 200] },
        expiration: { maxEntries: 60, maxAgeSeconds: 365 * DAY },
      },
    },
  ],
});

for (const warning of warnings) console.warn(warning);
console.log(
  `sw.js: ${count} files (${(size / 1024 / 1024).toFixed(1)} MB) を precache`,
);
