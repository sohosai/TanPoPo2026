/**
 * 場所の種別。検索・地図表示・ルートの終点として扱う最小単位の分類。
 * TODO: 正式なデータが入ったら必要に応じて増やす。
 */
export type PlaceKind =
  | 'building' // 建物（店舗が紐づく。検索は建物名で行う）
  | 'stage' // ステージ（複数店舗が共有しうる）
  | 'outdoor' // 屋外の企画実施場所（出店テントの列・グラウンド）
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
