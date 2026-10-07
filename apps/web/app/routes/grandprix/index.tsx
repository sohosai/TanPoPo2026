import { useState } from 'react';
import GrandprixForm from '~/components/features/Grandprix/GrandprixForm';
import GrandprixResult from '~/components/features/Grandprix/GrandprixResult';
import EventPageShell from '~/components/layouts/EventPageShell/EventPageShell';
import { trpc } from '~/lib/trpc';
import { css } from '../../../styled-system/css';

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

export default function GrandprixPage() {
  return (
    <EventPageShell title="雙峰祭グランプリ投票" redirectPath="/grandprix">
      <GrandprixContent />
    </EventPageShell>
  );
}
