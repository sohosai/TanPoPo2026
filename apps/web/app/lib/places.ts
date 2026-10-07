import type { Place, Shop, ShopLocation } from 'api';
import { useMemo } from 'react';
import { trpc } from '~/lib/trpc';

/**
 * 場所（Place）の参照ユーティリティ。
 * place.list を取得して id 引きの Map を作り、店舗の場所ラベル整形などを提供する。
 * 既存の react-query 永続キャッシュに乗るのでオフラインでも参照できる。
 */
export function usePlaces() {
  const { data: places } = trpc.place.list.useQuery();

  const byId = useMemo(() => {
    const map = new Map<string, Place>();
    for (const place of places ?? []) map.set(place.id, place);
    return map;
  }, [places]);

  return {
    /** 全 Place（未取得時は空配列） */
    places: places ?? [],
    /** id から Place を引く Map */
    byId,
    /** 店舗の代表的な場所ラベル（例 "5C305"、複数あれば "1B208 ほか1か所"） */
    formatShopLocation: (shop: Shop) => formatShopLocation(shop, byId),
  };
}

/**
 * 場所＋場所内の位置を表示ラベルに整形する。
 * 部屋番号は続けて（"1B208"）、部屋名は空白を挟む（"6A エントランスホール"）。屋外ブースは場所名だけ（"石の広場周辺"）。
 */
export function formatLocation(
  place: Place | undefined,
  room?: string,
): string {
  if (!place) return '';
  // 屋外のブース番号は配置用の内部的な番号なので、利用者には見せない。
  if (!room || place.kind === 'outdoor') return place.name;
  return /^\d/.test(room) ? `${place.name}${room}` : `${place.name} ${room}`;
}

/** 店舗の先頭の場所を表示ラベルに整形する。場所が複数あれば残りの数を添える。 */
export function formatShopLocation(
  shop: Shop,
  byId: ReadonlyMap<string, Place>,
): string {
  const [primary, ...rest] = shop.locations;
  if (!primary) return '';
  const label = formatLocation(byId.get(primary.placeId), primary.room);
  return rest.length > 0 ? `${label} ほか${rest.length}か所` : label;
}

/** ある場所で実施する企画と、その場所での位置。 */
export type PlaceEntry = { shop: Shop; location: ShopLocation };

/** placeId ごとに、その場所で実施する企画をまとめる。 */
export function groupShopsByPlace(shops: Shop[]): Map<string, PlaceEntry[]> {
  const map = new Map<string, PlaceEntry[]>();
  for (const shop of shops) {
    for (const location of shop.locations) {
      const entries = map.get(location.placeId);
      if (entries) entries.push({ shop, location });
      else map.set(location.placeId, [{ shop, location }]);
    }
  }
  return map;
}

/** 企画の数。同じ企画が同じ場所の複数の部屋・ブースにまたがっても1件と数える。 */
export const countShops = (entries: PlaceEntry[]) =>
  new Set(entries.map(({ shop }) => shop.id)).size;

/** 部屋番号・ブース番号を数字の大小で並べるための比較関数。 */
export const compareRoom = (a = '', b = '') =>
  a.localeCompare(b, 'ja', { numeric: true });
