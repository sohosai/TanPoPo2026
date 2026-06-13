import {
  IconAlertTriangle,
  IconHeartOff,
  IconLoader2,
  IconSearchOff,
  type TablerIcon,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { css } from '../../../styled-system/css';
import {
  criteriaFromParams,
  criteriaToParams,
  filterShops,
  type ShopFilterCriteria,
} from '~/components/features/Shop/filter';
import ShopListItem from '~/components/features/Shop/ShopListItem';
import ShopSearchBar from '~/components/features/Shop/ShopSearchBar';
import { useFavorites } from '~/lib/favorites';
import { trpc } from '~/lib/trcp';

/** 読み込み中・エラー・該当なしなどの全画面状態を表す共通表示。 */
function StateMessage({
  icon: Icon,
  title,
  description,
  spinning = false,
}: {
  icon: TablerIcon;
  title: string;
  description?: string;
  spinning?: boolean;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        px: '24px',
        py: '56px',
        textAlign: 'center',
      })}
    >
      <span
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '999px',
          bg: 'accent.subtle',
          color: 'accent',
        })}
      >
        <Icon
          size={30}
          stroke={1.8}
          className={
            spinning ? css({ animation: 'spin 1s linear infinite' }) : undefined
          }
        />
      </span>
      <p
        className={css({
          fontSize: '15px',
          fontWeight: 'bold',
          color: 'fg',
        })}
      >
        {title}
      </p>
      {description && (
        <p
          className={css({
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'fg.subtle',
            whiteSpace: 'pre-line',
          })}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default function List() {
  const { data: shops, status, isError } = trpc.shop.list.useQuery();
  const { favorites, isFavorite, toggle } = useFavorites();

  // 検索・絞り込み条件は URL クエリを唯一の状態源とする（共有/戻る操作に対応）。
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = useMemo(
    () => criteriaFromParams(searchParams),
    [searchParams],
  );

  const updateCriteria = (next: ShopFilterCriteria) => {
    // replace: true で履歴を汚さずにフィルタ操作を反映する。
    setSearchParams(criteriaToParams(next), { replace: true });
  };

  // 取得済みの全件に対してクライアント側でフィルタする（オフラインでも動く）。
  // お気に入り集合が変わると「いいねのみ」表示が即座に追従する。
  const visibleShops = useMemo(
    () => (shops ? filterShops(shops, criteria, favorites) : []),
    [shops, criteria, favorites],
  );

  return (
    <div>
      <ShopSearchBar criteria={criteria} onChange={updateCriteria} />

      {status === 'pending' && (
        <StateMessage icon={IconLoader2} title="読み込み中..." spinning />
      )}
      {isError && !shops && (
        <StateMessage
          icon={IconAlertTriangle}
          title="店舗一覧を取得できませんでした"
          description={'通信環境を確認して\nもう一度お試しください。'}
        />
      )}
      {shops &&
        visibleShops.length === 0 &&
        (criteria.favorite ? (
          <StateMessage
            icon={IconHeartOff}
            title="いいねした企画がありません"
            description={
              'ハートを押してお気に入りに追加すると\nここに表示されます。'
            }
          />
        ) : (
          <StateMessage
            icon={IconSearchOff}
            title="企画が見つかりませんでした"
            description={
              'キーワードを変えるか、絞り込み条件を\nゆるめてもう一度お試しください。'
            }
          />
        ))}

      {visibleShops.map((shop) => (
        <ShopListItem
          key={shop.id}
          shop={shop}
          favorite={isFavorite(shop.id)}
          onToggleFavorite={toggle}
        />
      ))}
    </div>
  );
}
