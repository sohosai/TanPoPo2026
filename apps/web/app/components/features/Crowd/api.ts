import { useQueries, useQuery } from '@tanstack/react-query';
import type { CrowdAreaMinute, CrowdPoint } from 'api';
import { useMemo } from 'react';

// /crowd/api は Cloudflare Access で守られており、Access の cookie が付いた同じオリジンの
// リクエストだけが通る。個人の移動を含むため、端末に保存するクエリ（PERSISTED_ROUTERS）には入れない。
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/crowd/api${path}`, {
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return (await response.json()) as T;
}

export const MINUTE_MS = 60_000;
// 端末は30秒ごとに送るため、それより細かい時刻で取り直しても中身は変わらない。
export const STEP_MS = 30_000;

/** 時間のバーに区切って示す、雙峰祭の日（日本時間の 0時から翌 0時まで）。 */
export type FestivalDay = { start: number; end: number; label: string };

const festivalDay = (date: string, label: string): FestivalDay => {
  const start = Date.parse(`${date}T00:00:00+09:00`);
  return { start, end: start + 24 * 60 * MINUTE_MS, label };
};

// プレビューは雙峰祭の期間（前夜祭の日の 0時から、本祭2日目の翌 0時まで）の中だけを見る。
export const FESTIVAL_DAYS: FestivalDay[] = [
  festivalDay('2026-10-30', '前夜祭'),
  festivalDay('2026-10-31', '1日目'),
  festivalDay('2026-11-01', '2日目'),
];
export const FESTIVAL_START = FESTIVAL_DAYS[0]?.start ?? 0;
export const FESTIVAL_END = FESTIVAL_DAYS.at(-1)?.end ?? 0;

const floorTo = (t: number, step: number) => Math.floor(t / step) * step;

/** 記録のある期間。最新を見ている間は30秒ごとに取り直す。 */
export function useCrowdRange() {
  return useQuery({
    queryKey: ['crowd', 'range'],
    queryFn: () => get<{ from: number | null; to: number | null }>('/range'),
    refetchInterval: STEP_MS,
  });
}

// 全端末の位置は、この長さの区切りごとに取ってキャッシュする（API の上限と同じ）。
const CHUNK_MS = 5 * MINUTE_MS;

/**
 * 時刻 from〜to に掛かる区切りの、全端末のすべての位置（5秒刻み）。
 * 記録の最後（dataTo）より前に閉じた区切りは変わらないため取り直さず、最後を含む区切りだけ30秒ごとに取り直す。
 */
export function useCrowdPoints(
  from: number,
  to: number,
  dataTo: number | null,
) {
  const chunks: number[] = [];
  for (let start = floorTo(from, CHUNK_MS); start < to; start += CHUNK_MS) {
    chunks.push(start);
  }
  const results = useQueries({
    queries: chunks.map((start) => {
      const closed = dataTo !== null && start + CHUNK_MS <= dataTo - STEP_MS;
      return {
        queryKey: ['crowd', 'points', start],
        queryFn: () =>
          get<CrowdPoint[]>(`/points?from=${start}&to=${start + CHUNK_MS}`),
        staleTime: closed ? Number.POSITIVE_INFINITY : STEP_MS,
        refetchInterval: closed ? false : STEP_MS,
      } as const;
    }),
  });
  // 区切りの顔ぶれと中身が変わったときだけ、まとめ直す。
  const key = `${chunks.join()}|${results.map(({ dataUpdatedAt }) => dataUpdatedAt).join()}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: results は毎回作り直されるため、更新時刻で比べる
  return useMemo(() => results.flatMap(({ data }) => data ?? []), [key]);
}

/** 1台の端末の、期間内のすべての位置。 */
export function useCrowdDevice(
  device: string | null,
  from: number,
  to: number,
) {
  return useQuery({
    queryKey: ['crowd', 'device', device, from, to],
    queryFn: () => get<CrowdPoint[]>(`/device/${device}?from=${from}&to=${to}`),
    enabled: device !== null,
    refetchInterval: STEP_MS,
  });
}

/** 会場エリアごとの1分ごとの人数。 */
export function useCrowdSeries(from: number, to: number) {
  return useQuery({
    queryKey: ['crowd', 'series', from, to],
    queryFn: () => get<CrowdAreaMinute[]>(`/series?from=${from}&to=${to}`),
    refetchInterval: MINUTE_MS,
  });
}

/** 日本時間のその日の 0時から翌 0時まで。 */
export function jstDay(t: number): [number, number] {
  const JST_OFFSET = 9 * 60 * MINUTE_MS;
  const day = 24 * 60 * MINUTE_MS;
  const start = floorTo(t + JST_OFFSET, day) - JST_OFFSET;
  return [start, start + day - 1];
}

export const formatTime = (t: number) =>
  new Date(t).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export const formatDate = (t: number) =>
  new Date(t).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
