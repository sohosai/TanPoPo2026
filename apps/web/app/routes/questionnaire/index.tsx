import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import RequireLineLogin from '~/components/features/Auth/RequireLineLogin';
import HeadcountStep from '~/components/features/Questionnaire/HeadcountStep';
import SurveyForm from '~/components/features/Questionnaire/SurveyForm';
import TicketList from '~/components/features/Questionnaire/TicketList';
import { trpc } from '~/lib/trcp';
import { css } from '../../../styled-system/css';

type Answers = Record<string, string>;

function QuestionnaireContent() {
  const { data: tickets, status: ticketsStatus } =
    trpc.questionnaire.myTickets.useQuery();
  const utils = trpc.useUtils();
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const submit = trpc.questionnaire.submit.useMutation({
    onSuccess: async () => {
      setJustSubmitted(true);
      await utils.questionnaire.myTickets.invalidate();
    },
  });

  if (ticketsStatus === 'pending') {
    return (
      <p
        className={css({ p: '24px', textAlign: 'center', color: 'fg.subtle' })}
      >
        読み込み中...
      </p>
    );
  }

  const hasTickets = (tickets?.length ?? 0) > 0 || justSubmitted;

  if (hasTickets) {
    return <TicketList />;
  }

  if (headcount === null) {
    return <HeadcountStep onConfirm={setHeadcount} />;
  }

  return (
    <SurveyForm
      headcount={headcount}
      submitting={submit.isPending}
      errorMessage={
        submit.isError
          ? submit.error.message ||
            '送信に失敗しました。もう一度お試しください。'
          : undefined
      }
      onComplete={(responses: Answers[]) =>
        submit.mutate({ headcount, responses })
      }
    />
  );
}

export default function QuestionnairePage() {
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
          来場者アンケート
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

      <RequireLineLogin redirectPath="/questionnaire">
        <QuestionnaireContent />
      </RequireLineLogin>
    </div>
  );
}
