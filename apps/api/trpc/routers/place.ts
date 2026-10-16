import type { Place } from '../../domain/place';
import { t } from '../trpc';

// 屋外の出店テントは、配置図の記号の英字（列）ごとに1つの Place とし、個々のブースは
// ProjectLocation.room（ブース番号）で表す。テントの形は web の booths.geojson にある。
// 代表点はその列のテントの中心。
const OUTDOOR_ROWS: [letter: string, name: string, point: [number, number]][] =
  [
    ['a', '第二・第三エリア', [140.10101, 36.11059]],
    ['b', '第二・第三エリア', [140.10153, 36.11022]],
    ['c', '石の広場周辺', [140.10179, 36.11006]],
    ['d', '石の広場周辺', [140.10197, 36.10966]],
    ['e', '石の広場周辺', [140.10198, 36.10989]],
    ['f', '石の広場周辺', [140.1018, 36.1091]],
    ['g', '第一エリア学群棟周辺', [140.10239, 36.10847]],
    ['h', '第一エリア学群棟周辺', [140.10271, 36.10841]],
    ['j', '第一エリア学群棟周辺', [140.10275, 36.1083]],
    ['k', '第一エリア学群棟周辺', [140.10248, 36.10826]],
    ['l', '松美池周辺', [140.10216, 36.1078]],
    ['m', '松美池周辺', [140.10194, 36.1074]],
    ['n', '大学会館エリア', [140.10249, 36.10591]],
    ['p', '大学会館エリア', [140.10242, 36.10545]],
    ['q', '大学会館エリア', [140.10263, 36.10475]],
    ['r', '体芸エリア', [140.10276, 36.1038]],
    ['s', '体芸エリア', [140.10291, 36.10309]],
    ['t', '体芸エリア', [140.10311, 36.10315]],
  ];

// TODO: 現状は地図 JSON の座標から起こした暫定データ。将来データ側提供に差し替える。
const places: Place[] = [
  // ---- 建物（店舗が紐づく。検索は建物名） ----
  {
    id: 'bldg-3a',
    name: '3A棟',
    kind: 'building',
    point: [140.1007794, 36.1104648],
  },
  {
    id: 'bldg-3b',
    name: '3B棟',
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
    name: '2B棟',
    kind: 'building',
    point: [140.1013021, 36.1110689],
  },
  {
    id: 'bldg-2a',
    name: '2A棟',
    kind: 'building',
    point: [140.1017856, 36.1108602],
  },
  {
    id: 'bldg-2h',
    name: '2H棟',
    kind: 'building',
    point: [140.1019329, 36.1111284],
  },
  {
    id: 'bldg-1d',
    name: '1D棟',
    kind: 'building',
    point: [140.1018817, 36.108423],
  },
  {
    id: 'bldg-1e',
    name: '1E棟',
    kind: 'building',
    point: [140.1014781, 36.1082083],
  },
  {
    id: 'bldg-1c',
    name: '1C棟',
    kind: 'building',
    point: [140.102437, 36.1085923],
  },
  {
    id: 'bldg-1b',
    name: '1B棟',
    kind: 'building',
    point: [140.1028375, 36.1087502],
  },
  {
    id: 'bldg-1a',
    name: '1A棟',
    kind: 'building',
    point: [140.1027945, 36.108233],
  },
  {
    id: 'bldg-1h',
    name: '1H棟',
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
    name: '6B棟',
    kind: 'building',
    point: [140.102075, 36.1028043],
  },
  {
    id: 'bldg-6a',
    name: '6A棟',
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
    name: '5C棟',
    kind: 'building',
    point: [140.1030449, 36.1033899],
  },
  {
    id: 'bldg-library',
    name: '中央図書館',
    kind: 'building',
    point: [140.1013386, 36.1091278],
  },
  {
    id: 'bldg-kaigaku',
    name: '開学記念館',
    kind: 'building',
    point: [140.1009206, 36.1017266],
  },

  // ---- 屋外の企画実施場所 ----
  ...OUTDOOR_ROWS.map(
    ([letter, name, point]): Place => ({
      id: `booth-${letter}`,
      name,
      kind: 'outdoor',
      point,
    }),
  ),
  // 実行委員会の福引所。配置図では人文社会系棟の前の学実委使用テント（右の2張り）で、ブース記号は無い。
  // 配置図どおりだと地図の建物の輪郭に重なるため、北へ 1.6m・西へ 1.0m ずらしている。
  {
    id: 'booth-fukubiki',
    name: '石の広場周辺',
    kind: 'outdoor',
    point: [140.1021996, 36.1095578],
  },
  // 実行委員会のグッズ販売所。配置図では福引所の西隣の学実委使用テント（左の2張り）で、ブース記号は無い。
  // 福引所と並びをそろえるため、同じく北へ 1.6m・西へ 1.0m ずらしている。
  {
    id: 'booth-goods',
    name: '石の広場周辺',
    kind: 'outdoor',
    point: [140.1020995, 36.1095177],
  },
  // 協賛企業のブース。配置図では松美池周辺の「ブース協賛」の学実委使用テント（2張りのうち左）で、ブース記号は無い。
  {
    id: 'booth-kyosan',
    name: '松美池周辺',
    kind: 'outdoor',
    point: [140.1021229, 36.1076598],
  },
  {
    id: 'field-sekisho',
    name: 'セキショウフィールド',
    kind: 'outdoor',
    point: [140.1088, 36.10292],
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
    buildingId: 'bldg-1a',
  },
  {
    id: 'stage-kaikan-kodo',
    name: '大学会館ステージ（講堂）',
    reading: 'だいがくかいかんすてーじこうどう',
    kind: 'stage',
    point: [140.101763, 36.1055891],
    buildingId: 'bldg-kaikan',
  },
  {
    id: 'stage-kaikan-hall',
    name: '大学会館ステージ（ホール）',
    reading: 'だいがくかいかんすてーじほーる',
    kind: 'stage',
    point: [140.1018528, 36.1052771],
    buildingId: 'bldg-kaikan',
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

  // ---- 案内所（屋外配置図の 6脚大テント） ----
  {
    id: 'info-2-3',
    name: '第二・第三エリア案内所',
    kind: 'information',
    point: [140.1014994, 36.1103067],
  },
  {
    id: 'info-1',
    name: '第一エリア案内所',
    kind: 'information',
    point: [140.1025644, 36.1084059],
  },
  {
    id: 'info-kaikan',
    name: '大学会館案内所',
    kind: 'information',
    point: [140.1022471, 36.1056821],
  },
  {
    id: 'info-taigei',
    name: '体芸エリア案内所',
    kind: 'information',
    point: [140.1028659, 36.1036261],
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

  // ---- ゴミ箱（屋外配置図の位置） ----
  {
    id: 'trash-2-3-sunny',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1014062, 36.1103633],
  },
  {
    id: 'trash-ishi',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1020905, 36.1097069],
  },
  {
    id: 'trash-library',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1018991, 36.1090672],
  },
  {
    id: 'trash-1-sunny',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1021697, 36.1083743],
  },
  {
    id: 'trash-1-rainy',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1026599, 36.1082421],
  },
  {
    id: 'trash-matsumi',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1021404, 36.1079871],
  },
  {
    id: 'trash-kaikan',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1027139, 36.1054642],
  },
  {
    id: 'trash-taigei',
    name: 'ゴミ箱',
    kind: 'trash',
    point: [140.1030967, 36.1034724],
  },
];

export const placeRouter = t.router({
  place: t.router({
    list: t.procedure.query((): Place[] => places),
  }),
});
