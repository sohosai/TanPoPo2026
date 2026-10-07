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
