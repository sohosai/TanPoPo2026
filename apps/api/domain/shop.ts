/** 企画（SOS の企画を画面向けに整えたもの）の型。API の応答と web 側の表示で共有する。 */

export type ScheduleDay = '前夜祭' | 'Day1' | 'Day2';

/**
 * 企画の主分類。フィルタの主軸として使う。
 * TODO: 正式な分類体系に合わせて増やす。
 */
export type ShopCategory =
  | '食品'
  | '物販'
  | '展示'
  | '学術'
  | 'ステージ'
  | 'その他';

/**
 * 店舗が紐づく場所。`placeId` は Place（建物・ステージ・屋外のテント列等）を指す。
 */
export type ShopLocation = {
  placeId: string;
  /**
   * 場所の中での位置。建物では部屋番号（"208"、"105（版画室）"）や部屋名（"エントランスホール"）、
   * 屋外ではブース番号（"C3"）。ステージ等、場所だけで特定できるときは省略。
   */
  room?: string;
  /** この場所で実施する日。省略時は企画の全実施日 */
  days?: ScheduleDay[];
};

/** 一覧表示・フィルタに使う店舗情報（軽量。画像/長文説明は含めない） */
export type Shop = {
  id: string;
  /** 3桁ゼロ埋めの企画番号（例: "001"）。URL に使う */
  number: string;
  name: string;
  organization: string;
  /**
   * 紐づく場所（1つ以上）。複数店舗が同じ placeId を共有でき（ステージ等）、
   * 1店舗が複数の場所にまたがることも表現できる（M:N）。
   */
  locations: ShopLocation[];
  schedule: ScheduleDay[];
  /** 主分類（単一） */
  category: ShopCategory;
  /** 自由拡張のタグ（複数）。今後増えるフィルタ軸を柔軟に吸収する */
  tags: string[];
  thumbnail?: ShopImage;
  cancelled?: boolean;
};

/** 表示する画像。`srcSet` は幅違いの候補（`<img srcset>` 形式）で、無い場合は `src` だけを使う */
export type ShopImage = {
  src: string;
  srcSet?: string;
};

export type ShopLinkKind = 'website' | 'x' | 'instagram' | 'youtube';

/** 企画の外部リンク（公式サイト・SNS）。URL は API 側で組み立て済み。 */
export type ShopLink = {
  kind: ShopLinkKind;
  /** 表示用の短いラベル（@ユーザー名やドメイン名） */
  label: string;
  url: string;
};

/** 詳細ページに使う店舗情報（Shop + 詳細フィールド） */
export type ShopDetail = Shop & {
  /** 詳細説明文 */
  description: string;
  /** ギャラリー画像URLの配列 */
  images: ShopImage[];
  links: ShopLink[];
};
