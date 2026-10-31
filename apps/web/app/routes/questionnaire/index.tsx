import { useState } from 'react';
import { useLocation } from 'react-router';
import HeadcountStep from '~/components/features/Questionnaire/HeadcountStep';
import type { Lang } from '~/components/features/Questionnaire/questions';
import SurveyForm from '~/components/features/Questionnaire/SurveyForm';
import TicketList from '~/components/features/Questionnaire/TicketList';
import EventPageShell from '~/components/layouts/EventPageShell/EventPageShell';
import {
  OutOfHoursPage,
  statusPageLinks,
  statusPageMeta,
} from '~/components/layouts/StatusPage/StatusPage';
import { fetchFeatureEnabled } from '~/lib/auth';
import { trpc } from '~/lib/trpc';
import { css } from '../../../styled-system/css';
import type { Route } from './+types/index';

export const clientLoader = async () => ({
  enabled: await fetchFeatureEnabled('questionnaire'),
});

// サーバーで受付を止めている間は、時間外の案内を出す。
export const meta: Route.MetaFunction = ({ loaderData }) =>
  loaderData?.enabled
    ? [{ title: '来場者アンケート | 雙峰祭 企画検索システム' }]
    : statusPageMeta('来場者アンケートは受付時間外です');

// links は loaderData を受け取れないため、時間外の案内のフォントは常に読む。
export const links: Route.LinksFunction = () => statusPageLinks;

function QuestionnaireContent() {
  const {
    data: tickets,
    status: ticketsStatus,
    refetch: refetchTickets,
  } = trpc.questionnaire.myTickets.useQuery();
  const utils = trpc.useUtils();
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>('ja');
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

  return (
    <>
      <LanguageToggle lang={lang} onChange={setLang} />
      {headcount === null ? (
        <HeadcountStep lang={lang} onConfirm={setHeadcount} />
      ) : (
        <SurveyForm
          headcount={headcount}
          lang={lang}
          submitting={submit.isPending}
          errorMessage={
            submit.isError
              ? submit.error.message ||
                '送信に失敗しました。もう一度お試しください。'
              : undefined
          }
          onComplete={(responses) => submit.mutate({ headcount, responses })}
        />
      )}
    </>
  );
}

const LANG_LABELS: Record<Lang, string> = { ja: '日本語', en: 'English' };

function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '4px',
        px: '16px',
        pt: '12px',
      })}
    >
      {(Object.keys(LANG_LABELS) as Lang[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={lang === key}
          onClick={() => onChange(key)}
          className={css({
            px: '12px',
            py: '4px',
            borderRadius: 'full',
            border: 'token(borderWidths.thin) solid',
            borderColor: lang === key ? 'accent' : 'border',
            bg: lang === key ? 'accent' : 'surface',
            color: lang === key ? 'surface' : 'fg.muted',
            fontSize: 'sm',
            cursor: 'pointer',
          })}
        >
          {LANG_LABELS[key]}
        </button>
      ))}
    </div>
  );
}

export default function QuestionnaireRoute({
  loaderData,
}: Route.ComponentProps) {
  return loaderData.enabled ? (
    <QuestionnairePage />
  ) : (
    <OutOfHoursPage title="来場者アンケート" />
  );
}

function QuestionnairePage() {
  // /questionnaire と /q のどちらから来ても、ログイン後は開いた URL に戻す。
  const { pathname } = useLocation();
  return (
    <EventPageShell
      title="来場者アンケート"
      redirectPath={pathname}
      loginPrompt={{
        preview: (
          <>
            <LanguageToggle lang="ja" onChange={() => {}} />
            <HeadcountStep lang="ja" onConfirm={() => {}} />
          </>
        ),
        title: 'ログインしてアンケートに回答',
        steps: [
          'アンケートに回答（同伴者の分もまとめて回答できます）',
          '福引券を受け取り、福引所で抽選に参加',
        ],
      }}
    >
      <QuestionnaireContent />
    </EventPageShell>
  );
}
