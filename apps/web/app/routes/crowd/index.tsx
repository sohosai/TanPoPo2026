import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconX,
} from '@tabler/icons-react';
import { ALL_AREAS_ID } from 'api/domain/crowdConstants';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import AreaChart, {
  type AreaSeries,
} from '~/components/features/Crowd/AreaChart';
import {
  FESTIVAL_DAYS,
  FESTIVAL_END,
  FESTIVAL_START,
  formatDate,
  formatTime,
  jstDay,
  MINUTE_MS,
  useCrowdDevice,
  useCrowdPoints,
  useCrowdRange,
  useCrowdSeries,
} from '~/components/features/Crowd/api';
import CrowdLayers from '~/components/features/Crowd/CrowdLayers';
import TimeBar from '~/components/features/Crowd/TimeBar';
import {
  frameAt,
  groupTracks,
  removeOutliers,
  smooth,
  snapToPaths,
  toSegments,
} from '~/components/features/Crowd/track';
import CampusLayers from '~/components/features/Map/CampusLayers';
import { findCampusArea } from '~/components/features/Map/campusData';
import pathNetworkRaw from '~/components/features/Map/data/path-network.geojson?raw';
import type { LngLat } from '~/components/features/Map/geo';
import { MapProvider } from '~/components/features/Map/MapController';
import MapView from '~/components/features/Map/MapView';
import SidePanel, {
  PANEL_WIDTH,
} from '~/components/layouts/MapPanel/SidePanel';
import { css, cx } from '../../../styled-system/css';
import type { Route } from './+types/index';

export const meta: Route.MetaFunction = () => [
  { title: '人流プレビュー | 雙峰祭 企画検索システム' },
  { name: 'robots', content: 'noindex' },
];

// 北から順に、分類の色の 1〜4 番を当てる。全体は色を使わず文字の色にする。
const AREA_SERIES: AreaSeries[] = [
  { id: ALL_AREAS_ID, name: '全体', color: '#1f2834' },
  ...(
    [
      ['area-2-3', '#2a78d6'],
      ['area-1', '#eb6834'],
      ['area-kaikan', '#1baf7a'],
      ['area-taigei', '#eda100'],
    ] as const
  ).map(([id, color]) => ({
    id,
    name: findCampusArea(id)?.name ?? id,
    color,
  })),
];

// 再生の速さ（実際の1秒で進む秒数）。
const SPEEDS = [1, 10, 30, 60, 300] as const;
const TAIL_OPTIONS = [3, 5, 10] as const;
// 端末は5秒ごとの位置を30秒ごとに送る。点がこれより空いた端末は、送信が止まったとみなして出さない。
const MAX_GAP_MS = 60_000;
const PREFETCH_MS = 5 * MINUTE_MS;
const ACCURACY_OPTIONS = [10, 25, 50, 100, 200] as const;

const PATH_SEGMENTS = toSegments(
  (
    JSON.parse(pathNetworkRaw) as {
      features: {
        properties: { kind: string };
        geometry: { coordinates: LngLat[] };
      }[];
    }
  ).features
    .filter(({ properties }) => properties.kind === 'walkway')
    .map(({ geometry }) => geometry.coordinates),
);

const clampToFestival = (t: number) =>
  Math.min(FESTIVAL_END, Math.max(FESTIVAL_START, t));

const sectionTitle = css({
  fontSize: 'sm',
  fontWeight: 700,
  color: 'fg.strong',
});
// 下の段に並べる、丸い小さな操作。押した状態はアクセント色で塗る。
const control = css({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  h: '34px',
  px: '14px',
  bg: 'overlay.control',
  boxShadow: 'float',
  borderRadius: 'full',
  fontSize: 'sm',
  fontWeight: 700,
  color: 'accent.text',
  cursor: 'pointer',
  '&[aria-pressed=true]': { bg: 'accent', color: 'white' },
});
const pill = css({
  bg: 'overlay.control',
  boxShadow: 'float',
  borderRadius: 'full',
});

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={control}
    >
      {children}
    </button>
  );
}

/**
 * 来場者の位置（人流）のプレビュー。Cloudflare Access で実行委員会のアカウントだけに公開する。
 * 下の時間のバーで雙峰祭の期間の時刻を選ぶと、その時点の全員の位置と直前の軌跡を出し、
 * 点を押すとその端末の1日の経路を出す。左のパネルに会場エリアごとの人数の推移を出す。
 */
export default function CrowdPreview() {
  const { data: range } = useCrowdRange();
  // null の間は最新（記録の最後）を追い続ける。
  const [pinnedTime, setPinnedTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(60);
  const [tailMinutes, setTailMinutes] =
    useState<(typeof TAIL_OPTIONS)[number]>(3);
  const [maxAccuracy, setMaxAccuracy] = useState(50);
  const [panelOpen, setPanelOpen] = useState(true);
  const [device, setDevice] = useState<string | null>(null);
  const [track, setTrack] = useState({
    outliers: true,
    smooth: true,
    snap: false,
  });

  const dataFrom = range?.from ?? null;
  const dataTo = range?.to ?? null;
  const latest = clampToFestival(dataTo ?? Date.now());
  const live = pinnedTime === null;
  const time = pinnedTime ?? latest;
  const playEnd = Math.min(latest, FESTIVAL_END);

  // 再生中は画面の描き替えに合わせて時刻を進め、記録の最後まで来たら最新に戻る。
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const elapsed = now - last;
      last = now;
      setPinnedTime((t) => {
        const next = (t ?? playEnd) + elapsed * speed;
        if (next < playEnd) return next;
        setPlaying(false);
        return null;
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, playEnd]);

  const tailMs = tailMinutes * MINUTE_MS;
  // 補間に前後の点が要るため、軌跡の長さと点の空きの許容ぶん広く取る。再生中は先の区切りも先に取っておく。
  const rawPoints = useCrowdPoints(
    time - tailMs - MAX_GAP_MS,
    time + MAX_GAP_MS + (playing ? PREFETCH_MS : 0),
    dataTo,
  );
  const [dayFrom, dayTo] = jstDay(time);
  const { data: series = [] } = useCrowdSeries(FESTIVAL_START, FESTIVAL_END);
  const { data: rawPath = [] } = useCrowdDevice(device, dayFrom, dayTo);

  const tracks = useMemo(() => {
    const grouped = groupTracks(
      rawPoints.filter(({ accuracy }) => accuracy <= maxAccuracy),
    );
    for (const [id, path] of grouped) {
      let cleaned = path;
      if (track.outliers) cleaned = removeOutliers(cleaned);
      if (track.smooth) cleaned = smooth(cleaned);
      grouped.set(id, cleaned);
    }
    return grouped;
  }, [rawPoints, maxAccuracy, track.outliers, track.smooth]);
  // 描き替えのたびに、その時刻の位置を前後の点から補間する。
  const { points, tails: tailPoints } = useMemo(
    () => frameAt(tracks, time, tailMs, MAX_GAP_MS),
    [tracks, time, tailMs],
  );
  const devicePath = useMemo(() => {
    let path = rawPath.filter(({ accuracy }) => accuracy <= maxAccuracy);
    if (track.outliers) path = removeOutliers(path);
    if (track.smooth) path = smooth(path);
    if (track.snap) path = snapToPaths(path, PATH_SEGMENTS);
    return path;
  }, [rawPath, maxAccuracy, track]);

  const selectTime = (t: number) => {
    setPlaying(false);
    setPinnedTime(clampToFestival(t));
  };
  const togglePlay = () => {
    // 最新を見ているときは、記録の始まりから再生する。
    if (!playing && live) {
      setPinnedTime(clampToFestival(dataFrom ?? FESTIVAL_START));
    }
    setPlaying(!playing);
  };

  return (
    <MapProvider>
      <MapView />
      <CampusLayers interactive={false} />
      <CrowdLayers
        points={points}
        tails={tailPoints}
        devicePath={devicePath}
        onSelectDevice={setDevice}
      />

      <SidePanel onOpenChange={setPanelOpen}>
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            px: '16px',
            pb: '24px',
          })}
        >
          <section
            aria-label="エリアごとの人数"
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            })}
          >
            <h2 className={sectionTitle}>エリアごとの人数</h2>
            <AreaChart
              rows={series}
              days={FESTIVAL_DAYS}
              series={AREA_SERIES}
              time={time}
              onSelectTime={selectTime}
            />
          </section>
        </div>
      </SidePanel>

      <footer
        // 左のパネルに隠れないよう、パネルの右から始める。パネルの開け閉めと同じ速さで動かす。
        style={{ left: (panelOpen ? PANEL_WIDTH : 0) + 12 }}
        className={css({
          position: 'fixed',
          zIndex: 5,
          right: '12px',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 36px)',
          transition: 'left 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none',
          '& > *': { pointerEvents: 'auto' },
        })}
      >
        {device && (
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              alignSelf: 'flex-start',
            })}
          >
            <span
              className={cx(
                pill,
                css({
                  px: '14px',
                  py: '6px',
                  fontSize: 'sm',
                  fontWeight: 700,
                  color: 'fg.strong',
                }),
              )}
            >
              選んだ端末の経路（{formatDate(dayFrom)}・{devicePath.length}点）
            </span>
            <Toggle
              pressed={track.snap}
              onClick={() => setTrack((t) => ({ ...t, snap: !t.snap }))}
            >
              道に沿わせる
            </Toggle>
            <button
              type="button"
              aria-label="端末の選択を外す"
              onClick={() => setDevice(null)}
              className={control}
            >
              <IconX size={16} />
            </button>
          </div>
        )}
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          })}
        >
          <div
            className={cx(
              pill,
              css({
                px: '14px',
                py: '6px',
                fontSize: 'sm',
                fontWeight: 700,
                color: 'fg.strong',
                fontVariantNumeric: 'tabular-nums',
              }),
            )}
          >
            {formatDate(time)} {formatTime(time)}
          </div>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? '一時停止' : '再生'}
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              w: '40px',
              h: '40px',
              borderRadius: 'full',
              bg: 'accent',
              color: 'white',
              boxShadow: 'float',
              cursor: 'pointer',
              transition: 'transform 0.1s',
              _active: { transform: 'scale(0.94)' },
            })}
          >
            {playing ? (
              <IconPlayerPauseFilled size={20} />
            ) : (
              <IconPlayerPlayFilled size={20} />
            )}
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.currentTarget.value))}
            aria-label="再生の速さ"
            className={control}
          >
            {SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
          <span className={css({ flex: 1 })} />
          <select
            value={tailMinutes}
            onChange={(e) =>
              setTailMinutes(
                Number(e.currentTarget.value) as (typeof TAIL_OPTIONS)[number],
              )
            }
            aria-label="軌跡の長さ"
            className={control}
          >
            {TAIL_OPTIONS.map((value) => (
              <option key={value} value={value}>
                軌跡 {value}分
              </option>
            ))}
          </select>
          <select
            value={maxAccuracy}
            onChange={(e) => setMaxAccuracy(Number(e.currentTarget.value))}
            aria-label="表示する位置の誤差の上限"
            className={control}
          >
            {ACCURACY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                誤差 {value}m まで
              </option>
            ))}
          </select>
          <Toggle
            pressed={track.outliers}
            onClick={() => setTrack((t) => ({ ...t, outliers: !t.outliers }))}
          >
            跳びを除く
          </Toggle>
          <Toggle
            pressed={track.smooth}
            onClick={() => setTrack((t) => ({ ...t, smooth: !t.smooth }))}
          >
            ならす
          </Toggle>
        </div>
        <div
          className={cx(
            pill,
            css({
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'accent.border',
            }),
          )}
        >
          <TimeBar
            time={time}
            days={FESTIVAL_DAYS}
            dataFrom={dataFrom}
            dataTo={dataTo}
            onChange={selectTime}
          />
        </div>
      </footer>
    </MapProvider>
  );
}
