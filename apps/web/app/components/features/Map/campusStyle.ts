import type { ProjectCategory } from 'api';
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
export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  食品: token('colors.category.food'),
  物販: token('colors.category.goods'),
  展示: token('colors.category.exhibit'),
  学術: token('colors.category.academic'),
  ステージ: token('colors.category.stage'),
  その他: token('colors.category.other'),
};

const FONT = ['Arial Unicode MS Regular'];
// これより引くとエリア名、寄ると建物名・テント列を出す。
export const AREA_MAX_ZOOM = 16.2;
const DETAIL_ZOOM = 17.4;
// これより寄ると、建物名の下に中の企画名を並べる。
const PREVIEW_ZOOM = 18.2;
// テントは実寸（数メートル）で描くため、引いているときは画面上で大きさの変わらない点で出し、
// 形が見分けられるところまで寄ったら、点を消しながらテントの形を浮かび上がらせる。
const BOOTH_DOT_ZOOM = AREA_MAX_ZOOM;
const BOOTH_FADE_ZOOM = 17.6;
const BOOTH_ZOOM = 18;
const BOOTH_DOT_RADIUS = 4.5;
const BOOTH_NAME_ZOOM = 18.3;

// 階数から高さ(m)にする係数。大学の建物は1フロアが高めなので一般的な 3m より大きく取る。
const FLOOR_HEIGHT = 4;
const BOOTH_HEIGHT = 2.5;
const SELECTED_BOOTH_HEIGHT = 3.5;
// 地図スタイルの sohosai-buildings（平面の建物の塗り）と揃える。
const CAMPUS_BUILDING_COLOR = '#97bbdc';
const BASEMAP_BUILDING_COLOR = '#d9d9d2';
const BASEMAP_3D_OPACITY = 0.6;

/** 3D 表示（地図を傾けたとき）だけ出す立体のレイヤ。 */
const EXTRUSION_LAYERS = {
  'basemap-building-3d': BASEMAP_3D_OPACITY,
  'campus-building-3d': 1,
  'campus-booth-3d': 1,
} as const;
/** 3D 表示では立体の色で強調・タップ判定するため隠す平面のレイヤ。 */
const FLAT_LAYERS = [
  'campus-building-fill',
  'campus-building-selected',
  'campus-building-selected-line',
  'campus-booth-fill',
  'campus-booth-outline',
  'campus-booth-selected',
];

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

/** タップで企画詳細・場所ページを開く、またはエリアへ寄る地図レイヤ。 */
export const INTERACTIVE_LAYERS = [
  'campus-booth-fill',
  'campus-booth-3d',
  'campus-booth-dot',
  'campus-building-pin',
  'campus-stage-pin',
  ...steppedLabelIds(BUILDING_LABEL, BUILDING_LABEL_STEPS),
  'campus-area-label',
  'campus-building-fill',
  'campus-building-3d',
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

const buildingColor = (placeIds: string[]): ExpressionSpecification => [
  'case',
  ['in', ['get', 'placeId'], ['literal', placeIds]],
  ACCENT,
  CAMPUS_BUILDING_COLOR,
];

/**
 * 建物とテントの立体を追加する（はじめは非表示）。
 * 道路などの平面のレイヤより後に描かないと立体の上に道路が重なるため、地図スタイルの最初の文字レイヤの前に差し込む。
 */
function addExtrusionLayers(map: MlMap, basemapBuildingIds: number[]) {
  const beforeId = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  const hidden = { visibility: 'none' } as const;

  map.addLayer(
    {
      id: 'basemap-building-3d',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 15,
      // タイルの建物の id は OSM の way id。
      filter: ['in', ['id'], ['literal', basemapBuildingIds]],
      layout: hidden,
      paint: {
        'fill-extrusion-color': BASEMAP_BUILDING_COLOR,
        'fill-extrusion-height': ['get', 'render_height'],
        'fill-extrusion-base': ['get', 'render_min_height'],
        'fill-extrusion-opacity': 0,
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: 'campus-building-3d',
      type: 'fill-extrusion',
      source: SOURCES.buildings,
      layout: hidden,
      paint: {
        'fill-extrusion-color': buildingColor([]),
        'fill-extrusion-height': ['*', ['get', 'levels'], FLOOR_HEIGHT],
        'fill-extrusion-opacity': 0,
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: 'campus-booth-3d',
      type: 'fill-extrusion',
      source: SOURCES.boothShapes,
      minzoom: BOOTH_FADE_ZOOM,
      layout: hidden,
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-height': BOOTH_HEIGHT,
        'fill-extrusion-opacity': 0,
      },
    },
    beforeId,
  );
}

/** 立体の表示/非表示を切り替え、平面の建物・テントはその逆にする。 */
export function setExtrusionVisible(map: MlMap, visible: boolean) {
  for (const [id, opacity] of Object.entries(EXTRUSION_LAYERS)) {
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    // 非表示の間に 0 へ戻しておき、表示したときに transition でふわっと出す。
    map.setPaintProperty(id, 'fill-extrusion-opacity', visible ? opacity : 0);
  }
  for (const id of FLAT_LAYERS) {
    map.setLayoutProperty(id, 'visibility', visible ? 'none' : 'visible');
  }
}

/**
 * 会場の情報を描くソースとレイヤを地図に追加する（中身は空。データは後から流す）。
 * basemapBuildingIds は地図タイルの建物のうち 3D 表示で立体にするものの id。
 */
export function addCampusLayers(map: MlMap, basemapBuildingIds: number[]) {
  for (const id of Object.values(SOURCES)) {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  addExtrusionLayers(map, basemapBuildingIds);

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

  const buildingWithProjects: FilterSpecification = [
    'all',
    ['==', ['get', 'kind'], 'building'],
    ['>', ['get', 'count'], 0],
  ];
  map.addLayer({
    id: 'campus-building-pin',
    type: 'circle',
    source: SOURCES.places,
    filter: buildingWithProjects,
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
    filter: buildingWithProjects,
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

  map.addLayer({
    id: 'campus-selected-ring',
    type: 'circle',
    source: SOURCES.places,
    filter: ['in', ['get', 'placeId'], ['literal', []]],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.6, 9, 17, 16],
      'circle-color': ACCENT,
      'circle-opacity': 0.25,
      'circle-stroke-color': ACCENT_TEXT,
      'circle-stroke-width': 2.5,
    },
  });

  // 点からテントの形へ、BOOTH_FADE_ZOOM〜BOOTH_ZOOM の間で入れ替える。
  const fadeIn = (to: number): ExpressionSpecification => [
    'interpolate',
    ['linear'],
    ['zoom'],
    BOOTH_FADE_ZOOM,
    0,
    BOOTH_ZOOM,
    to,
  ];
  const fadeOut: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['zoom'],
    BOOTH_FADE_ZOOM,
    1,
    BOOTH_ZOOM,
    0,
  ];

  map.addLayer({
    id: 'campus-booth-dot',
    type: 'circle',
    source: SOURCES.booths,
    minzoom: BOOTH_DOT_ZOOM,
    maxzoom: BOOTH_ZOOM,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': BOOTH_DOT_RADIUS,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
      'circle-opacity': fadeOut,
      'circle-stroke-opacity': fadeOut,
    },
  });
  map.addLayer({
    id: 'campus-booth-dot-selected',
    type: 'circle',
    source: SOURCES.booths,
    filter: ['in', ['get', 'booth'], ['literal', []]],
    minzoom: BOOTH_DOT_ZOOM,
    maxzoom: BOOTH_ZOOM,
    paint: {
      'circle-color': 'transparent',
      'circle-radius': BOOTH_DOT_RADIUS + 3,
      'circle-stroke-color': ACCENT_TEXT,
      'circle-stroke-width': 2.5,
      'circle-stroke-opacity': fadeOut,
    },
  });

  map.addLayer({
    id: 'campus-booth-fill',
    type: 'fill',
    source: SOURCES.boothShapes,
    minzoom: BOOTH_FADE_ZOOM,
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': fadeIn(0.85) },
  });
  map.addLayer({
    id: 'campus-booth-outline',
    type: 'line',
    source: SOURCES.boothShapes,
    minzoom: BOOTH_FADE_ZOOM,
    paint: {
      'line-color': '#ffffff',
      'line-width': 1.2,
      'line-opacity': fadeIn(1),
    },
  });
  map.addLayer({
    id: 'campus-booth-selected',
    type: 'line',
    source: SOURCES.boothShapes,
    filter: ['in', ['get', 'booth'], ['literal', []]],
    minzoom: BOOTH_FADE_ZOOM,
    paint: {
      'line-color': ACCENT_TEXT,
      'line-width': 3,
      'line-opacity': fadeIn(1),
    },
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
  const inPlaces: ExpressionSpecification = [
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
  const selectedBooth: ExpressionSpecification =
    booths.length > 0
      ? ['in', ['get', 'booth'], ['literal', booths]]
      : inPlaces;
  map.setFilter('campus-booth-selected', selectedBooth);
  map.setFilter('campus-booth-dot-selected', selectedBooth);

  // 3D では地面の強調が立体に埋もれるため、立体そのものの色・高さで強調する。
  map.setPaintProperty(
    'campus-building-3d',
    'fill-extrusion-color',
    buildingColor(placeIds),
  );
  map.setPaintProperty('campus-booth-3d', 'fill-extrusion-color', [
    'case',
    selectedBooth,
    ACCENT_TEXT,
    ['get', 'color'],
  ]);
  map.setPaintProperty('campus-booth-3d', 'fill-extrusion-height', [
    'case',
    selectedBooth,
    SELECTED_BOOTH_HEIGHT,
    BOOTH_HEIGHT,
  ]);
}
