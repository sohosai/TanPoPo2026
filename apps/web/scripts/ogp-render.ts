import { writeFile } from 'node:fs/promises';
import { workerData } from 'node:worker_threads';
import { Resvg } from '@resvg/resvg-js';
import type { ProjectCategory } from 'api';
import { OGP_HEIGHT, OGP_WIDTH } from 'api/ogp/routes';
import { loadDefaultJapaneseParser } from 'budoux';
import satori from 'satori';

// build-ogp.ts が立てるスレッドで、割り当てられた企画の OGP 画像を描いて書き出す。

export type OgpTask = {
  number: string;
  name: string;
  organization: string;
  category: ProjectCategory;
  /** 場所の表記（複数の場所があれば「ほかNか所」付き） */
  /** 場所の表記（重複を除いた、企画の場所の順） */
  locations: string[];
  /** PNG の data URI */
  thumbnail?: string;
};

export type OgpColors = {
  /** dot は分類の色、bg はタグの面の色 */
  category: Record<ProjectCategory, { dot: string; bg: string }>;
  fg: string;
  fgStrong: string;
  fgMuted: string;
};

export type OgpFont = { name: string; data: ArrayBuffer };

export type RenderInput = {
  tasks: OgpTask[];
  outDir: string;
  /** 文字に使うフォント。fonts のうち、これに無い字形はほかのフォントで描く */
  fontFamily: string;
  fonts: OgpFont[];
  /** PNG の data URI */
  background: string;
  logo: string;
  /** ロゴの高さ / 幅 */
  logoAspectRatio: number;
  /** 場所のアイコン（SVG の data URI） */
  pin: string;
  colors: OgpColors;
};

// カテゴリタグの点と、場所のピンの穴の中心を同じ横位置にそろえる。
// ピン（Tabler Icons）の穴は横幅の中央にあるため、タグの高さをピンの幅と同じにし、点をタグの左端の半円と同心に置く。
// 点と文字の間隔は、ピンと文字の見た目の間隔（ピンの右の余白を含む）に合わせる。
const PIN_SIZE = 36;
const TAG_HEIGHT = PIN_SIZE;
const DOT_SIZE = 14;
const DOT_LEFT = (TAG_HEIGHT - DOT_SIZE) / 2;
const DOT_GAP = 8;
const PIN_GAP = 4;
const TAG_FONT_SIZE = 22;
const TITLE_WIDTH = 620;
const TITLE_FONT_SIZE = 50;
const TITLE_LINE_HEIGHT = 1.3;
const TITLE_MAX_LINES = 2;
const LOCATION_FONT_SIZE = 28;
const LOCATION_MAX_WIDTH = 340;
// 「第二・第三エリア」のように場所名に「・」が入るため、場所の区切りは「、」にする。
const LOCATION_SEPARATOR = '、';
const ORGANIZATION_FONT_SIZE = 30;
// 「本題〜副題〜」の形の企画名の、波線で挟まれた末尾の副題。
const SUBTITLE = /^(.+?)([〜～~][^〜～~]+[〜～~])$/;

// satori は text-box-trim に対応しないため、web のタグと同じ trim-both cap alphabetic を負のマージンで再現する。
// 値は Noto Sans JP のメトリクス（em 比。hhea の ascender・descender と OS/2 の capHeight）。
const FONT_ASCENT = 1.16;
const FONT_DESCENT = 0.288;
const FONT_CAP_HEIGHT = 0.733;
// 行の高さを 1em にしたときの、行の上端からベースラインまでの距離。
const BASELINE = (1 + FONT_ASCENT - FONT_DESCENT) / 2;

const textBoxTrim = (fontSize: number) => ({
  fontSize,
  lineHeight: 1,
  marginTop: -(BASELINE - FONT_CAP_HEIGHT) * fontSize,
  marginBottom: -(1 - BASELINE) * fontSize,
});
const LOGO_WIDTH = 228;

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
const fonts = input.fonts.map((font) => ({
  ...font,
  weight: 700 as const,
  style: 'normal' as const,
}));

const parser = loadDefaultJapaneseParser();
const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });

// satori は React の要素と同じ形のオブジェクトを受け取る。
const render = (
  element: SatoriElement,
  options: { width: number; height?: number },
) =>
  satori(element as unknown as Parameters<typeof satori>[0], {
    ...options,
    fonts,
  });

for (const task of input.tasks) {
  const texts = {
    title: await titleElement(task.name),
    // 場所は入るだけ並べ、入りきらなければ末尾に「…」を付けて、ほかにもあることを示す。
    location:
      task.locations.length > 0
        ? await fitLine(
            task.locations.map((_, i) => {
              const shown = task.locations.slice(0, task.locations.length - i);
              return `${shown.join(LOCATION_SEPARATOR)}${i > 0 ? '…' : ''}`;
            }),
            LOCATION_MAX_WIDTH,
            LOCATION_FONT_SIZE,
          )
        : '',
    organization: await fitLine(
      [task.organization],
      TITLE_WIDTH,
      ORGANIZATION_FONT_SIZE,
    ),
  };
  const svg = await render(layout(task, texts), {
    width: OGP_WIDTH,
    height: OGP_HEIGHT,
  });
  // 文字は satori がパスにしているため、resvg にシステムフォントを読ませない（読むと1枚に数秒かかる）。
  const png = new Resvg(svg, { font: { loadSystemFonts: false } })
    .render()
    .asPng();
  await writeFile(`${input.outDir}/${task.number}.png`, png);
}

/**
 * 企画名を BudouX の文節の切れ目で改行する。文節ごとに要素を分けて折り返す。
 * BudouX はカタカナ語の続く企画名などを1つの文節にするため、1行に入らない文節は単語の切れ目でさらに分ける。
 * 副題のある企画名は、本題と副題がそれぞれ1行に収まるなら副題を2行目に置く。
 * それでも TITLE_MAX_LINES 行に収まらない企画名は、文字単位で改行して末尾を「…」で切る。
 */
async function titleElement(name: string): Promise<SatoriElement> {
  const style = {
    fontSize: TITLE_FONT_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    color: input.colors.fgStrong,
  };
  // null の位置で改行する（幅いっぱいで高さのない要素を挟む）。
  const wrapped = (chunks: (string | null)[]) =>
    h(
      'div',
      { style: { ...style, display: 'flex', flexWrap: 'wrap' } },
      ...chunks.map((chunk) =>
        chunk === null
          ? h('div', { style: { width: '100%' } })
          : h('div', { style: { maxWidth: '100%' } }, chunk),
      ),
    );
  const toChunks = async (text: string) => {
    const chunks: string[] = [];
    for (const phrase of parser.parse(text)) {
      if ((await countTitleLines(wrapped([phrase]))) > 1) {
        chunks.push(...splitWords(phrase));
      } else {
        chunks.push(phrase);
      }
    }
    return keepSpaces(chunks);
  };

  const [, main = name, subtitle] = name.match(SUBTITLE) ?? [];
  const mainChunks = await toChunks(main);
  const subtitleChunks = subtitle ? await toChunks(subtitle) : [];
  if (
    subtitle &&
    (await countTitleLines(wrapped(mainChunks))) === 1 &&
    (await countTitleLines(wrapped(subtitleChunks))) === 1
  ) {
    return wrapped([...mainChunks, null, ...subtitleChunks]);
  }
  const title = wrapped([...mainChunks, ...subtitleChunks]);
  if ((await countTitleLines(title)) <= TITLE_MAX_LINES) return title;
  return h(
    'div',
    { style: { ...style, display: 'block', lineClamp: TITLE_MAX_LINES } },
    name,
  );
}

/** 幅 width で描いたときの行数。高さを指定せずに描くと、satori は中身の高さの SVG を返す。 */
async function countLines(
  element: SatoriElement,
  width: number,
  lineHeight: number,
): Promise<number> {
  const svg = await render(element, { width });
  const height = Number(svg.match(/height="([\d.]+)"/)?.[1]);
  return Math.round(height / lineHeight);
}

function countTitleLines(element: SatoriElement): Promise<number> {
  return countLines(element, TITLE_WIDTH, TITLE_FONT_SIZE * TITLE_LINE_HEIGHT);
}

/**
 * 候補のうち1行の幅に収まる最初のものを返す。どれも収まらなければ、最後の候補の末尾を「…」に置き換えて詰める。
 * satori の text-overflow: ellipsis は「…」の字形が欠けることがあるため、自前で詰める。
 */
async function fitLine(
  candidates: string[],
  width: number,
  fontSize: number,
): Promise<string> {
  const fits = async (candidate: string) =>
    (await countLines(
      h(
        'div',
        { style: { fontSize, lineHeight: 1, wordBreak: 'break-all' } },
        candidate,
      ),
      width,
      fontSize,
    )) <= 1;
  for (const candidate of candidates) {
    if (await fits(candidate)) return candidate;
  }
  const chars = [...(candidates.at(-1) ?? '')];
  while (chars.length > 0) {
    chars.pop();
    const candidate = `${chars.join('').trimEnd()}…`;
    if (await fits(candidate)) return candidate;
  }
  return '…';
}

/**
 * satori は要素の端の空白を詰めるため、要素の境目の空白をノーブレークスペースにして前の要素の末尾に付ける。
 * 行末に来ても見えないため、そこで改行されても困らない。
 */
function keepSpaces(chunks: string[]): string[] {
  const result: string[] = [];
  for (const chunk of chunks) {
    const last = result.length - 1;
    if (last >= 0 && /^\s/.test(chunk) && !result[last]?.endsWith('\u00a0')) {
      result[last] += '\u00a0';
    }
    result.push(/\s$/.test(chunk) ? `${chunk.trim()}\u00a0` : chunk.trim());
  }
  return result;
}

/** 文節を単語に分ける。記号や空白は前の単語に付け、行頭に来ないようにする。 */
function splitWords(phrase: string): string[] {
  const words: string[] = [];
  for (const { segment, isWordLike } of segmenter.segment(phrase)) {
    const last = words.length - 1;
    if (!isWordLike && last >= 0) words[last] += segment;
    else words.push(segment);
  }
  return words;
}

function layout(
  task: OgpTask,
  texts: { title: SatoriElement; location: string; organization: string },
): SatoriElement {
  const { colors } = input;
  const color = colors.category[task.category];
  const nowrap = { whiteSpace: 'nowrap' };
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
          top: 120,
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
            gap: DOT_GAP,
            height: TAG_HEIGHT,
            paddingLeft: DOT_LEFT,
            paddingRight: 16,
            borderRadius: 9999,
            backgroundColor: color.bg,
            color: colors.fg,
          },
        },
        h('div', {
          style: {
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: 9999,
            backgroundColor: color.dot,
          },
        }),
        h('div', { style: textBoxTrim(TAG_FONT_SIZE) }, task.category),
      ),
      texts.location
        ? h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: PIN_GAP,
                fontSize: LOCATION_FONT_SIZE,
                color: colors.fgStrong,
              },
            },
            h('img', { src: input.pin, width: PIN_SIZE, height: PIN_SIZE }),
            h('div', { style: nowrap }, texts.location),
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
          width: TITLE_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        },
      },
      texts.title,
      h(
        'div',
        {
          style: {
            fontSize: ORGANIZATION_FONT_SIZE,
            color: colors.fgMuted,
            ...nowrap,
          },
        },
        texts.organization,
      ),
    ),
    h('img', {
      src: input.logo,
      width: LOGO_WIDTH,
      height: Math.round(LOGO_WIDTH * input.logoAspectRatio),
      style: { position: 'absolute', left: 64, top: 528 },
    }),
  );
}
