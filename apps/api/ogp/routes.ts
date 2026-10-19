import type { HTMLRewriter as HTMLRewriterClass } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getSosClient } from '../services/sos';

// web の型チェックからも読まれ、そこでは Workers のグローバルが定義されないため、型付きで宣言し直す。
declare const HTMLRewriter: typeof HTMLRewriterClass;

const SITE_TITLE = '雙峰祭 企画検索システム';
const DESCRIPTION_MAX_LENGTH = 120;
export const OGP_WIDTH = 1200;
export const OGP_HEIGHT = 630;

export const ogpRoutes = new Hono<{ Bindings: AppEnv }>();

// 元のリクエストをヘッダーごと静的アセットに渡す。web の型チェックでは Request が DOM の型になるため変換する。
const fetchAsset = (env: AppEnv, request: Request) =>
  env.ASSETS.fetch(
    request as unknown as Parameters<AppEnv['ASSETS']['fetch']>[0],
  ) as unknown as Promise<Response>;

ogpRoutes.get('/project/:number', async (c) => {
  // 書き換えた HTML は元のファイルと中身が変わるため、条件付きリクエストのヘッダーは渡さない。
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
ogpRoutes.get('/project/*', (c) => fetchAsset(c.env, c.req.raw));

// OGP 画像はビルド時に全企画ぶん書き出してある。非表示の企画の番号は実行時の設定で決まるため、ここで出し分ける。
ogpRoutes.get('/ogp/project/:file', async (c) => {
  const number = c.req.param('file').match(/^(\d{3})\.png$/)?.[1];
  const project =
    number &&
    getSosClient(
      c.env.SOS_API_URL,
      c.env.HIDDEN_PROJECT_NUMBERS,
    ).getProjectMaster(number);
  if (!project) return c.notFound();
  const response = await fetchAsset(c.env, c.req.raw);
  // 画像が無いと SPA の index.html が返るため、画像でなければ見つからない扱いにする。
  const isImage =
    response.status === 304 ||
    response.headers.get('Content-Type')?.startsWith('image/png');
  if (!isImage) return c.notFound();
  return response;
});

// 絵文字などのサロゲートペアの途中で切らないよう、文字単位で数える。
function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
}
