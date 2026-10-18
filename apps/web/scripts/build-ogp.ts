import { mkdir, readFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { IconMapPinFilled } from '@tabler/icons-react';
import type { Place, ProjectCategory, ProjectImage } from 'api';
import { SosClient } from 'api/services/sos';
import { places } from 'api/trpc/routers/place';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { formatProjectLocation } from '../app/lib/places';
import config from '../panda.config';
import type { OgpColors, OgpTask, RenderInput } from './ogp-render';

// 企画の個別ページ（/project/:number）の OGP 画像を、全企画ぶん build/client/ogp/project/ に書き出す。
// 非表示の企画の画像も書き出し、配信するかは Worker（apps/api/ogp/routes.ts）が実行時の設定で決める。

const OUT_DIR = 'build/client/ogp/project';
const THUMBNAIL_WIDTH = 320;
const FETCH_CONCURRENCY = 8;
const FONT_FAMILY = 'Noto Sans JP';

const CATEGORY_TOKENS: Record<ProjectCategory, string> = {
  食事: 'meal',
  スイーツ: 'sweets',
  ドリンク: 'drink',
  物品販売: 'goods',
  展示型: 'exhibit',
  参加型: 'handsOn',
  学術: 'academic',
  パフォーマンス: 'performance',
  音楽: 'music',
  委員会企画: 'committee',
  その他: 'other',
};

type Token = { value: string };
const extend = config.theme?.extend as unknown as {
  tokens: { colors: { brand: Record<string, Token> } };
  semanticTokens: {
    colors: {
      category: Record<string, { DEFAULT: Token; bg: Token }>;
      fg: { DEFAULT: Token; strong: Token; muted: Token };
    };
  };
};
const { category, fg } = extend.semanticTokens.colors;
const colors: OgpColors = {
  category: Object.fromEntries(
    Object.entries(CATEGORY_TOKENS).map(([name, token]) => [
      name,
      { dot: category[token].DEFAULT.value, bg: category[token].bg.value },
    ]),
  ) as OgpColors['category'],
  fg: fg.DEFAULT.value,
  fgStrong: fg.strong.value,
  fgMuted: fg.muted.value,
};

// 場所のアイコンは web と同じ Tabler Icons を、accent（brand.500）で塗って SVG にする。
const pin = renderToStaticMarkup(
  createElement(IconMapPinFilled, {
    color: extend.tokens.colors.brand['500'].value,
  }),
);

const placesById: ReadonlyMap<string, Place> = new Map(
  places.map((place) => [place.id, place]),
);

const projects = await new SosClient(
  process.env.SOS_API_URL ?? '',
  new Set(),
).getProjectDetails();

const thumbnails = await mapConcurrent(projects, FETCH_CONCURRENCY, (project) =>
  loadThumbnail(project.thumbnail),
);
const tasks: OgpTask[] = projects.map((project, i) => ({
  number: project.number,
  name: project.name,
  organization: project.organization,
  category: project.category,
  location: formatProjectLocation(project, placesById),
  thumbnail: thumbnails[i],
}));

const [font, background, logo] = await Promise.all([
  loadFont(
    tasks
      .map((t) => t.name + t.organization + t.category + t.location)
      .join(''),
  ),
  readFile('public/ogp/project-ogp-layout.png'),
  sharp('public/logo/wide.webp').resize({ width: 480 }).png().toBuffer(),
]);

await mkdir(OUT_DIR, { recursive: true });

// 描画（resvg）は CPU を使い切るため、コア数ぶんのスレッドに企画を振り分ける。
const threads = Math.min(availableParallelism(), tasks.length);
await Promise.all(
  Array.from({ length: threads }, (_, i) =>
    runWorker({
      tasks: tasks.filter((_, j) => j % threads === i),
      outDir: OUT_DIR,
      fontFamily: FONT_FAMILY,
      font,
      background: toDataUri(background, 'image/png'),
      logo: toDataUri(logo, 'image/png'),
      pin: toDataUri(Buffer.from(pin), 'image/svg+xml'),
      colors,
    }),
  ),
);

const withThumbnail = tasks.filter((t) => t.thumbnail).length;
console.log(
  `ogp: ${tasks.length} 企画の画像を書き出し（アイコンあり ${withThumbnail}、${threads} スレッド）`,
);

function runWorker(input: RenderInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./ogp-render.ts', import.meta.url), {
      workerData: input,
    });
    worker.on('error', reject);
    worker.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ogp-render exited: ${code}`)),
    );
  });
}

/**
 * 企画のアイコンを PNG の data URI にする。satori・resvg は WebP を描けないため sharp で変換する。
 * SOS の画像は URL、手で追加した企画の画像は public/ 以下のパス。
 */
async function loadThumbnail(image: ProjectImage | undefined) {
  if (!image) return undefined;
  const src =
    image.srcSet
      ?.split(', ')
      .find((candidate) => candidate.endsWith(` ${THUMBNAIL_WIDTH}w`))
      ?.split(' ')[0] ?? image.src;
  if (src.startsWith('/')) return toPngDataUri(await readFile(`public${src}`));
  // 1枚取れないだけでデプロイを止めないよう、アイコンなしで描く。
  const response = await fetch(src);
  if (!response.ok) {
    console.warn(`ogp: アイコンを取得できない（${response.status}）: ${src}`);
    return undefined;
  }
  return toPngDataUri(Buffer.from(await response.arrayBuffer()));
}

async function toPngDataUri(data: Buffer) {
  return toDataUri(await sharp(data).png().toBuffer(), 'image/png');
}

/**
 * 描く文字だけを含む Noto Sans JP を Google Fonts から取る。
 * satori は WOFF2 を読めないため、TrueType を返す `text` 指定のサブセットを使う。
 */
async function loadFont(text: string): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    family: `${FONT_FAMILY}:wght@700`,
    text: [...new Set(`${text}…`)].join(''),
  });
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?${params}`)
  ).text();
  const url = css.match(
    /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/,
  )?.[1];
  if (!url) throw new Error(`Noto Sans JP の TrueType が見つからない:\n${css}`);
  return (await fetch(url)).arrayBuffer();
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i] as T);
      }
    }),
  );
  return results;
}

function toDataUri(data: Buffer, type: string): string {
  return `data:${type};base64,${data.toString('base64')}`;
}
