import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrowdPoint } from 'api';
import {
  distance,
  frameAt,
  groupTracks,
  positionAt,
  removeOutliers,
  smooth,
  snapToPaths,
  toSegments,
} from './track';

const point = (t: number, lng: number, lat: number, accuracy = 5) =>
  ({ device: 'abc', t: t * 1000, lng, lat, accuracy }) satisfies CrowdPoint;

// 会場付近で東へ約 10m・北へ約 10m ずれる量。
const EAST_10M = 10 / (111_320 * Math.cos((36.106 * Math.PI) / 180));
const NORTH_10M = 10 / 111_320;
const ORIGIN: [number, number] = [140.1, 36.106];

describe('removeOutliers', () => {
  it('人が動ける速さの点は残し、跳んだ点だけを除く', () => {
    const walk = [
      point(0, ORIGIN[0], ORIGIN[1]),
      point(10, ORIGIN[0] + EAST_10M, ORIGIN[1]),
      // 5秒で 500m 先は跳び。
      point(15, ORIGIN[0] + EAST_10M * 50, ORIGIN[1]),
      point(20, ORIGIN[0] + EAST_10M * 2, ORIGIN[1]),
    ];
    assert.deepEqual(
      removeOutliers(walk).map(({ t }) => t),
      [0, 10_000, 20_000],
    );
  });
});

describe('smooth', () => {
  it('誤差の大きい点ほど、前の位置からあまり動かさない', () => {
    const [, precise] = smooth([
      point(0, ORIGIN[0], ORIGIN[1]),
      point(5, ORIGIN[0] + EAST_10M, ORIGIN[1], 3),
    ]);
    const [, rough] = smooth([
      point(0, ORIGIN[0], ORIGIN[1]),
      point(5, ORIGIN[0] + EAST_10M, ORIGIN[1], 50),
    ]);
    assert.ok(precise && rough);
    const moved = (p: CrowdPoint) => distance(ORIGIN, [p.lng, p.lat]);
    assert.ok(moved(precise) > moved(rough));
    assert.ok(moved(precise) <= 10.01);
  });
});

describe('snapToPaths', () => {
  const path = toSegments([
    [
      [ORIGIN[0] - EAST_10M * 5, ORIGIN[1]],
      [ORIGIN[0] + EAST_10M * 5, ORIGIN[1]],
    ],
  ]);

  it('誤差の範囲にある道の上へ寄せる', () => {
    const [snapped] = snapToPaths(
      [point(0, ORIGIN[0], ORIGIN[1] + NORTH_10M, 15)],
      path,
    );
    assert.ok(snapped);
    assert.ok(distance(ORIGIN, [snapped.lng, snapped.lat]) < 0.01);
  });

  it('誤差より遠い道には寄せない', () => {
    const far = point(0, ORIGIN[0], ORIGIN[1] + NORTH_10M, 5);
    assert.deepEqual(snapToPaths([far], path), [far]);
  });
});

describe('positionAt', () => {
  const track = [
    point(0, ORIGIN[0], ORIGIN[1]),
    point(10, ORIGIN[0] + EAST_10M, ORIGIN[1]),
    point(200, ORIGIN[0] + EAST_10M * 2, ORIGIN[1]),
  ];

  it('前後の点の間は、線で結んだ上の位置にする', () => {
    const at = positionAt(track, 5_000, 60_000);
    assert.ok(at);
    assert.ok(Math.abs(distance(ORIGIN, [at.lng, at.lat]) - 5) < 0.01);
  });

  it('点が空いている間と、最後の点から間が空いた後は出さない', () => {
    assert.equal(positionAt(track, 100_000, 60_000), null);
    assert.equal(positionAt(track, 300_000, 60_000), null);
    assert.equal(positionAt(track, -1, 60_000), null);
  });
});

describe('frameAt', () => {
  it('端末ごとに今の位置と、直前の軌跡を返す', () => {
    const tracks = groupTracks([
      point(10, ORIGIN[0] + EAST_10M, ORIGIN[1]),
      point(0, ORIGIN[0], ORIGIN[1]),
      point(0, ORIGIN[0], ORIGIN[1]),
      { ...point(0, ORIGIN[0], ORIGIN[1]), device: 'def' },
    ]);
    const { points, tails } = frameAt(tracks, 5_000, 60_000, 60_000);
    assert.equal(points.length, 2);
    assert.deepEqual(
      tails.filter(({ device }) => device === 'abc').map(({ t }) => t),
      [0, 5_000],
    );
  });
});
