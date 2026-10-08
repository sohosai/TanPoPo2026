import type { GrandprixStage, MaxGeneralVotes } from 'api';
import { useMemo, useState } from 'react';
import {
  emptyCriteria,
  filterProjects,
  type ProjectFilterCriteria,
  tagOptionsOf,
  toggleItem,
} from '~/components/features/Project/filter';
import {
  ChipDivider,
  FavoriteFilterChip,
  FilterChip,
} from '~/components/features/Project/FilterChip';
import { useFavorites } from '~/lib/favorites';
import { usePlaces } from '~/lib/places';
import { trpc } from '~/lib/trpc';
import { css, cx } from '../../../../styled-system/css';
import ProjectVoteRow from './ProjectVoteRow';
import StageTabs from './StageTabs';
import StepCard, { ChoiceButton } from './StepCard';
import { contentWidth, emptyMessageClass } from './styles';
import SubmitBar from './SubmitBar';

const MAX_GENERAL_VOTES: MaxGeneralVotes = 4;

type GrandprixFormProps = {
  onSubmitted: (result: 'win' | 'lose') => void;
};

export default function GrandprixForm({ onSubmitted }: GrandprixFormProps) {
  const { data: generalProjects, status: projectsStatus } =
    trpc.grandprix.generalProjects.useQuery();
  const { data: stageProjects, status: stageProjectsStatus } =
    trpc.grandprix.stageProjects.useQuery();
  const { favorites } = useFavorites();
  const { byId: placesById, formatProjectLocation } = usePlaces();

  const [criteria, setCriteria] =
    useState<ProjectFilterCriteria>(emptyCriteria);
  const visibleProjects = useMemo(
    () =>
      generalProjects
        ? filterProjects(generalProjects, criteria, favorites, placesById)
        : [],
    [generalProjects, criteria, favorites, placesById],
  );
  const featureOptions = useMemo(
    () => tagOptionsOf(generalProjects ?? []),
    [generalProjects],
  );
  const toggleFeature = (tag: string) =>
    setCriteria((prev) => ({ ...prev, tags: toggleItem(prev.tags, tag) }));

  const [generalIds, setGeneralIds] = useState<string[]>([]);
  // ステージごとに1企画まで。
  const [stageVotes, setStageVotes] = useState<
    Partial<Record<GrandprixStage, string>>
  >({});
  const [activeStage, setActiveStage] = useState<GrandprixStage>('1a');
  const [isTsukubaStudent, setIsTsukubaStudent] = useState<boolean | null>(
    null,
  );

  const submit = trpc.grandprix.submit.useMutation({
    onSuccess: (data) => onSubmitted(data.result),
  });

  const toggleGeneral = (id: string) => {
    setGeneralIds((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= MAX_GENERAL_VOTES) return prev;
      return [...prev, id];
    });
  };

  const toggleStageVote = (stage: GrandprixStage, projectId: string) => {
    setStageVotes((prev) => ({
      ...prev,
      [stage]: prev[stage] === projectId ? undefined : projectId,
    }));
  };
  const stageProjectIds = Object.values(stageVotes).filter(
    (id): id is string => id !== undefined,
  );

  const hasGeneralVote = generalIds.length >= 1;
  const hasStageVote = stageProjectIds.length >= 1;
  const hasStudentAnswer = isTsukubaStudent !== null;
  const canSubmit =
    hasGeneralVote && hasStageVote && hasStudentAnswer && !submit.isPending;
  const generalFull = generalIds.length >= MAX_GENERAL_VOTES;

  const handleSubmit = () => {
    if (!canSubmit || isTsukubaStudent === null) return;
    submit.mutate({
      generalProjectIds: generalIds,
      stageProjectIds,
      isTsukubaStudent,
    });
  };

  const activeStageProjects =
    stageProjects?.find(({ stage }) => stage === activeStage)?.projects ?? [];

  return (
    <div
      className={css({
        minH: '100%',
        bg: 'border.subtle',
        pb: 'calc(260px + env(safe-area-inset-bottom, 0px))',
      })}
    >
      <div
        className={cx(
          contentWidth,
          css({
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            px: '12px',
            pt: '16px',
          }),
        )}
      >
        <p
          className={css({
            px: '4px',
            fontSize: '13px',
            lineHeight: 1.7,
            color: 'fg.muted',
          })}
        >
          3つの質問に答えて投票してください。投票すると抽選に参加できます。
        </p>

        {/* 一般部門の一覧は長いため、短い設問を先に置き、一覧の下まで送らなくても答えられるようにする */}
        <StepCard
          step={1}
          title="筑波大学の学生ですか？"
          done={hasStudentAnswer}
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
              active={isTsukubaStudent === true}
              onClick={() => setIsTsukubaStudent(true)}
            />
            <ChoiceButton
              label="いいえ"
              active={isTsukubaStudent === false}
              onClick={() => setIsTsukubaStudent(false)}
            />
          </div>
        </StepCard>

        <StepCard
          step={2}
          title="ステージ部門"
          description="ステージごとに1企画まで投票できます。どこか1つのステージに投票すれば送信できます。"
          done={hasStageVote}
        >
          <StageTabs
            active={activeStage}
            votedStages={stageVotes}
            counts={stageProjects}
            onSelect={setActiveStage}
          />
          <div role="tabpanel" className={css({ mt: '8px' })}>
            {stageProjectsStatus === 'pending' && (
              <p className={emptyMessageClass}>読み込み中...</p>
            )}
            {activeStageProjects.map((project) => (
              <ProjectVoteRow
                key={project.id}
                project={project}
                locationLabel={formatProjectLocation(project)}
                selected={stageVotes[activeStage] === project.id}
                disabled={false}
                onToggle={() => toggleStageVote(activeStage, project.id)}
              />
            ))}
          </div>
        </StepCard>

        <StepCard
          step={3}
          title="一般部門"
          description={`気に入った企画に最大${MAX_GENERAL_VOTES}票まで投票できます（${generalIds.length}/${MAX_GENERAL_VOTES}）。`}
          done={hasGeneralVote}
        >
          <div
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              px: '16px',
              pb: '12px',
              borderBottom: '1px solid token(colors.border.subtle)',
            })}
          >
            <FavoriteFilterChip
              active={criteria.favorite}
              onClick={() =>
                setCriteria((prev) => ({ ...prev, favorite: !prev.favorite }))
              }
            />
            <ChipDivider />
            {featureOptions.map((tag) => (
              <FilterChip
                key={tag}
                active={criteria.tags.includes(tag)}
                onClick={() => toggleFeature(tag)}
              >
                {tag}
              </FilterChip>
            ))}
            <span
              className={css({
                ml: 'auto',
                fontSize: '12px',
                color: 'fg.subtle',
              })}
            >
              {visibleProjects.length}件
            </span>
          </div>

          {projectsStatus === 'pending' && (
            <p className={emptyMessageClass}>読み込み中...</p>
          )}
          {generalProjects && visibleProjects.length === 0 && (
            <p className={emptyMessageClass}>
              {criteria.favorite
                ? 'いいねした企画がありません'
                : '該当する企画が見つかりませんでした'}
            </p>
          )}
          {visibleProjects.map((project) => {
            const selected = generalIds.includes(project.id);
            return (
              <ProjectVoteRow
                key={project.id}
                project={project}
                locationLabel={formatProjectLocation(project)}
                selected={selected}
                disabled={!selected && generalFull}
                onToggle={() => toggleGeneral(project.id)}
              />
            );
          })}
        </StepCard>

        {submit.isError && (
          <p
            className={css({ px: '4px', color: 'favorite', fontSize: '13px' })}
          >
            {submit.error.message ||
              '送信に失敗しました。もう一度お試しください。'}
          </p>
        )}
      </div>

      <SubmitBar
        requirements={[
          { label: '筑波大学の学生かどうかを選択', done: hasStudentAnswer },
          {
            label: 'ステージ部門でどこか1つのステージに投票',
            done: hasStageVote,
          },
          { label: '一般部門を1つ以上選択', done: hasGeneralVote },
        ]}
        canSubmit={canSubmit}
        submitting={submit.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
