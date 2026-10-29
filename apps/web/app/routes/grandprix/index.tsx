import { useState } from 'react';
import GrandprixForm from '~/components/features/Grandprix/GrandprixForm';
import GrandprixResult from '~/components/features/Grandprix/GrandprixResult';
import EventPageShell from '~/components/layouts/EventPageShell/EventPageShell';
import {
  ComingSoonPage,
  statusPageLinks,
  statusPageMeta,
} from '~/components/layouts/StatusPage/StatusPage';
import { fetchLineLoginEnabled } from '~/lib/auth';
import { trpc } from '~/lib/trpc';
import { css } from '../../../styled-system/css';
import type { Route } from './+types/index';

export const clientLoader = async () => ({
  lineLoginEnabled: await fetchLineLoginEnabled(),
});

// LINE ログインをサーバーで無効にしている間（雙峰祭の当日まで）は、準備中の案内を出す。
export const meta: Route.MetaFunction = ({ loaderData }) =>
  loaderData?.lineLoginEnabled
    ? [{ title: '雙峰祭グランプリ | 雙峰祭 企画検索システム' }]
    : statusPageMeta('雙峰祭グランプリ投票は準備中です');

// links は loaderData を受け取れないため、準備中の案内のフォントは常に読む。
export const links: Route.LinksFunction = () => statusPageLinks;

function GrandprixContent() {
  const { data: status, status: queryStatus } =
    trpc.grandprix.status.useQuery();
  const utils = trpc.useUtils();
  const [localDraw, setLocalDraw] = useState<{
    result: 'win' | 'lose';
    drawnAt: string;
  } | null>(null);

  // localDraw はページを離れると消えるため、キャッシュも投票済みにしておかないと
  // staleTime の間に戻ったとき投票フォームが再び出る。
  const handleSubmitted = (draw: {
    result: 'win' | 'lose';
    drawnAt: string;
  }) => {
    setLocalDraw(draw);
    utils.grandprix.status.setData(undefined, { hasVoted: true, ...draw });
  };

  if (queryStatus === 'pending') {
    return (
      <p
        className={css({ p: '24px', textAlign: 'center', color: 'fg.subtle' })}
      >
        読み込み中...
      </p>
    );
  }

  const draw = localDraw ?? status;
  const hasVoted = status?.hasVoted || localDraw !== null;

  if (hasVoted) {
    // 投票直後（localDrawがある）のときだけ抽選演出を再生する。
    // 既に結果が出ている状態での再訪問では、待たせずに即結果を表示する。
    return (
      <GrandprixResult
        result={draw?.result ?? null}
        drawnAt={draw?.drawnAt ?? null}
        animate={localDraw !== null}
      />
    );
  }

  return <GrandprixForm onSubmitted={handleSubmitted} />;
}

export default function GrandprixRoute({ loaderData }: Route.ComponentProps) {
  return loaderData.lineLoginEnabled ? (
    <GrandprixPage />
  ) : (
    <ComingSoonPage title="グランプリ投票" />
  );
}

function GrandprixPage() {
  return (
    <EventPageShell title="雙峰祭グランプリ投票" redirectPath="/grandprix">
      <GrandprixContent />
    </EventPageShell>
  );
}
