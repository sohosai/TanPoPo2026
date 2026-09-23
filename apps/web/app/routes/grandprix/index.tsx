import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import RequireLineLogin from '~/components/features/Auth/RequireLineLogin';
import GrandprixForm from '~/components/features/Grandprix/GrandprixForm';
import GrandprixResult from '~/components/features/Grandprix/GrandprixResult';
import { trpc } from '~/lib/trcp';
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
    <div
      className={css({
        height: '100%',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        bg: 'surface',
      })}
    >
      <header
        className={css({
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '16px',
          py: '14px',
          bg: 'sheet.background',
          borderBottom: '1px solid token(colors.border.subtle)',
        })}
      >
        <h1
          className={css({
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'fg.strong',
          })}
        >
          雙峰祭グランプリ投票
        </h1>
        <Link
          to="/"
          aria-label="閉じる"
          className={css({
            display: 'flex',
            alignItems: 'center',
            color: 'fg.subtle',
          })}
        >
          <IconX size={22} />
        </Link>
      </header>

      <RequireLineLogin redirectPath="/grandprix">
        <GrandprixContent />
      </RequireLineLogin>
    </div>
  );
}
