import { t } from '../trpc';

/**
 * 場所の種別。検索・地図表示・ルートの終点として扱う最小単位の分類。
 * TODO: 正式なデータが入ったら必要に応じて増やす。
 */
export type PlaceKind =
  | 'building' // 建物（店舗が紐づく。検索は建物名で行う）
  | 'stage' // ステージ（複数店舗が共有しうる）
  | 'bus_stop' // バス停
  | 'information' // インフォメーション
  | 'parking' // 駐車場
  | 'trash'; // ゴミ捨て場

/**
 * 場所の情報。
 */
export type Place = {
  /** 安定ID。ジオメトリや店舗からの参照キー */
  id: string;
  /** 表示・検索対象の名称（建物名や場所名） */
  name: string;
  /** よみがな（任意。かな検索の補助） */
  reading?: string;
  kind: PlaceKind;
  /** 代表点 [経度, 緯度]。地図フォーカスとルート終点に使う */
  point: [number, number];
};

// TODO: 現状は地図 JSON の座標から起こした暫定データ。将来データ側提供に差し替える。
const places: Place[] = [
  // ---- 建物（店舗が紐づく。検索は建物名） ----
  {
    id: 'bldg-3a',
    name: '3A',
    kind: 'building',
    point: [140.1007794, 36.1104648],
  },
  {
    id: 'bldg-3b',
    name: '3B',
    kind: 'building',
    point: [140.1002583, 36.111102],
  },
  {
    id: 'bldg-2c',
    name: '2C棟',
    kind: 'building',
    point: [140.101097, 36.1114724],
  },
  {
    id: 'bldg-2d',
    name: '2D棟',
    kind: 'building',
    point: [140.1008497, 36.1117568],
  },
  {
    id: 'bldg-2b',
    name: '2B',
    kind: 'building',
    point: [140.1013021, 36.1110689],
  },
  {
    id: 'bldg-2a',
    name: '2A',
    kind: 'building',
    point: [140.1017856, 36.1108602],
  },
  {
    id: 'bldg-2h',
    name: '2H',
    kind: 'building',
    point: [140.1019329, 36.1111284],
  },
  {
    id: 'bldg-1d',
    name: '1D',
    kind: 'building',
    point: [140.1018817, 36.108423],
  },
  {
    id: 'bldg-1e',
    name: '1E',
    kind: 'building',
    point: [140.1014781, 36.1082083],
  },
  {
    id: 'bldg-1c',
    name: '1C',
    kind: 'building',
    point: [140.102437, 36.1085923],
  },
  {
    id: 'bldg-1b',
    name: '1B',
    kind: 'building',
    point: [140.1028375, 36.1087502],
  },
  {
    id: 'bldg-1a',
    name: '1A',
    kind: 'building',
    point: [140.1027945, 36.108233],
  },
  {
    id: 'bldg-1h',
    name: '1H',
    kind: 'building',
    point: [140.1031491, 36.108477],
  },
  {
    id: 'bldg-kaikan',
    name: '大学会館',
    reading: 'だいがくかいかん',
    kind: 'building',
    point: [140.1019135, 36.1054594],
  },
  {
    id: 'bldg-6b',
    name: '6B',
    kind: 'building',
    point: [140.102075, 36.1028043],
  },
  {
    id: 'bldg-6a',
    name: '6A',
    kind: 'building',
    point: [140.1026033, 36.1028533],
  },
  {
    id: 'bldg-chuo-gym',
    name: '中央体育館',
    reading: 'ちゅうおうたいいくかん',
    kind: 'building',
    point: [140.1039155, 36.1023541],
  },
  {
    id: 'bldg-kyugi-gym',
    name: '球技体育館',
    reading: 'きゅうぎたいいくかん',
    kind: 'building',
    point: [140.1036924, 36.1014762],
  },
  {
    id: 'bldg-budokan',
    name: '武道館',
    reading: 'ぶどうかん',
    kind: 'building',
    point: [140.1050856, 36.1017354],
  },
  {
    id: 'bldg-pool',
    name: '屋内プール',
    reading: 'おくないぷーる',
    kind: 'building',
    point: [140.1048095, 36.102395],
  },
  {
    id: 'bldg-5c',
    name: '5C',
    kind: 'building',
    point: [140.1030449, 36.1033899],
  },

  // ---- ステージ（複数店舗が共有しうる） ----
  {
    id: 'stage-united',
    name: 'UNITEDステージ',
    reading: 'ゆないてっどすてーじ',
    kind: 'stage',
    point: [140.1015042, 36.1097075],
  },
  {
    id: 'stage-1a',
    name: '1Aステージ',
    reading: 'いちえーすてーじ',
    kind: 'stage',
    point: [140.1028046, 36.1082805],
  },
  {
    id: 'stage-kaikan-kodo',
    name: '大学会館ステージ（講堂）',
    reading: 'だいがくかいかんすてーじこうどう',
    kind: 'stage',
    point: [140.101763, 36.1055891],
  },
  {
    id: 'stage-kaikan-hall',
    name: '大学会館ステージ（ホール）',
    reading: 'だいがくかいかんすてーじほーる',
    kind: 'stage',
    point: [140.1018528, 36.1052771],
  },

  // ---- バス停 ----
  {
    id: 'bus-dai3-area',
    name: '第三エリア前',
    reading: 'だいさんえりあまえ',
    kind: 'bus_stop',
    point: [140.0985939, 36.1102205],
  },
  {
    id: 'bus-dai1-area',
    name: '第一エリア前',
    reading: 'だいいちえりあまえ',
    kind: 'bus_stop',
    point: [140.0999812, 36.1079525],
  },
  {
    id: 'bus-kaikan-mae',
    name: '大学会館前',
    reading: 'だいがくかいかんまえ',
    kind: 'bus_stop',
    point: [140.1012628, 36.1048229],
  },
  {
    id: 'bus-tsukuba-nishi',
    name: '筑波大学西',
    reading: 'つくばだいがくにし',
    kind: 'bus_stop',
    point: [140.1015753, 36.1034008],
  },
  {
    id: 'bus-amakubo-ike',
    name: '天久保池',
    reading: 'あまくぼいけ',
    kind: 'bus_stop',
    point: [140.1060374, 36.1007779],
  },
  {
    id: 'bus-gasshukujo',
    name: '合宿所',
    reading: 'がっしゅくじょ',
    kind: 'bus_stop',
    point: [140.1066057, 36.1037312],
  },
  {
    id: 'bus-amakubo3',
    name: '天久保三丁目',
    reading: 'あまくぼさんちょうめ',
    kind: 'bus_stop',
    point: [140.105579, 36.1063803],
  },
  {
    id: 'bus-matsumi-ike',
    name: '松美池',
    reading: 'まつみいけ',
    kind: 'bus_stop',
    point: [140.1042358, 36.1080857],
  },
  {
    id: 'bus-daigaku-koen',
    name: '大学公園',
    reading: 'だいがくこうえん',
    kind: 'bus_stop',
    point: [140.1039473, 36.1099613],
  },
  {
    id: 'bus-tsukuba-chuo',
    name: '筑波大学中央',
    reading: 'つくばだいがくちゅうおう',
    kind: 'bus_stop',
    point: [140.1034686, 36.1113202],
  },
  {
    id: 'bus-tara-center',
    name: 'TARAセンター前',
    reading: 'たらせんたーまえ',
    kind: 'bus_stop',
    point: [140.1022996, 36.1129708],
  },

  // ---- インフォメーション（元データに名称なし → モックで命名） ----
  {
    id: 'info-1',
    name: 'インフォメーション(第3エリア)',
    kind: 'information',
    point: [140.1015061, 36.1105524],
  },
  {
    id: 'info-2',
    name: 'インフォメーション(第1エリア)',
    kind: 'information',
    point: [140.1022889, 36.10847],
  },
  {
    id: 'info-3',
    name: 'インフォメーション(大学会館)',
    kind: 'information',
    point: [140.1021282, 36.1054217],
  },
  {
    id: 'info-4',
    name: 'インフォメーション(第6エリア)',
    kind: 'information',
    point: [140.1028136, 36.1030784],
  },

  // ---- 駐車場 ----
  {
    id: 'parking-3',
    name: '第3駐車場',
    reading: 'だいさんちゅうしゃじょう',
    kind: 'parking',
    point: [140.0986204, 36.1119049],
  },
  {
    id: 'parking-1',
    name: '第1駐車場',
    reading: 'だいいちちゅうしゃじょう',
    kind: 'parking',
    point: [140.1049066, 36.1100548],
  },
  {
    id: 'parking-2',
    name: '第2駐車場',
    reading: 'だいにちゅうしゃじょう',
    kind: 'parking',
    point: [140.1031096, 36.1129869],
  },
  {
    id: 'parking-5',
    name: '第5駐車場',
    reading: 'だいごちゅうしゃじょう',
    kind: 'parking',
    point: [140.1007687, 36.1036536],
  },
  {
    id: 'parking-4',
    name: '第4駐車場',
    reading: 'だいよんちゅうしゃじょう',
    kind: 'parking',
    point: [140.1058889, 36.1000008],
  },

  // ---- ゴミ捨て場（元データに名称なし → モックで命名） ----
  {
    id: 'trash-1',
    name: 'ゴミ捨て場1',
    kind: 'trash',
    point: [140.1014421, 36.1106577],
  },
  {
    id: 'trash-2',
    name: 'ゴミ捨て場2',
    kind: 'trash',
    point: [140.1019183, 36.1099378],
  },
  {
    id: 'trash-3',
    name: 'ゴミ捨て場3',
    kind: 'trash',
    point: [140.1010661, 36.110218],
  },
  {
    id: 'trash-4',
    name: 'ゴミ捨て場4',
    kind: 'trash',
    point: [140.1020406, 36.1084449],
  },
  {
    id: 'trash-5',
    name: 'ゴミ捨て場5',
    kind: 'trash',
    point: [140.1024645, 36.1081918],
  },
  {
    id: 'trash-6',
    name: 'ゴミ捨て場6',
    kind: 'trash',
    point: [140.1025369, 36.1055598],
  },
  {
    id: 'trash-7',
    name: 'ゴミ捨て場7',
    kind: 'trash',
    point: [140.1030178, 36.1034576],
  },
];

export const placeRouter = t.router({
  place: t.router({
    list: t.procedure.query((): Place[] => places),
  }),
});
