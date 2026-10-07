import type { ShopCategory } from 'api';
import type {
  ExpressionSpecification,
  FilterSpecification,
  Map as MlMap,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import { token } from '../../../../styled-system/tokens';
import type { CampusData } from './campusData';

// MapLibre は CSS 変数を解釈できないため、16進の値を持つトークンだけを使う。
export const ACCENT = token('colors.brand.500');
const ACCENT_TEXT = token('colors.accent.text');
const TEXT = token('colors.fg.strong');
export const CATEGORY_COLORS: Record<ShopCategory, string> = {
  食品: token('colors.category.food'),
  物販: token('colors.category.goods'),
  展示: token('colors.category.exhibit'),
  学術: token('colors.category.academic'),
  ステージ: token('colors.category.stage'),
  その他: token('colors.category.other'),
};

const FONT = ['Arial Unicode MS Regular'];
// これより引くとエリア名、寄ると建物名・テント列を出す。
const AREA_MAX_ZOOM = 16.2;
const DETAIL_ZOOM = 17.4;
// これより寄ると、建物名の下に中の企画名を並べる。
const PREVIEW_ZOOM = 18.2;
// テントは実寸（数メートル）で描くため、形が見分けられる程度に寄ってからテント列のピンと切り替える。
const BOOTH_ZOOM = 18;
const BOOTH_NAME_ZOOM = 18.3;

/** データの種類ごとの地図ソース id。 */
export const SOURCES = {
  areas: 'campus-areas',
  buildings: 'campus-buildings',
  places: 'campus-places',
  booths: 'campus-booths',
  boothShapes: 'campus-booth-shapes',
} as const satisfies Record<keyof CampusData, string>;

const textPaint = {
  'text-color': TEXT,
  'text-halo-color': '#ffffff',
  'text-halo-width': 1.6,
};

const kindIs = (kind: string): FilterSpecification => [
  '==',
  ['get', 'kind'],
  kind,
];

const nameWithCount: ExpressionSpecification = [
  'format',
  ['get', 'name'],
  {},
  '\n',
  {},
  ['get', 'countLabel'],
  { 'font-scale': 0.8, 'text-color': ACCENT_TEXT },
];

type LabelStep = { minzoom: number; text: ExpressionSpecification };

// 建物名はピンの下に置き、寄るほど企画数・中の企画名を足していく。
const BUILDING_LABEL = 'campus-building-label';
const BUILDING_LABEL_STEPS: LabelStep[] = [
  { minzoom: AREA_MAX_ZOOM, text: ['get', 'name'] },
  { minzoom: DETAIL_ZOOM, text: nameWithCount },
  {
    minzoom: PREVIEW_ZOOM,
    text: [
      ...nameWithCount,
      '\n',
      {},
      ['get', 'preview'],
      { 'font-scale': 0.78 },
    ] as ExpressionSpecification,
  },
];
const STAGE_LABEL = 'campus-stage-label';
const STAGE_LABEL_STEPS: LabelStep[] = [
  { minzoom: AREA_MAX_ZOOM, text: ['get', 'name'] },
  { minzoom: DETAIL_ZOOM, text: nameWithCount },
];

/** 段階ごとのラベルのレイヤ id（1段目が `id`、以降が `id-1`, `id-2`…）。 */
const steppedLabelIds = (id: string, steps: LabelStep[]) =>
  steps.map((_, i) => (i === 0 ? id : `${id}-${i}`));

/** タップで企画詳細・場所ページを開く地図レイヤ。 */
export const INTERACTIVE_LAYERS = [
  'campus-booth-fill',
  'campus-building-pin',
  'campus-outdoor-pin',
  'campus-stage-pin',
  ...steppedLabelIds(BUILDING_LABEL, BUILDING_LABEL_STEPS),
  'campus-building-fill',
];

/**
 * ズームの段階ごとに文言の違うラベルを、段階ごとのレイヤとして追加する。
 * text-field の zoom 式はデータのタイルの整数ズームで評価され、小数の境目で切り替わらないため、
 * 段階をレイヤのズーム範囲（カメラのズームどおりに効く）で分ける。
 */
function addSteppedLabel(
  map: MlMap,
  id: string,
  filter: FilterSpecification,
  layout: SymbolLayerSpecification['layout'],
  steps: LabelStep[],
) {
  const ids = steppedLabelIds(id, steps);
  steps.forEach((step, i) => {
    map.addLayer({
      id: ids[i],
      type: 'symbol',
      source: SOURCES.places,
      filter,
      minzoom: step.minzoom,
      ...(steps[i + 1] && { maxzoom: steps[i + 1].minzoom }),
      layout: { ...layout, 'text-field': step.text },
      paint: textPaint,
    });
  });
}

/** 白抜きの数字（ピンの中の企画数）。 */
const countLayout: SymbolLayerSpecification['layout'] = {
  'text-field': ['to-string', ['get', 'count']],
  'text-font': FONT,
  'text-size': 11,
  'text-allow-overlap': true,
  'text-ignore-placement': true,
};

/** 会場の情報を描くソースとレイヤを地図に追加する（中身は空。データは後から流す）。 */
export function addCampusLayers(map: MlMap) {
  for (const id of Object.values(SOURCES)) {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  map.addLayer({
    id: 'campus-building-fill',
    type: 'fill',
    source: SOURCES.buildings,
    filter: ['>', ['get', 'count'], 0],
    // タップ判定用。見た目は地図スタイル側の建物の塗りに任せる。
    paint: { 'fill-color': ACCENT, 'fill-opacity': 0 },
  });
  map.addLayer({
    id: 'campus-building-selected',
    type: 'fill',
    source: SOURCES.buildings,
    filter: ['in', ['get', 'placeId'], ['literal', []]],
    paint: { 'fill-color': ACCENT, 'fill-opacity': 0.35 },
  });
  map.addLayer({
    id: 'campus-building-selected-line',
    type: 'line',
    source: SOURCES.buildings,
    filter: ['in', ['get', 'placeId'], ['literal', []]],
    paint: { 'line-color': ACCENT_TEXT, 'line-width': 2.5 },
  });

  map.addLayer({
    id: 'campus-area-label',
    type: 'symbol',
    source: SOURCES.areas,
    maxzoom: AREA_MAX_ZOOM,
    layout: {
      'text-field': [
        'format',
        ['get', 'name'],
        { 'font-scale': 1 },
        '\n',
        {},
        ['get', 'countLabel'],
        { 'font-scale': 0.78 },
      ],
      'text-font': FONT,
      'text-size': 15,
      'text-line-height': 1.3,
    },
    paint: { ...textPaint, 'text-color': ACCENT_TEXT, 'text-halo-width': 2 },
  });

  const buildingWithShops: FilterSpecification = [
    'all',
    ['==', ['get', 'kind'], 'building'],
    ['>', ['get', 'count'], 0],
  ];
  map.addLayer({
    id: 'campus-building-pin',
    type: 'circle',
    source: SOURCES.places,
    filter: buildingWithShops,
    minzoom: AREA_MAX_ZOOM,
    paint: {
      'circle-color': ACCENT_TEXT,
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        AREA_MAX_ZOOM,
        8,
        18,
        12,
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: 'campus-building-count',
    type: 'symbol',
    source: SOURCES.places,
    filter: buildingWithShops,
    minzoom: AREA_MAX_ZOOM,
    layout: countLayout,
    paint: { 'text-color': '#ffffff' },
  });
  addSteppedLabel(
    map,
    BUILDING_LABEL,
    kindIs('building'),
    {
      'text-font': FONT,
      'text-size': 13,
      'text-line-height': 1.25,
      'text-anchor': 'top',
      'text-offset': [0, 1.1],
      'text-max-width': 14,
      // 重なったときは企画の多い建物の名前を残す。
      'symbol-sort-key': ['-', ['get', 'count']],
    },
    BUILDING_LABEL_STEPS,
  );

  map.addLayer({
    id: 'campus-stage-pin',
    type: 'circle',
    source: SOURCES.places,
    filter: kindIs('stage'),
    minzoom: 15.4,
    paint: {
      'circle-color': CATEGORY_COLORS.ステージ,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.4, 5, 18, 9],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
  addSteppedLabel(
    map,
    STAGE_LABEL,
    kindIs('stage'),
    {
      'text-font': FONT,
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 0.9],
    },
    STAGE_LABEL_STEPS,
  );

  // 引いているときはテント列ごとのピン、寄るとテントそのものに切り替える。
  map.addLayer({
    id: 'campus-outdoor-pin',
    type: 'circle',
    source: SOURCES.places,
    filter: kindIs('outdoor'),
    minzoom: 15.6,
    maxzoom: BOOTH_ZOOM,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.6, 4, 17, 10],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: 'campus-outdoor-count',
    type: 'symbol',
    source: SOURCES.places,
    filter: kindIs('outdoor'),
    minzoom: 16.6,
    maxzoom: BOOTH_ZOOM,
    layout: countLayout,
    paint: { 'text-color': '#ffffff' },
  });
  map.addLayer({
    id: 'campus-selected-ring',
    type: 'circle',
    source: SOURCES.places,
    filter: ['in', ['get', 'placeId'], ['literal', []]],
    maxzoom: BOOTH_ZOOM,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.6, 9, 17, 16],
      'circle-color': ACCENT,
      'circle-opacity': 0.25,
      'circle-stroke-color': ACCENT_TEXT,
      'circle-stroke-width': 2.5,
    },
  });

  map.addLayer({
    id: 'campus-booth-fill',
    type: 'fill',
    source: SOURCES.boothShapes,
    minzoom: BOOTH_ZOOM,
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.85 },
  });
  map.addLayer({
    id: 'campus-booth-outline',
    type: 'line',
    source: SOURCES.boothShapes,
    minzoom: BOOTH_ZOOM,
    paint: { 'line-color': '#ffffff', 'line-width': 1.2 },
  });
  map.addLayer({
    id: 'campus-booth-selected',
    type: 'line',
    source: SOURCES.boothShapes,
    filter: ['in', ['get', 'booth'], ['literal', []]],
    minzoom: BOOTH_ZOOM,
    paint: { 'line-color': ACCENT_TEXT, 'line-width': 3 },
  });
  map.addLayer({
    id: 'campus-booth-label',
    type: 'symbol',
    source: SOURCES.booths,
    minzoom: BOOTH_NAME_ZOOM,
    layout: {
      // ブース番号は配置用の内部的な番号なので出さず、企画名だけを添える。
      'text-field': ['get', 'label'],
      'text-font': FONT,
      'text-size': 11,
      'text-anchor': 'left',
      'text-offset': [0.8, 0],
      'text-max-width': 12,
    },
    paint: textPaint,
  });
}

/** 強調する場所とブース。 */
export type Selection = { placeIds: string[]; booths: string[] };

/** 強調表示のレイヤを、選択中の場所・ブースに合わせる。 */
export function applySelection(map: MlMap, { placeIds, booths }: Selection) {
  const inPlaces: FilterSpecification = [
    'in',
    ['get', 'placeId'],
    ['literal', placeIds],
  ];
  map.setFilter('campus-building-selected', inPlaces);
  map.setFilter('campus-building-selected-line', inPlaces);
  map.setFilter('campus-selected-ring', [
    'all',
    inPlaces,
    ['!=', ['get', 'kind'], 'building'],
  ]);
  // 企画詳細ではそのブース、テント列のページでは列のブースすべてを強調する。
  map.setFilter(
    'campus-booth-selected',
    booths.length > 0
      ? ['in', ['get', 'booth'], ['literal', booths]]
      : inPlaces,
  );
}
