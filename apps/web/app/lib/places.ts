import type { Place, Shop } from 'api';
import { useMemo } from 'react';
import { trpc } from '~/lib/trcp';

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
    /** id から Place を取得 */
    getPlace: (id: string) => byId.get(id),
    /** 店舗の代表的な場所ラベル（建物名＋部屋番号、例 "5C305"） */
    formatShopLocation: (shop: Shop) => formatShopLocation(shop, byId),
  };
}

/** 場所＋部屋番号を表示ラベルに整形する（建物名 + 部屋。部屋が無ければ場所名のみ）。 */
export function formatLocation(
  place: Place | undefined,
  room?: string,
): string {
  if (!place) return '';
  return room ? `${place.name}${room}` : place.name;
}

/** 店舗の先頭の場所を表示ラベルに整形する。 */
export function formatShopLocation(
  shop: Shop,
  byId: ReadonlyMap<string, Place>,
): string {
  const primary = shop.locations[0];
  if (!primary) return '';
  return formatLocation(byId.get(primary.placeId), primary.room);
}
