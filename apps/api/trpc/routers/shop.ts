import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t } from '../trpc';

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

/** 一覧表示・フィルタに使う店舗情報（軽量。画像/長文説明は含めない） */
export type Shop = {
  id: string;
  name: string;
  organization: string;
  location: string;
  schedule: ScheduleDay[];
  /** 主分類（単一） */
  category: ShopCategory;
  /** 自由拡張のタグ（複数）。今後増えるフィルタ軸を柔軟に吸収する */
  tags: string[];
  thumbnail?: string;
  cancelled?: boolean;
};

/** 詳細ページに使う店舗情報（Shop + 詳細フィールド） */
export type ShopDetail = Shop & {
  /** 詳細説明文 */
  description: string;
  /** ギャラリー画像URLの配列 */
  images: string[];
};

const sampleDescription =
  '詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ';

// TODO: 現状は暫定の固定データ。将来 DB / 外部データソースに置き換える。
const shopDetails: ShopDetail[] = [
  {
    id: '1',
    name: '猫大好き委員会',
    organization: '実施団体名',
    location: '5C305',
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '展示',
    tags: ['動物', '癒し', '屋内'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg', '/sample/dog.jpg'],
  },
  {
    id: '2',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    location: '5C305',
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '食品',
    tags: ['屋外', '軽食'],
    cancelled: true,
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg'],
  },
  {
    id: '3',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    location: '5C305',
    schedule: ['Day1', 'Day2'],
    category: '学術',
    tags: ['研究', '屋内'],
    description: sampleDescription,
    images: ['/sample/dog.jpg'],
  },
  {
    id: '4',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    location: '5C305',
    schedule: ['Day2'],
    category: 'ステージ',
    tags: ['音楽', '屋外'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg', '/sample/dog.jpg'],
  },
  {
    id: '5',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    location: '5C305',
    schedule: ['前夜祭', 'Day1'],
    category: '物販',
    tags: ['グッズ', '屋内'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg'],
  },
  {
    id: '6',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    location: '5C305',
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '食品',
    tags: ['屋外', 'スイーツ'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg', '/sample/dog.jpg'],
  },
];

/** ShopDetail から一覧用の軽量な Shop を取り出す */
function toShop(detail: ShopDetail): Shop {
  const { description: _description, images: _images, ...shop } = detail;
  return shop;
}

export const shopRouter = t.router({
  shop: t.router({
    list: t.procedure.query((): Shop[] => shopDetails.map(toShop)),

    detail: t.procedure
      .input(z.object({ id: z.string() }))
      .query(({ input }): ShopDetail => {
        const detail = shopDetails.find((s) => s.id === input.id);
        if (!detail) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `店舗が見つかりません: ${input.id}`,
          });
        }
        return detail;
      }),
  }),
});
