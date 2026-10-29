/** 企画（SOS の企画を画面向けに整えたもの）の型。API の応答と web 側の表示で共有する。 */

export type ScheduleDay = '前夜祭' | 'Day1' | 'Day2';

/** 企画の主分類。フィルタの主軸として使い、この順で選択肢に並べる。 */
export const PROJECT_CATEGORIES = [
  '食事',
  'スイーツ',
  'ドリンク',
  '物品販売',
  '展示型',
  '参加型',
  '学術',
  'パフォーマンス',
  '音楽',
  '委員会企画',
  'その他',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

/**
 * 企画が紐づく場所。`placeId` は Place（建物・ステージ・屋外のテント列等）を指す。
 */
export type ProjectLocation = {
  placeId: string;
  /**
   * 場所の中での位置。建物では部屋番号（"208"、"105（版画室）"）や部屋名（"エントランスホール"）、
   * 屋外ではブース番号（"C3"）。ステージ等、場所だけで特定できるときは省略。
   */
  room?: string;
  /** 階。部屋番号の先頭の数字で分からない場所（部屋名だけの場所）にだけ付ける */
  floor?: number;
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

/** 詳細を要らない画面（グランプリ投票等）に渡す企画情報（軽量。画像/長文説明は含めない） */
export type Project = {
  id: string;
  /** 3桁ゼロ埋めの企画番号（例: "001"）。URL に使う */
  number: string;
  name: string;
  /** 企画名のよみがな（ひらがな）。分からなければ空文字 */
  nameReading: string;
  organization: string;
  /** 団体名のよみがな（ひらがな）。分からなければ空文字 */
  organizationReading: string;
  /**
   * 紐づく場所（1つ以上）。複数の企画が同じ placeId を共有でき（ステージ等）、
   * 1つの企画が複数の場所にまたがることも表現できる（M:N）。
   */
  locations: ProjectLocation[];
  schedule: ScheduleDay[];
  /** ステージでの出演枠（日・開始時刻順）。ステージに出ない企画は空 */
  performances: Performance[];
  /** 主分類（単一） */
  category: ProjectCategory;
  thumbnail?: ProjectImage;
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

/** 企画の一覧・詳細ページに使う企画情報（Project + 詳細フィールド） */
export type ProjectDetail = Project & {
  /** 詳細説明文。未登録なら空文字 */
  description: string;
  /** ギャラリー画像URLの配列 */
  images: ProjectImage[];
  links: ProjectLink[];
  /** 団体が SOS で設定した今の営業状態。CLOSED は準備中か閉店。設定されていなければ無い */
  openStatus?: 'OPEN' | 'CLOSED';
  /** 団体が SOS で設定した今の在庫状態。設定されていなければ無い */
  stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK';
};

/**
 * 企画のマスターデータ（apps/api/data/projects.json）の1件。
 * 実行時に SOS から取り直す画像・営業状態・在庫状態を除いた企画詳細。
 * SOS に無い企画（手で追加した企画）だけは、画像（`thumbnail`・`images`）をマスターに持つ。
 */
export type ProjectMaster = Omit<
  ProjectDetail,
  'thumbnail' | 'images' | 'openStatus' | 'stockStatus'
> &
  Partial<Pick<ProjectDetail, 'thumbnail' | 'images'>>;

/** URL に使うため、桁数をそろえて辞書順と番号順を一致させる。 */
export function formatProjectNumber(number: number): string {
  return String(number).padStart(3, '0');
}
