import ShopListItem from '~/components/features/Shop/ShopListItem';
import { trpc } from '~/lib/trcp';

export default function List() {
  const { data: shops, status, isError } = trpc.shop.list.useQuery();

  if (status === 'pending') {
    return <p>読み込み中...</p>;
  }

  if (isError && !shops) {
    return <p>店舗一覧を取得できませんでした。</p>;
  }

  return (
    <div>
      {shops?.map((shop) => (
        <ShopListItem key={shop.id} shop={shop} />
      ))}
    </div>
  );
}
