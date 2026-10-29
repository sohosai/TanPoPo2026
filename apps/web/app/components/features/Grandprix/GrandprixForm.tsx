import type { GrandprixStage, MaxGeneralVotes, Project } from 'api';
import { useEffect, useRef, useState } from 'react';
import {
  emptyCriteria,
  type ProjectFilterCriteria,
} from '~/components/features/Project/criteria';
import ProjectSearchBar from '~/components/features/Project/ProjectSearchBar';
import { useFilteredProjects } from '~/components/features/Project/useFilteredProjects';
import { usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../../styled-system/css';
import ProjectVoteRow from './ProjectVoteRow';
import SelectedChips from './SelectedChips';
import StageTabs, { STAGE_LABELS } from './StageTabs';
import StepCard, { ChoiceButton } from './StepCard';
import StepNav from './StepNav';
import StepProgress from './StepProgress';
import { contentWidth, emptyMessageClass } from './styles';
import VoteSummary from './VoteSummary';

const MAX_GENERAL_VOTES: MaxGeneralVotes = 4;

const STEPS = ['student', 'general', 'stage', 'confirm'] as const;
type Step = (typeof STEPS)[number];
const STEP_LABELS = ['学生かどうか', '一般部門', 'ステージ部門', '確認'];

type StageVotes = Partial<Record<GrandprixStage, string>>;
type StageGroup = { stage: GrandprixStage; projects: Project[] };

/** 各手順の下部ボタンの動き。確認画面の「変更」から来たときは、次へで確認画面へ戻る。 */
type NavProps = {
  onNext: () => void;
  onBack?: () => void;
  returnsToConfirm: boolean;
};

type GrandprixFormProps = {
  onSubmitted: (draw: { result: 'win' | 'lose'; drawnAt: string }) => void;
};

export default function GrandprixForm({ onSubmitted }: GrandprixFormProps) {
  const { data: generalProjects } = trpc.grandprix.generalProjects.useQuery();
  const { data: stageProjects } = trpc.grandprix.stageProjects.useQuery();

  const [step, setStep] = useState<Step>('student');
  const [returnsToConfirm, setReturnsToConfirm] = useState(false);

  const [isTsukubaStudent, setIsTsukubaStudent] = useState<boolean | null>(
    null,
  );
  const [generalIds, setGeneralIds] = useState<string[]>([]);
  // ステージごとに1企画まで。
  const [stageVotes, setStageVotes] = useState<StageVotes>({});

  const submit = trpc.grandprix.submit.useMutation({
    onSuccess: onSubmitted,
  });

  // 手順はページ内で切り替えるため、前の手順のスクロール位置が残らないよう先頭へ戻す。
  const rootRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 手順が変わったときだけ動かす
  useEffect(() => {
    rootRef.current
      ?.closest('[data-event-scroll]')
      ?.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  const stepIndex = STEPS.indexOf(step);
  const nav: NavProps = {
    returnsToConfirm,
    onNext: () => {
      setReturnsToConfirm(false);
      setStep(
        returnsToConfirm ? 'confirm' : (STEPS[stepIndex + 1] ?? 'confirm'),
      );
    },
    onBack:
      stepIndex > 0
        ? () => {
            setReturnsToConfirm(false);
            setStep(STEPS[stepIndex - 1] ?? 'student');
          }
        : undefined,
  };

  const generalById = new Map(generalProjects?.map((p) => [p.id, p]));
  const selectedGeneral = generalIds.flatMap((id) => {
    const project = generalById.get(id);
    return project ? [project] : [];
  });
  const selectedStage = selectedStageProjects(stageProjects, stageVotes);

  return (
    <div ref={rootRef} className={formRootClass}>
      <div className={formBodyClass}>
        <StepProgress labels={STEP_LABELS} current={stepIndex} />

        {step === 'student' && (
          <StudentStep
            value={isTsukubaStudent}
            onChange={(value) => {
              setIsTsukubaStudent(value);
              nav.onNext();
            }}
            nav={nav}
          />
        )}
        {step === 'general' && (
          <GeneralStep
            projects={generalProjects}
            selectedIds={generalIds}
            selectedProjects={selectedGeneral}
            onChange={setGeneralIds}
            nav={nav}
          />
        )}
        {step === 'stage' && (
          <StageStep
            groups={stageProjects}
            votes={stageVotes}
            selected={selectedStage}
            onChange={setStageVotes}
            nav={nav}
          />
        )}
        {step === 'confirm' && isTsukubaStudent !== null && (
          <>
            <StepCard
              title="投票内容の確認"
              description="投票は1回だけです。送信したあとは変更できません。"
            >
              <VoteSummary
                isTsukubaStudent={isTsukubaStudent}
                generalProjects={selectedGeneral.map((project) => ({
                  project,
                }))}
                stageProjects={selectedStage.map(({ stage, project }) => ({
                  project,
                  prefix: STAGE_LABELS[stage],
                }))}
                onEdit={(target) => {
                  setReturnsToConfirm(true);
                  setStep(target);
                }}
              />
            </StepCard>
            {submit.isError && (
              <p
                className={css({
                  px: '4px',
                  color: 'favorite.text',
                  fontSize: 'sm',
                })}
              >
                {submit.error.message ||
                  '送信に失敗しました。もう一度お試しください。'}
              </p>
            )}
            <StepNav
              nextLabel={submit.isPending ? '送信中...' : 'この内容で投票する'}
              nextDisabled={submit.isPending}
              onNext={() =>
                submit.mutate({
                  generalProjectIds: generalIds,
                  stageProjectIds: selectedStage.map(
                    ({ project }) => project.id,
                  ),
                  isTsukubaStudent,
                })
              }
              onBack={nav.onBack}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** 一覧から消えた企画（非表示にされたなど）への票は送らない。 */
function selectedStageProjects(
  groups: StageGroup[] | undefined,
  votes: StageVotes,
) {
  return (groups ?? []).flatMap(({ stage, projects }) => {
    const project = projects.find((p) => p.id === votes[stage]);
    return project ? [{ stage, project }] : [];
  });
}

const formRootClass = css({
  minH: '100%',
  bg: 'surface',
  pb: 'calc(150px + env(safe-area-inset-bottom, 0px))',
});
const formBodyClass = cx(
  contentWidth,
  css({
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    px: '12px',
    pt: '16px',
  }),
);

/** ログイン前の背景に見せる、投票フォームの最初の手順。 */
export function GrandprixFormPreview() {
  return (
    <div className={formRootClass}>
      <div className={formBodyClass}>
        <StepProgress labels={STEP_LABELS} current={0} />
        <StudentStep
          value={null}
          onChange={() => {}}
          nav={{ onNext: () => {}, returnsToConfirm: false }}
        />
      </div>
    </div>
  );
}

function StudentStep({
  value,
  onChange,
  nav,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
  nav: NavProps;
}) {
  return (
    <>
      <StepCard
        title="筑波大学の学生ですか？"
        description="投票すると、その場で抽選に参加できます。"
      >
        <div
          className={css({
            display: 'flex',
            gap: '8px',
            px: '16px',
            pb: '16px',
          })}
        >
          <ChoiceButton
            label="はい"
            active={value === true}
            onClick={() => onChange(true)}
          />
          <ChoiceButton
            label="いいえ"
            active={value === false}
            onClick={() => onChange(false)}
          />
        </div>
      </StepCard>
      <StepNav
        hint={value === null ? 'どちらかを選んでください' : undefined}
        nextLabel={nav.returnsToConfirm ? '確認へ戻る' : '次へ'}
        nextDisabled={value === null}
        onNext={nav.onNext}
        onBack={nav.onBack}
      />
    </>
  );
}

function GeneralStep({
  projects,
  selectedIds,
  selectedProjects,
  onChange,
  nav,
}: {
  projects: Project[] | undefined;
  selectedIds: string[];
  selectedProjects: Project[];
  onChange: (update: (prev: string[]) => string[]) => void;
  nav: NavProps;
}) {
  const { formatProjectLocation } = usePlaces();
  const [criteria, setCriteria] =
    useState<ProjectFilterCriteria>(emptyCriteria);
  const visibleProjects = useFilteredProjects(projects, criteria);

  const full = selectedIds.length >= MAX_GENERAL_VOTES;
  const toggle = (id: string) =>
    onChange((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= MAX_GENERAL_VOTES) return prev;
      return [...prev, id];
    });

  return (
    <>
      <StepCard
        title="一般部門"
        description={`気に入った企画を最大${MAX_GENERAL_VOTES}つまで選んでください。`}
        aside={<VoteCount count={selectedIds.length} />}
      >
        <SelectedChips
          emptyLabel="まだ選んでいません"
          chips={selectedProjects.map((project) => ({
            key: project.id,
            label: project.name,
            onRemove: () => toggle(project.id),
          }))}
        />
        <ProjectSearchBar
          criteria={criteria}
          onChange={setCriteria}
          count={visibleProjects.length}
          showSummary
        />
        {!projects && <p className={emptyMessageClass}>読み込み中...</p>}
        {projects && visibleProjects.length === 0 && (
          <p className={emptyMessageClass}>
            {criteria.favorite
              ? 'いいねした企画がありません'
              : '該当する企画が見つかりませんでした'}
          </p>
        )}
        {visibleProjects.map((project) => {
          const selected = selectedIds.includes(project.id);
          return (
            <ProjectVoteRow
              key={project.id}
              project={project}
              locationLabel={formatProjectLocation(project)}
              selected={selected}
              disabled={!selected && full}
              onToggle={() => toggle(project.id)}
            />
          );
        })}
      </StepCard>
      <StepNav
        hint={
          selectedIds.length === 0
            ? '1つ以上選んでください'
            : `${selectedIds.length} / ${MAX_GENERAL_VOTES} 票を選んでいます`
        }
        nextLabel={nav.returnsToConfirm ? '確認へ戻る' : '次へ'}
        nextDisabled={selectedIds.length === 0}
        onNext={nav.onNext}
        onBack={nav.onBack}
      />
    </>
  );
}

function StageStep({
  groups,
  votes,
  selected,
  onChange,
  nav,
}: {
  groups: StageGroup[] | undefined;
  votes: StageVotes;
  selected: { stage: GrandprixStage; project: Project }[];
  onChange: (update: (prev: StageVotes) => StageVotes) => void;
  nav: NavProps;
}) {
  const { formatProjectLocation } = usePlaces();
  const [activeStage, setActiveStage] = useState<GrandprixStage>('1a');
  const activeProjects =
    groups?.find(({ stage }) => stage === activeStage)?.projects ?? [];

  const toggle = (stage: GrandprixStage, projectId: string) =>
    onChange((prev) => ({
      ...prev,
      [stage]: prev[stage] === projectId ? undefined : projectId,
    }));

  const nextLabel = nav.returnsToConfirm
    ? '確認へ戻る'
    : selected.length === 0
      ? '投票せずに進む'
      : '次へ';

  return (
    <>
      <StepCard
        title="ステージ部門（任意）"
        description="ステージごとに1企画まで選べます。投票しなくてもかまいません。"
      >
        <SelectedChips
          emptyLabel="まだ選んでいません"
          chips={selected.map(({ stage, project }) => ({
            key: stage,
            prefix: STAGE_LABELS[stage],
            label: project.name,
            onRemove: () => toggle(stage, project.id),
          }))}
        />
        <StageTabs
          active={activeStage}
          votedStages={votes}
          counts={groups}
          onSelect={setActiveStage}
        />
        <div role="tabpanel" className={css({ mt: '8px' })}>
          {!groups && <p className={emptyMessageClass}>読み込み中...</p>}
          {activeProjects.map((project) => (
            <ProjectVoteRow
              key={project.id}
              project={project}
              locationLabel={formatProjectLocation(project)}
              selected={votes[activeStage] === project.id}
              disabled={false}
              onToggle={() => toggle(activeStage, project.id)}
            />
          ))}
        </div>
      </StepCard>
      <StepNav
        hint={
          selected.length === 0
            ? '投票しない場合は、そのまま進んでください'
            : undefined
        }
        nextLabel={nextLabel}
        nextDisabled={false}
        onNext={nav.onNext}
        onBack={nav.onBack}
      />
    </>
  );
}

function VoteCount({ count }: { count: number }) {
  return (
    <span
      className={css({
        flexShrink: 0,
        px: '10px',
        py: '4px',
        borderRadius: 'full',
        bg: count > 0 ? 'accent' : 'accent.subtle',
        color: count > 0 ? 'surface' : 'accent.text',
        fontSize: 'sm',
        fontWeight: 'bold',
      })}
    >
      {count} / {MAX_GENERAL_VOTES}
    </span>
  );
}
