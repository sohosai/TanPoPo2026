import type { ProjectDetail } from 'api';
import { useOnline } from '~/lib/pwa';

// 端末に残した古い一覧で、今の状態のように見せないための期限。一覧を取り直す間隔（staleTime）と揃える。
const STATUS_MAX_AGE_MS = 1000 * 60 * 5;

export type StatusTone = 'active' | 'inactive' | 'alert';
export type StatusLabel = { label: string; tone: StatusTone };

const OPEN_STATUS: Record<
  NonNullable<ProjectDetail['openStatus']>,
  StatusLabel
> = {
  OPEN: { label: '営業中', tone: 'active' },
  CLOSED: { label: '準備中', tone: 'inactive' },
};

const STOCK_STATUS: Record<
  NonNullable<ProjectDetail['stockStatus']>,
  StatusLabel
> = {
  IN_STOCK: { label: '在庫あり', tone: 'active' },
  OUT_OF_STOCK: { label: '完売', tone: 'alert' },
};

/**
 * 団体が SOS で設定した今の営業状態・在庫状態のうち、表示してよいもの。
 * 設定されていない項目や、オフラインのとき・取得から時間がたったときは、古い状態を見せないよう返さない。
 */
export function useProjectStatus(
  {
    openStatus,
    stockStatus,
  }: Pick<ProjectDetail, 'openStatus' | 'stockStatus'>,
  /** 一覧を取得した時刻（UNIX ミリ秒）。 */
  fetchedAt: number,
): { open?: StatusLabel; stock?: StatusLabel } {
  const online = useOnline();
  if (!online || Date.now() - fetchedAt > STATUS_MAX_AGE_MS) return {};
  return {
    open: openStatus && OPEN_STATUS[openStatus],
    stock: stockStatus && STOCK_STATUS[stockStatus],
  };
}
