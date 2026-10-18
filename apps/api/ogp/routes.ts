import type { HTMLRewriter as HTMLRewriterClass } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getSosClient } from '../services/sos';

// web の型チェックからも読まれ、そこでは Workers のグローバルが定義されないため、型付きで宣言し直す。
declare const HTMLRewriter: typeof HTMLRewriterClass;

const SITE_TITLE = '雙峰祭 企画検索システム';
const DESCRIPTION_MAX_LENGTH = 120;
// apps/web/scripts/build-ogp.ts が書き出す画像の大きさ。
const OGP_WIDTH = 1200;
const OGP_HEIGHT = 630;

export const ogpRoutes = new Hono<{ Bindings: AppEnv }>();

// 企画の個別ページ。SPA の index.html に、その企画の OGP を書き込んで返す。
ogpRoutes.get('/project/:number', async (c) => {
  const html = await c.env.ASSETS.fetch(c.req.url);
  const project = getSosClient(
    c.env.SOS_API_URL,
    c.env.HIDDEN_PROJECT_NUMBERS,
  ).getProjectMaster(c.req.param('number'));
  if (!project) return html as unknown as Response;

  const { origin } = new URL(c.req.url);
  const title = `${project.name} | ${SITE_TITLE}`;
  const description = truncate(
    project.description.replace(/\s+/g, ' ').trim() ||
      `${project.organization}による雙峰祭の企画「${project.name}」です。`,
    DESCRIPTION_MAX_LENGTH,
  );
  const content: Record<string, string> = {
    description,
    'og:title': title,
    'og:description': description,
    'og:url': `${origin}/project/${project.number}`,
    'og:image': `${origin}/ogp/project/${project.number}.png`,
    'og:image:width': String(OGP_WIDTH),
    'og:image:height': String(OGP_HEIGHT),
  };

  return new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(title);
      },
    })
    .on('meta', {
      element(element) {
        const key =
          element.getAttribute('property') ?? element.getAttribute('name');
        const value = key ? content[key] : undefined;
        if (value !== undefined) element.setAttribute('content', value);
      },
    })
    .transform(html) as unknown as Response;
});

// 上で拾わない /project/ 以下のパスは、通常どおり SPA に任せる。
ogpRoutes.get(
  '/project/*',
  (c) => c.env.ASSETS.fetch(c.req.url) as unknown as Response,
);

// OGP 画像はビルド時に全企画ぶん書き出してある。非表示の企画の番号は実行時の設定で決まるため、ここで出し分ける。
ogpRoutes.get('/ogp/project/:file', (c) => {
  const number = c.req.param('file').match(/^(\d{3})\.png$/)?.[1];
  const project =
    number &&
    getSosClient(
      c.env.SOS_API_URL,
      c.env.HIDDEN_PROJECT_NUMBERS,
    ).getProjectMaster(number);
  if (!project) return c.notFound();
  return c.env.ASSETS.fetch(c.req.url) as unknown as Response;
});

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
