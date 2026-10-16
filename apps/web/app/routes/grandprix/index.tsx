import { useState } from 'react';
import GrandprixForm from '~/components/features/Grandprix/GrandprixForm';
import GrandprixResult from '~/components/features/Grandprix/GrandprixResult';
import EventPageShell from '~/components/layouts/EventPageShell/EventPageShell';
import {
  ComingSoonPage,
  statusPageLinks,
  statusPageMeta,
} from '~/components/layouts/StatusPage/StatusPage';
import { LINE_LOGIN_ENABLED } from '~/lib/auth';
import { trpc } from '~/lib/trpc';
import { css } from '../../../styled-system/css';
import type { Route } from './+types/index';

// LINE ログインを無効にしたビルド（雙峰祭の当日まで）では、準備中の案内を出す。
export const meta: Route.MetaFunction = () =>
  LINE_LOGIN_ENABLED
    ? [{ title: '雙峰祭グランプリ | 雙峰祭 企画検索システム' }]
    : statusPageMeta('雙峰祭グランプリ投票は準備中です');

export const links: Route.LinksFunction = () =>
  LINE_LOGIN_ENABLED ? [] : statusPageLinks;

function GrandprixContent() {
  const { data: status, status: queryStatus } =
    trpc.grandprix.status.useQuery();
  const [localResult, setLocalResult] = useState<'win' | 'lose' | null>(null);

  if (queryStatus === 'pending') {
    return (
      <p
        className={css({ p: '24px', textAlign: 'center', color: 'fg.subtle' })}
      >
        読み込み中...
      </p>
    );
  }

  const result = localResult ?? status?.result ?? null;
  const hasVoted = status?.hasVoted || localResult !== null;

  if (hasVoted) {
    // 投票直後（localResultがある）のときだけ抽選演出を再生する。
    // 既に結果が出ている状態での再訪問では、待たせずに即結果を表示する。
    return <GrandprixResult result={result} animate={localResult !== null} />;
  }

  return <GrandprixForm onSubmitted={(r) => setLocalResult(r)} />;
}

export default function GrandprixRoute() {
  return LINE_LOGIN_ENABLED ? (
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
