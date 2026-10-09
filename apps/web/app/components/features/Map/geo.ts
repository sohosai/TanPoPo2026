/** 地図上の位置 [経度, 緯度]（GeoJSON と同じ順）。 */
export type LngLat = [number, number];

/** 多角形の外周の頂点の平均（簡易的な中心）。閉じた外周の終点（始点の重複）は数えない。 */
export function ringCenter(ring: LngLat[]): LngLat {
  const [first, last] = [ring[0], ring[ring.length - 1]];
  const points =
    first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
  const [x, y] = points.reduce(
    ([sx, sy], [px, py]) => [sx + px, sy + py],
    [0, 0],
  );
  return [x / points.length, y / points.length];
}

/** 点が多角形の外周の内側にあるか（交差数判定）。 */
export function ringContains(ring: LngLat[], [x, y]: LngLat): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** リングを囲む南西・北東の座標。 */
export function ringBounds(ring: LngLat[]): [LngLat, LngLat] {
  const lngs = ring.map(([lng]) => lng);
  const lats = ring.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/**
 * 閉じた外周を外側へ meters（m）だけ広げる。角は辺を平行にずらした線の交点にする。
 * 建物 1 棟ほどの大きさなら、経緯度を平面とみなしても誤差は無視できる。
 */
export function offsetRing(ring: LngLat[], meters: number): LngLat[] {
  const mx = 111_320 * Math.cos((ring[0][1] * Math.PI) / 180);
  const my = 110_574;
  const points = ring.slice(0, -1).map(([x, y]) => [x * mx, y * my]);
  const count = points.length;
  // 頂点の並びが反時計回りなら進行方向の右手が外側。時計回りなら逆になる。
  const area = points.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % count];
    return sum + x1 * y2 - x2 * y1;
  }, 0);
  const side = Math.sign(area);
  const outward = ([x1, y1]: number[], [x2, y2]: number[]) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    return [(side * (y2 - y1)) / length, (side * (x1 - x2)) / length];
  };
  const moved = points.map((point, i) => {
    const [ax, ay] = outward(points[(i - 1 + count) % count], point);
    const [bx, by] = outward(point, points[(i + 1) % count]);
    const [sx, sy] = [ax + bx, ay + by];
    const length = Math.hypot(sx, sy);
    // 鋭い角では交点が遠くへ飛ぶため、ずらす量を辺のずらし幅の 2 倍までに抑える。
    const cos = Math.max((sx * ax + sy * ay) / length, 0.5);
    const scale = meters / cos / length;
    return [
      (point[0] + sx * scale) / mx,
      (point[1] + sy * scale) / my,
    ] as LngLat;
  });
  return [...moved, moved[0]];
}
