import { writeFile } from 'node:fs/promises';
import { workerData } from 'node:worker_threads';
import { Resvg } from '@resvg/resvg-js';
import type { ProjectCategory } from 'api';
import satori from 'satori';

// build-ogp.ts が立てるスレッドで、割り当てられた企画の OGP 画像を描いて書き出す。

export const OGP_WIDTH = 1200;
export const OGP_HEIGHT = 630;

export type OgpTask = {
  number: string;
  name: string;
  organization: string;
  category: ProjectCategory;
  location: string;
  /** PNG の data URI */
  thumbnail?: string;
};

export type OgpColors = {
  /** dot は分類の色、bg はタグの面の色 */
  category: Record<ProjectCategory, { dot: string; bg: string }>;
  fg: string;
  fgStrong: string;
  fgMuted: string;
  accent: string;
};

export type RenderInput = {
  tasks: OgpTask[];
  outDir: string;
  fontFamily: string;
  font: ArrayBuffer;
  /** PNG の data URI */
  background: string;
  logo: string;
  colors: OgpColors;
};

// Tabler Icons の map-pin（filled）。
const MAP_PIN_PATH =
  'M18.364 4.636a9 9 0 0 1 .203 12.519l-.203 .21l-4.243 4.242a3 3 0 0 1 -4.097 .135l-.144 -.135l-4.244 -4.243a9 9 0 0 1 12.728 -12.728zm-6.364 3.364a3 3 0 1 0 0 6a3 3 0 0 0 0 -6';

type Child = SatoriElement | string | undefined;
type SatoriElement = {
  type: string;
  props: Record<string, unknown> & { children?: Child | Child[] };
};

const h = (
  type: string,
  props: Record<string, unknown>,
  ...children: Child[]
): SatoriElement => ({
  type,
  // satori は配列の子を（空でも）複数の子として扱い display の指定を求めるため、配列は2つ以上のときだけ渡す。
  props: {
    ...props,
    children: children.length > 1 ? children : children[0],
  },
});

const input = workerData as RenderInput;
const fonts = [
  {
    name: input.fontFamily,
    data: input.font,
    weight: 700 as const,
    style: 'normal' as const,
  },
];

for (const task of input.tasks) {
  const svg = await satori(
    // satori は React の要素と同じ形のオブジェクトを受け取る。
    layout(task) as unknown as Parameters<typeof satori>[0],
    { width: OGP_WIDTH, height: OGP_HEIGHT, fonts },
  );
  // 文字は satori がパスにしているため、resvg にシステムフォントを読ませない（読むと1枚に数秒かかる）。
  const png = new Resvg(svg, { font: { loadSystemFonts: false } })
    .render()
    .asPng();
  await writeFile(`${input.outDir}/${task.number}.png`, png);
}

function layout(task: OgpTask): SatoriElement {
  const { colors } = input;
  const color = colors.category[task.category];
  const ellipsis = {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };
  const icon = {
    position: 'absolute',
    left: 64,
    top: 80,
    width: 172,
    height: 172,
    borderRadius: 9999,
  };

  return h(
    'div',
    {
      style: {
        position: 'relative',
        display: 'flex',
        width: OGP_WIDTH,
        height: OGP_HEIGHT,
        fontFamily: input.fontFamily,
        color: colors.fg,
        backgroundColor: '#ffffff',
      },
    },
    h('img', {
      src: input.background,
      width: OGP_WIDTH,
      height: OGP_HEIGHT,
      style: { position: 'absolute', inset: 0, objectFit: 'cover' },
    }),
    task.thumbnail
      ? h('img', {
          src: task.thumbnail,
          width: 172,
          height: 172,
          style: { ...icon, objectFit: 'cover' },
        })
      : h('div', { style: { ...icon, backgroundColor: color.bg } }),
    h(
      'div',
      {
        style: {
          position: 'absolute',
          left: 266,
          top: 112,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 20,
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 22px 6px 18px',
            borderRadius: 9999,
            backgroundColor: color.bg,
            fontSize: 26,
            color: colors.fg,
          },
        },
        h('div', {
          style: {
            width: 16,
            height: 16,
            borderRadius: 9999,
            backgroundColor: color.dot,
          },
        }),
        task.category,
      ),
      task.location
        ? h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 28,
                color: colors.fgStrong,
              },
            },
            h(
              'svg',
              { width: 34, height: 34, viewBox: '0 0 24 24' },
              h('path', { d: MAP_PIN_PATH, fill: colors.accent }),
            ),
            h('div', { style: { maxWidth: 340, ...ellipsis } }, task.location),
          )
        : undefined,
    ),
    h(
      'div',
      {
        style: {
          position: 'absolute',
          left: 72,
          top: 272,
          width: 620,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        },
      },
      h(
        'div',
        {
          style: {
            display: 'block',
            lineClamp: 2,
            fontSize: 50,
            lineHeight: 1.3,
            color: colors.fgStrong,
          },
        },
        task.name,
      ),
      h(
        'div',
        { style: { fontSize: 30, color: colors.fgMuted, ...ellipsis } },
        task.organization,
      ),
    ),
    h('img', {
      src: input.logo,
      width: 240,
      height: 67,
      style: { position: 'absolute', left: 64, top: 512 },
    }),
  );
}
