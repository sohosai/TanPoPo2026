import type { CrowdPoint } from 'api';
import type { LngLat } from '../Map/geo';

// 経緯度を、会場付近で平面とみなした m に直す。会場の範囲（数 km）では誤差は無視できる。
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((36.106 * Math.PI) / 180);

const toMeters = ([lng, lat]: LngLat): LngLat => [
  lng * M_PER_DEG_LNG,
  lat * M_PER_DEG_LAT,
];
const toLngLat = ([x, y]: LngLat): LngLat => [
  x / M_PER_DEG_LNG,
  y / M_PER_DEG_LAT,
];

/** 2点間の距離（m）。 */
export function distance(a: LngLat, b: LngLat): number {
  const [ax, ay] = toMeters(a);
  const [bx, by] = toMeters(b);
  return Math.hypot(ax - bx, ay - by);
}

// 歩く・走る程度を超える移動は位置の跳びとみなす（時速約 20km）。
const MAX_SPEED_MPS = 5.5;

/**
 * 前の点から、人が動ける速さを超えて離れた点（位置の跳び）を除く。
 * 2点の誤差の小さいほうまでは動いていなくても離れて見えるため、その分は差し引いて比べる。
 */
export function removeOutliers(points: CrowdPoint[]): CrowdPoint[] {
  const kept: CrowdPoint[] = [];
  for (const point of points) {
    const last = kept.at(-1);
    if (last) {
      const seconds = Math.max((point.t - last.t) / 1000, 1);
      const moved =
        distance([last.lng, last.lat], [point.lng, point.lat]) -
        Math.min(last.accuracy, point.accuracy);
      if (moved / seconds > MAX_SPEED_MPS) continue;
    }
    kept.push(point);
  }
  return kept;
}

// 人が1秒に動く距離のばらつき（m）。大きいほど新しい位置を信じ、ならし方が弱くなる。
const WALK_NOISE_MPS = 1.5;

/** 誤差（accuracy）で重みを付けたカルマンフィルタで、経路のがたつきをならす。 */
export function smooth(points: CrowdPoint[]): CrowdPoint[] {
  let state: LngLat | null = null;
  let variance = 0;
  let lastT = 0;
  return points.map((point) => {
    const measured = toMeters([point.lng, point.lat]);
    if (!state) {
      state = measured;
      variance = point.accuracy ** 2;
    } else {
      const seconds = Math.max((point.t - lastT) / 1000, 0);
      const predicted = variance + (WALK_NOISE_MPS * seconds) ** 2;
      const gain = predicted / (predicted + point.accuracy ** 2);
      state = [
        state[0] + gain * (measured[0] - state[0]),
        state[1] + gain * (measured[1] - state[1]),
      ];
      variance = (1 - gain) * predicted;
    }
    lastT = point.t;
    const [lng, lat] = toLngLat(state);
    return { ...point, lng, lat, accuracy: Math.sqrt(variance) };
  });
}

type Segment = [LngLat, LngLat];

/** 線（通路）を線分に分ける。経緯度のまま持ち、比べるときに m に直す。 */
export function toSegments(lines: LngLat[][]): Segment[] {
  return lines.flatMap((line) =>
    line.slice(1).map((end, i): Segment => [line[i] ?? end, end]),
  );
}

function nearestOnSegment(point: LngLat, [a, b]: Segment): LngLat {
  const [px, py] = toMeters(point);
  const [ax, ay] = toMeters(a);
  const [bx, by] = toMeters(b);
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const ratio =
    length === 0
      ? 0
      : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / length));
  return toLngLat([ax + ratio * dx, ay + ratio * dy]);
}

// 道に寄せるのは、この距離までにある道だけにする。屋内や広場では道から離れているのが正しい。
const MAX_SNAP_M = 20;

/** 各点を、誤差の範囲（最大 20m）にあるいちばん近い道の上へ寄せる。範囲に道が無い点は動かさない。 */
export function snapToPaths(
  points: CrowdPoint[],
  segments: Segment[],
): CrowdPoint[] {
  return points.map((point) => {
    const at: LngLat = [point.lng, point.lat];
    const limit = Math.min(point.accuracy, MAX_SNAP_M);
    let best: LngLat | null = null;
    let bestDistance = limit;
    for (const segment of segments) {
      const candidate = nearestOnSegment(at, segment);
      const d = distance(at, candidate);
      if (d <= bestDistance) {
        best = candidate;
        bestDistance = d;
      }
    }
    return best ? { ...point, lng: best[0], lat: best[1] } : point;
  });
}

/** 端末ごとの位置の並び（時刻順）。 */
export type Tracks = Map<string, CrowdPoint[]>;

/** 位置を端末ごとに分け、それぞれ時刻順に並べる。同じ時刻の重複（区切りの継ぎ目）は1つにする。 */
export function groupTracks(points: CrowdPoint[]): Tracks {
  const tracks: Tracks = new Map();
  for (const point of points) {
    const track = tracks.get(point.device) ?? [];
    track.push(point);
    tracks.set(point.device, track);
  }
  for (const [device, track] of tracks) {
    track.sort((a, b) => a.t - b.t);
    tracks.set(
      device,
      track.filter((point, i) => point.t !== track[i - 1]?.t),
    );
  }
  return tracks;
}

/** 時刻 t 以前の最後の点の位置（無ければ -1）。 */
function lastIndexAtOrBefore(track: CrowdPoint[], t: number): number {
  let low = 0;
  let high = track.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if ((track[mid]?.t ?? 0) <= t) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return found;
}

/**
 * 時刻 t の位置。前後の点の間なら線で結んだ上の位置にし、点が `maxGap` より空いている間と、
 * 最後の点から `maxGap` を過ぎた後は、その端末を出さない（送信が止まった端末を残さない）。
 */
export function positionAt(
  track: CrowdPoint[],
  t: number,
  maxGap: number,
): CrowdPoint | null {
  const i = lastIndexAtOrBefore(track, t);
  const before = track[i];
  if (!before || t - before.t > maxGap) return null;
  const after = track[i + 1];
  if (!after || after.t - before.t > maxGap) return { ...before, t };
  const ratio = (t - before.t) / (after.t - before.t);
  return {
    ...before,
    t,
    lat: before.lat + (after.lat - before.lat) * ratio,
    lng: before.lng + (after.lng - before.lng) * ratio,
    accuracy: before.accuracy + (after.accuracy - before.accuracy) * ratio,
  };
}

/** 時刻 t の全端末の位置と、直前 tail ミリ秒の軌跡（今の位置まで、端末ごと時刻順）。 */
export function frameAt(
  tracks: Tracks,
  t: number,
  tail: number,
  maxGap: number,
): { points: CrowdPoint[]; tails: CrowdPoint[] } {
  const points: CrowdPoint[] = [];
  const tails: CrowdPoint[] = [];
  for (const track of tracks.values()) {
    const head = positionAt(track, t, maxGap);
    if (!head) continue;
    points.push(head);
    const end = lastIndexAtOrBefore(track, t);
    const start = Math.max(0, lastIndexAtOrBefore(track, t - tail) + 1);
    tails.push(...track.slice(start, end + 1), head);
  }
  return { points, tails };
}

/** 端末ごとに見分けやすい色。同じ端末はいつも同じ色にする。 */
export function deviceHue(device: string): number {
  return Number.parseInt(device.slice(0, 6), 16) % 360;
}
