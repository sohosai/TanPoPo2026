import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { SosClientError } from '../../services/sos';
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

/**
 * 店舗が紐づく場所。`placeId` は Place（建物・ステージ等）を指す。
 * `room` は表示専用（部屋番号など）。検索は建物名＝Place.name で行うため room は対象外。
 */
export type ShopLocation = {
  placeId: string;
  /** 部屋番号など表示用。建物以外（ステージ等）では省略 */
  room?: string;
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

export const shopRouter = t.router({
  shop: t.router({
    list: t.procedure.query(async ({ ctx }): Promise<Shop[]> => {
      try {
        return await ctx.sos.getShops();
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '店舗一覧の取得に失敗しました',
        });
      }
    }),

    detail: t.procedure
      .input(z.object({ number: z.string() }))
      .query(async ({ ctx, input }): Promise<ShopDetail> => {
        try {
          return await ctx.sos.getShopDetail(input.number);
        } catch (error: unknown) {
          if (error instanceof SosClientError && error.code === 'NOT_FOUND') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: error.message,
            });
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '店舗詳細の取得に失敗しました',
          });
        }
      }),
  }),
});
