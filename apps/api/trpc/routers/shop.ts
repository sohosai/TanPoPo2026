import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t } from '../trpc';
import { SosClientError, sosClient } from '../../services/sos';

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

export const shopRouter = t.router({
  shop: t.router({
    list: t.procedure.query(async (): Promise<Shop[]> => {
      try {
        return await sosClient.getShops();
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '店舗一覧の取得に失敗しました',
        });
      }
    }),

    detail: t.procedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }): Promise<ShopDetail> => {
        try {
          return await sosClient.getShopDetail(input.id);
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
