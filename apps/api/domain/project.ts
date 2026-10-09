/** 企画（SOS の企画と、リポジトリで追加した企画を画面向けに整えたもの）の型。API の応答と web 側の表示で共有する。 */

/** 実施日。並びは日付順。 */
export const SCHEDULE_DAYS = ['前夜祭', 'Day1', 'Day2'] as const;
export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

/**
 * 企画の主分類。フィルタの主軸として使う。
 * TODO: 正式な分類体系に合わせて増やす。
 */
export const PROJECT_CATEGORIES = [
  '食品',
  '物販',
  '展示',
  '学術',
  'ステージ',
  'その他',
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

/**
 * 店舗が紐づく場所。`placeId` は Place（建物・ステージ・屋外のテント列等）を指す。
 */
export type ProjectLocation = {
  placeId: string;
  /**
   * 場所の中での位置。建物では部屋番号（"208"、"105（版画室）"）や部屋名（"エントランスホール"）、
   * 屋外ではブース番号（"C3"）。ステージ等、場所だけで特定できるときは省略。
   */
  room?: string;
  /** この場所で実施する日。省略時は企画の全実施日 */
  days?: ScheduleDay[];
};

/** ステージでの出演枠。時刻は "HH:MM"。 */
export type Performance = {
  placeId: string;
  day: ScheduleDay;
  start: string;
  end: string;
  /** タイムテーブル上の演目名。企画名と異なることがある */
  title: string;
};

/** 詳細を要らない画面（グランプリ投票等）に渡す店舗情報（軽量。画像/長文説明は含めない） */
export type Project = {
  id: string;
  /** 3桁ゼロ埋めの企画番号（例: "001"）。URL に使う */
  number: string;
  name: string;
  organization: string;
  /**
   * 紐づく場所（1つ以上）。複数店舗が同じ placeId を共有でき（ステージ等）、
   * 1店舗が複数の場所にまたがることも表現できる（M:N）。
   */
  locations: ProjectLocation[];
  schedule: ScheduleDay[];
  /** ステージでの出演枠（日・開始時刻順）。ステージに出ない企画は空 */
  performances: Performance[];
  /** 主分類（単一） */
  category: ProjectCategory;
  /** 自由拡張のタグ（複数）。今後増えるフィルタ軸を柔軟に吸収する */
  tags: string[];
  thumbnail?: ProjectImage;
  cancelled?: boolean;
};

/** 表示する画像。`srcSet` は幅違いの候補（`<img srcset>` 形式）で、無い場合は `src` だけを使う */
export type ProjectImage = {
  src: string;
  srcSet?: string;
};

export type ProjectLinkKind = 'website' | 'x' | 'instagram' | 'youtube';

/** 企画の外部リンク（公式サイト・SNS）。URL は API 側で組み立て済み。 */
export type ProjectLink = {
  kind: ProjectLinkKind;
  /** 表示用の短いラベル（@ユーザー名やドメイン名） */
  label: string;
  url: string;
};

/** 企画の一覧・詳細ページに使う店舗情報（Project + 詳細フィールド） */
export type ProjectDetail = Project & {
  /** 詳細説明文。未登録なら空文字 */
  description: string;
  /** ギャラリー画像URLの配列 */
  images: ProjectImage[];
  links: ProjectLink[];
};
