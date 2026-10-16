import type { ProjectCategory } from 'api';
import type {
  ExpressionSpecification,
  FillExtrusionLayerSpecification,
  FilterSpecification,
  Map as MlMap,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type { CampusData } from './campusData';

// MapLibre は CSS 変数を解釈できないため、16進の値を持つトークンだけを使う。
export const ACCENT = '#4a93d7'; // token('colors.brand.500')
const ACCENT_TEXT = '#2f6fb0'; // token('colors.brand.700')
const TEXT = '#1f2834'; // token('colors.fg.strong')
const WHITE = '#ffffff'; // token('colors.white')
export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  食事: '#f9c310', // token('colors.category.meal')
  スイーツ: '#f28c4b', // token('colors.category.sweets')
  ドリンク: '#a47551', // token('colors.category.drink')
  物品販売: '#ec659f', // token('colors.category.goods')
  展示型: '#39c684', // token('colors.category.exhibit')
  参加型: '#8fb339', // token('colors.category.handsOn')
  学術: '#9679ec', // token('colors.category.academic')
  パフォーマンス: '#3aaddf', // token('colors.category.performance')
  音楽: '#5a6ee0', // token('colors.category.music')
  委員会企画: '#3f5a8a', // token('colors.category.committee')
  その他: '#8d9bb0', // token('colors.category.other')
};

const FONT = ['Arial Unicode MS Regular'];
// これより引くとエリア名、寄ると建物名・テント列を出す。
export const AREA_MAX_ZOOM = 15.8;
export const DETAIL_ZOOM = 17.4;
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
const BOOTH_HEIGHT = 2;
// 地図スタイルの sohosai-buildings（平面の建物の塗り）と揃える。
const CAMPUS_BUILDING_COLOR = '#97bbdc'; // token('colors.map.campusBuilding')
// テントが見えるところまで寄ったら、軒下や建物の奥のテントが隠れないよう、どの建物も同じだけ透かす。
const TENT_VIEW_BUILDING_OPACITY = 0.45;
export const INFORMATION_COLOR = '#e8642c'; // token('colors.map.information')
const TRASH_COLOR = '#5f9a3c'; // token('colors.map.trash')

/** 3D 表示（地図を傾けたとき）だけ出す立体のレイヤと、その不透明度。 */
const EXTRUSION_LAYERS: Record<string, number | ExpressionSpecification> = {
  'campus-booth-3d': 1,
  // テントの点が形に入れ替わる間に透かしていく。
  'campus-building-3d': [
    'interpolate',
    ['linear'],
    ['zoom'],
    BOOTH_FADE_ZOOM,
    1,
    BOOTH_ZOOM,
    TENT_VIEW_BUILDING_OPACITY,
  ],
};
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
  'text-halo-color': WHITE,
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
function addExtrusionLayers(map: MlMap) {
  const beforeId = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  const add = (
    layer: Omit<FillExtrusionLayerSpecification, 'type' | 'layout'>,
  ) =>
    map.addLayer(
      {
        ...layer,
        type: 'fill-extrusion',
        layout: { visibility: 'none' },
        paint: { ...layer.paint, 'fill-extrusion-opacity': 0 },
      },
      beforeId,
    );

  // 半透明の立体は奥行きを書き込んでから色を塗るため、後から描いた立体はその内側に隠れる。
  // 建物の下や奥のテントを透かして見せるには、テントを建物より先に描く。
  add({
    id: 'campus-booth-3d',
    source: SOURCES.boothShapes,
    minzoom: BOOTH_FADE_ZOOM,
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-height': BOOTH_HEIGHT,
    },
  });
  add({
    id: 'campus-building-3d',
    source: SOURCES.buildings,
    paint: {
      'fill-extrusion-color': buildingColor([]),
      'fill-extrusion-height': ['*', ['get', 'levels'], FLOOR_HEIGHT],
    },
  });
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

const ICON_SIZE = 20;
const ICON_PIXEL_RATIO = 2;

/** 色の丸に白い記号（`symbol` が 20px 四方に描く）を載せた、案内所・ゴミ箱のアイコン。 */
function facilityIcon(
  color: string,
  symbol: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ICON_SIZE * ICON_PIXEL_RATIO;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(ICON_PIXEL_RATIO, ICON_PIXEL_RATIO);
  ctx.beginPath();
  ctx.arc(10, 10, 8.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = WHITE;
  ctx.stroke();
  ctx.fillStyle = WHITE;
  symbol(ctx);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

const FACILITY_ICONS = {
  information: () =>
    facilityIcon(INFORMATION_COLOR, (ctx) => {
      ctx.beginPath();
      ctx.arc(10, 5.9, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(8.6, 8.4, 2.8, 6.8);
    }),
  trash: () =>
    facilityIcon(TRASH_COLOR, (ctx) => {
      ctx.fillRect(8.5, 4.6, 3, 1.4);
      ctx.fillRect(5.4, 5.8, 9.2, 1.5);
      ctx.beginPath();
      ctx.moveTo(6.3, 8);
      ctx.lineTo(13.7, 8);
      ctx.lineTo(13, 15.4);
      ctx.lineTo(7, 15.4);
      ctx.fill();
    }),
};

/** 会場の情報を描くソースとレイヤを地図に追加する（中身は空。データは後から流す）。 */
export function addCampusLayers(map: MlMap) {
  for (const id of Object.values(SOURCES)) {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  addExtrusionLayers(map);

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
      // 「第二・第三エリア」を途中で折り返さない。
      'text-max-width': 12,
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
      'circle-stroke-color': WHITE,
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
    paint: { 'text-color': WHITE },
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
      'circle-color': CATEGORY_COLORS.パフォーマンス,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.4, 5, 18, 9],
      'circle-stroke-color': WHITE,
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
      'circle-stroke-color': WHITE,
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
      'line-color': WHITE,
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
  // 案内所はエリア全体から目印になるよう引いた段階から、ゴミ箱は数が多いため寄ってから出す。
  // 案内所はテントの形が見えるところまで寄ったら、アイコンを消してテントと名前だけにする。
  for (const [kind, minzoom] of [
    ['information', AREA_MAX_ZOOM],
    ['trash', DETAIL_ZOOM],
  ] as const) {
    const icon = `campus-${kind}`;
    if (!map.hasImage(icon)) {
      map.addImage(icon, FACILITY_ICONS[kind](), {
        pixelRatio: ICON_PIXEL_RATIO,
      });
    }
    map.addLayer({
      id: icon,
      type: 'symbol',
      source: SOURCES.places,
      filter: kindIs(kind),
      minzoom,
      layout: {
        'icon-image': icon,
        // アイコンは常に出し、重なったときは名前だけを省く。
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-optional': true,
        'text-field': ['get', 'name'],
        'text-font': FONT,
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 1],
        'text-max-width': 10,
      },
      paint: {
        ...textPaint,
        ...(kind === 'information' && { 'icon-opacity': fadeOut }),
      },
    });
  }

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

/**
 * 種類が `kind` の場所（ゴミ箱など）だけを強調する。そのアイコンをどのズームでも少し大きく出し、
 * ほかのピン・点・ラベルは隠す。建物とテントの形は位置の手がかりとして残す。
 */
export function highlightPlaceKind(map: MlMap, kind: 'information' | 'trash') {
  const target = `campus-${kind}`;
  for (const { id, type } of map.getStyle().layers) {
    if (!id.startsWith('campus-') || id === target) continue;
    if (type === 'symbol' || type === 'circle') {
      map.setLayoutProperty(id, 'visibility', 'none');
    }
  }
  map.setLayerZoomRange(target, 0, 24);
  map.setLayoutProperty(target, 'icon-size', 1.3);
  map.setLayoutProperty(target, 'text-offset', [0, 1.3]);
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

  // 3D では地面の強調が立体に埋もれるため、立体そのものの色で強調する。
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
}
