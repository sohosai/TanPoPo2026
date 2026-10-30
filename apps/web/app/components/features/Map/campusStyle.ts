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
// 形が見分けられる BOOTH_ZOOM まで寄ったら、点からテントの形へフェードで入れ替える。
// 入れ替えはズームに比例させず時間で進める。比例させると、途中でズームを止めたときに半透明のまま残る。
const BOOTH_DOT_ZOOM = AREA_MAX_ZOOM;
const BOOTH_ZOOM = 17.8;
// 点と形のレイヤを BOOTH_ZOOM の前後で重ねて出しておき、入れ替えのフェードが途中で切れないようにする。
const BOOTH_LAYER_MARGIN = 0.2;
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
const PARKING_COLOR = '#2b62b0'; // token('colors.map.parking')
const BICYCLE_PARKING_COLOR = '#7b55a8'; // token('colors.map.bicycleParking')

/** 3D 表示（地図を傾けたとき）だけ出す立体のレイヤと、テントを形で出しているかに応じた不透明度。 */
const EXTRUSION_LAYERS: Record<string, (tentView: boolean) => number> = {
  'campus-booth-3d': () => 1,
  'campus-building-3d': (tentView) =>
    tentView ? TENT_VIEW_BUILDING_OPACITY : 1,
};

/** テントを点で出すときと形で出すときの、各レイヤの不透明度。 */
const BOOTH_VIEW_PAINT: [
  layer: string,
  property: string,
  dot: number,
  tent: number,
][] = [
  ['campus-booth-dot', 'circle-opacity', 1, 0],
  ['campus-booth-dot', 'circle-stroke-opacity', 1, 0],
  ['campus-booth-dot-selected', 'circle-stroke-opacity', 1, 0],
  ['campus-booth-fill', 'fill-opacity', 0, 0.85],
  ['campus-booth-outline', 'line-opacity', 0, 1],
  ['campus-booth-selected', 'line-opacity', 0, 1],
  // 案内所はテントの形が見えたら、アイコンを消してテントと名前だけにする。
  ['campus-information', 'icon-opacity', 1, 0],
];
/** 3D 表示では立体の色で強調・タップ判定するため隠す平面のレイヤ。 */
const FLAT_LAYERS = [
  'campus-building-fill',
  'campus-building-selected',
  'campus-building-selected-line',
  'campus-booth-fill',
  'campus-booth-outline',
  'campus-booth-selected',
];

/** 地図スタイル側の平面の建物の塗り（道路より下に描くためスタイル JSON に置いている）のソース。 */
export const BUILDING_FLAT_SOURCE = 'sohosai-buildings-fill';

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
    minzoom: BOOTH_ZOOM - BOOTH_LAYER_MARGIN,
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

/** テントを点ではなく形で出すところまで寄っているか。 */
export function isTentView(map: MlMap): boolean {
  return map.getZoom() >= BOOTH_ZOOM;
}

/** テントを点で出すか形で出すかを切り替える。不透明度を変えるだけなので、transition でフェードする。 */
export function setTentView(map: MlMap, tentView: boolean) {
  for (const [id, property, dot, tent] of BOOTH_VIEW_PAINT) {
    if (map.getLayer(id))
      map.setPaintProperty(id, property, tentView ? tent : dot);
  }
  for (const [id, opacity] of Object.entries(EXTRUSION_LAYERS)) {
    if (map.getLayoutProperty(id, 'visibility') === 'visible') {
      map.setPaintProperty(id, 'fill-extrusion-opacity', opacity(tentView));
    }
  }
}

/** 立体の表示/非表示を切り替え、平面の建物・テントはその逆にする。 */
export function setExtrusionVisible(map: MlMap, visible: boolean) {
  for (const [id, opacity] of Object.entries(EXTRUSION_LAYERS)) {
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    // 非表示の間に 0 へ戻しておき、表示したときに transition でふわっと出す。
    map.setPaintProperty(
      id,
      'fill-extrusion-opacity',
      visible ? opacity(isTentView(map)) : 0,
    );
  }
  for (const id of FLAT_LAYERS) {
    map.setLayoutProperty(id, 'visibility', visible ? 'none' : 'visible');
  }
}

const ICON_SIZE = 20;
const ICON_PIXEL_RATIO = 2;

/** 色の丸に白い記号（`symbol` が 20px 四方に描く）を載せた、案内所・ごみ箱のアイコン。 */
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
  parking: () =>
    facilityIcon(PARKING_COLOR, (ctx) => {
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 10, 10.6);
    }),
  bicycle_parking: () =>
    facilityIcon(BICYCLE_PARKING_COLOR, (ctx) => {
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      for (const x of [6.4, 13.6]) {
        ctx.beginPath();
        ctx.arc(x, 12, 2.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 後輪・ペダル・前輪をつなぐフレームとハンドル。
      ctx.beginPath();
      ctx.moveTo(6.4, 12);
      ctx.lineTo(9.6, 12);
      ctx.lineTo(12.4, 8);
      ctx.lineTo(13.6, 12);
      ctx.moveTo(6.4, 12);
      ctx.lineTo(8.4, 8);
      ctx.lineTo(12.4, 8);
      ctx.moveTo(11.6, 6.4);
      ctx.lineTo(13.2, 6.4);
      ctx.stroke();
    }),
};

// 案内所・駐車場はエリア全体から目印になるよう引いた段階から、ごみ箱・駐輪場は数が多いため寄ってから出す。
const FACILITY_LAYERS = [
  ['information', AREA_MAX_ZOOM],
  ['parking', AREA_MAX_ZOOM],
  ['bicycle_parking', DETAIL_ZOOM],
  ['trash', DETAIL_ZOOM],
] as const;

/** 強調できる施設の種類。 */
export type FacilityKind = (typeof FACILITY_LAYERS)[number][0];

/** 会場の情報を描くソースとレイヤを地図に追加する（中身は空。データは後から流す）。 */
// 下地の地図タイルの建物のうち、会場の区画に重なって紛らわしいもの（モニュメント・イルミネーションの区画の下）。
// タイルの地物 ID で指定しているため、地図タイルが更新されて ID が変わると再び描かれる。
const HIDDEN_BASE_BUILDING_IDS = [14931146];

export function addCampusLayers(map: MlMap) {
  for (const id of ['building', 'building-top']) {
    if (!map.getLayer(id)) continue;
    map.setFilter(id, [
      '!',
      ['in', ['id'], ['literal', HIDDEN_BASE_BUILDING_IDS]],
    ]);
  }
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

  // places ソースの屋外の場所は、テントの形を持たないもの（池・グラウンドなど）だけで、建物と同じくピンで示す。
  const pinned: FilterSpecification = [
    'in',
    ['get', 'kind'],
    ['literal', ['building', 'outdoor']],
  ];
  const pinnedWithProjects: FilterSpecification = [
    'all',
    pinned,
    ['>', ['get', 'count'], 0],
  ];
  map.addLayer({
    id: 'campus-building-pin',
    type: 'circle',
    source: SOURCES.places,
    filter: pinnedWithProjects,
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
    filter: pinnedWithProjects,
    minzoom: AREA_MAX_ZOOM,
    layout: countLayout,
    paint: { 'text-color': WHITE },
  });
  addSteppedLabel(
    map,
    BUILDING_LABEL,
    pinned,
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

  // 点とテントの形の不透明度は setTentView で決める。
  map.addLayer({
    id: 'campus-booth-dot',
    type: 'circle',
    source: SOURCES.booths,
    minzoom: BOOTH_DOT_ZOOM,
    maxzoom: BOOTH_ZOOM + BOOTH_LAYER_MARGIN,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': BOOTH_DOT_RADIUS,
      'circle-stroke-color': WHITE,
      'circle-stroke-width': 1.5,
    },
  });
  map.addLayer({
    id: 'campus-booth-dot-selected',
    type: 'circle',
    source: SOURCES.booths,
    filter: ['in', ['get', 'booth'], ['literal', []]],
    minzoom: BOOTH_DOT_ZOOM,
    maxzoom: BOOTH_ZOOM + BOOTH_LAYER_MARGIN,
    paint: {
      'circle-color': 'transparent',
      'circle-radius': BOOTH_DOT_RADIUS + 3,
      'circle-stroke-color': ACCENT_TEXT,
      'circle-stroke-width': 2.5,
    },
  });

  map.addLayer({
    id: 'campus-booth-fill',
    type: 'fill',
    source: SOURCES.boothShapes,
    minzoom: BOOTH_ZOOM - BOOTH_LAYER_MARGIN,
    paint: { 'fill-color': ['get', 'color'] },
  });
  map.addLayer({
    id: 'campus-booth-outline',
    type: 'line',
    source: SOURCES.boothShapes,
    minzoom: BOOTH_ZOOM - BOOTH_LAYER_MARGIN,
    paint: { 'line-color': WHITE, 'line-width': 1.2 },
  });
  map.addLayer({
    id: 'campus-booth-selected',
    type: 'line',
    source: SOURCES.boothShapes,
    filter: ['in', ['get', 'booth'], ['literal', []]],
    minzoom: BOOTH_ZOOM - BOOTH_LAYER_MARGIN,
    paint: { 'line-color': ACCENT_TEXT, 'line-width': 3 },
  });
  for (const [kind, minzoom] of FACILITY_LAYERS) {
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
      paint: textPaint,
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
      // 複数の企画が並ぶラベルは行が多く、隣のテントと重なると間引かれやすい。
      // どの企画もあることを伝えたいため、企画の多いテントから先に置く。
      'symbol-sort-key': ['-', ['get', 'count']],
    },
    paint: textPaint,
  });
}

/**
 * 種類が `kind` の場所（ごみ箱など）だけを強調する。そのアイコンをどのズームでも少し大きく出し、
 * ほかのピン・点・ラベルは隠す。建物とテントの形は位置の手がかりとして残す。`undefined` で元に戻す。
 */
export function highlightPlaceKind(map: MlMap, kind: FacilityKind | undefined) {
  const visibility = kind ? 'none' : 'visible';
  for (const { id, type } of map.getStyle().layers) {
    if (id.startsWith('campus-') && (type === 'symbol' || type === 'circle')) {
      map.setLayoutProperty(id, 'visibility', visibility);
    }
  }
  for (const [facility, minzoom] of FACILITY_LAYERS) {
    setFacilityEmphasis(map, `campus-${facility}`, minzoom, facility === kind);
  }
}

/** 施設のアイコンのレイヤを、強調（どのズームでも少し大きく）と通常で切り替える。 */
function setFacilityEmphasis(
  map: MlMap,
  id: string,
  minzoom: number,
  on: boolean,
) {
  if (on) map.setLayoutProperty(id, 'visibility', 'visible');
  map.setLayerZoomRange(id, on ? 0 : minzoom, 24);
  map.setLayoutProperty(id, 'icon-size', on ? 1.3 : 1);
  map.setLayoutProperty(id, 'text-offset', [0, on ? 1.3 : 1]);
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
