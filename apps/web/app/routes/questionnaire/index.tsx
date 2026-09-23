import { useState } from 'react';
import HeadcountStep from '~/components/features/Questionnaire/HeadcountStep';
import SurveyForm from '~/components/features/Questionnaire/SurveyForm';
import TicketList from '~/components/features/Questionnaire/TicketList';
import EventPageShell from '~/components/layouts/EventPageShell/EventPageShell';
import { trpc } from '~/lib/trcp';
import { css } from '../../../styled-system/css';

type Answers = Record<string, string>;

function QuestionnaireContent() {
  const {
    data: tickets,
    status: ticketsStatus,
    refetch: refetchTickets,
  } = trpc.questionnaire.myTickets.useQuery();
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
    return <TicketList tickets={tickets ?? []} onChanged={refetchTickets} />;
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
    <EventPageShell title="来場者アンケート" redirectPath="/questionnaire">
      <QuestionnaireContent />
    </EventPageShell>
  );
}
