import { useState } from 'react';
import HeadcountStep from '~/components/features/Questionnaire/HeadcountStep';
import SurveyForm from '~/components/features/Questionnaire/SurveyForm';
import TicketList from '~/components/features/Questionnaire/TicketList';
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
    ? [{ title: '来場者アンケート | 雙峰祭 企画検索システム' }]
    : statusPageMeta('来場者アンケートは準備中です');

// links は loaderData を受け取れないため、準備中の案内のフォントは常に読む。
export const links: Route.LinksFunction = () => statusPageLinks;

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
      onComplete={(responses) => submit.mutate({ headcount, responses })}
    />
  );
}

export default function QuestionnaireRoute({
  loaderData,
}: Route.ComponentProps) {
  return loaderData.lineLoginEnabled ? (
    <QuestionnairePage />
  ) : (
    <ComingSoonPage title="来場者アンケート" />
  );
}

function QuestionnairePage() {
  return (
    <EventPageShell title="来場者アンケート" redirectPath="/questionnaire">
      <QuestionnaireContent />
    </EventPageShell>
  );
}
