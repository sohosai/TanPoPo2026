import type { Project } from './project';

/**
 * 場所の種別。検索・地図表示・ルートの終点として扱う最小単位の分類。
 * TODO: 正式なデータが入ったら必要に応じて増やす。
 */
export type PlaceKind =
  | 'building' // 建物（企画が紐づく。検索は建物名で行う）
  | 'stage' // ステージ（複数の企画が共有しうる）
  | 'outdoor' // 屋外の企画実施場所（出店テントの列・グラウンド）
  | 'bus_stop' // バス停
  | 'information' // インフォメーション
  | 'parking' // 駐車場
  | 'trash'; // ゴミ捨て場

/**
 * 場所の情報。
 */
export type Place = {
  /** 安定ID。ジオメトリや企画からの参照キー */
  id: string;
  /** 表示・検索対象の名称（建物名や場所名） */
  name: string;
  /** よみがな（任意。かな検索の補助） */
  reading?: string;
  kind: PlaceKind;
  /** 代表点 [経度, 緯度]。地図フォーカスとルート終点に使う */
  point: [number, number];
  /** 建物の中にある場所（ステージ等）が属する建物の id */
  buildingId?: string;
};

/**
 * 場所＋場所内の位置を表示ラベルに整形する。
 * 部屋番号は続けて（"1B208"）、部屋名は空白を挟む（"6A棟 エントランスホール"）。屋外ブースは場所名だけ（"石の広場周辺"）。
 */
export function formatLocation(
  place: Place | undefined,
  room?: string,
): string {
  if (!place) return '';
  // 屋外のブース番号は配置用の内部的な番号なので、利用者には見せない。
  if (!room || place.kind === 'outdoor') return place.name;
  // 部屋番号は学内の表記（"5C305"）に合わせ、建物名の「棟」を外して続ける。
  return /^\d/.test(room)
    ? `${place.name.replace(/棟$/, '')}${room}`
    : `${place.name} ${room}`;
}

/** 企画の先頭の場所を表示ラベルに整形する。場所が複数あれば残りの数を添える。 */
export function formatProjectLocation(
  project: Pick<Project, 'locations'>,
  byId: ReadonlyMap<string, Place>,
): string {
  const [primary, ...rest] = project.locations;
  if (!primary) return '';
  const label = formatLocation(byId.get(primary.placeId), primary.room);
  return rest.length > 0 ? `${label} ほか${rest.length}か所` : label;
}
