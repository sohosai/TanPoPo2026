import type { Project } from 'api';
import type { ReactNode } from 'react';
import ProjectIcon from '~/components/features/Project/ProjectIcon';
import { css } from '../../../../styled-system/css';

type SummaryProject = { project: Project; prefix?: string };

/** 送信前の確認画面。設問ごとに答えを並べ、その設問へ戻って直せるようにする。 */
export default function VoteSummary({
  isTsukubaStudent,
  generalProjects,
  stageProjects,
  onEdit,
}: {
  isTsukubaStudent: boolean;
  generalProjects: SummaryProject[];
  stageProjects: SummaryProject[];
  onEdit: (step: 'student' | 'general' | 'stage') => void;
}) {
  return (
    <dl className={css({ display: 'flex', flexDirection: 'column' })}>
      <SummarySection label="筑波大学の学生" onEdit={() => onEdit('student')}>
        <p className={css({ fontSize: 'md', color: 'fg.strong' })}>
          {isTsukubaStudent ? 'はい' : 'いいえ'}
        </p>
      </SummarySection>
      <SummarySection
        label={`一般部門（${generalProjects.length}票）`}
        onEdit={() => onEdit('general')}
      >
        <ProjectList items={generalProjects} />
      </SummarySection>
      <SummarySection label="ステージ部門" onEdit={() => onEdit('stage')}>
        {stageProjects.length > 0 ? (
          <ProjectList items={stageProjects} />
        ) : (
          <p className={css({ fontSize: 'sm', color: 'fg.subtle' })}>
            投票しない
          </p>
        )}
      </SummarySection>
    </dl>
  );
}

function SummarySection({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={css({
        px: '20px',
        py: '14px',
        borderTop:
          'token(borderWidths.divider) solid token(colors.border.subtle)',
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: '8px',
        })}
      >
        <dt
          className={css({
            fontSize: 'xs',
            fontWeight: 'bold',
            color: 'fg.subtle',
          })}
        >
          {label}
        </dt>
        <button
          type="button"
          onClick={onEdit}
          className={css({
            border: 'none',
            bg: 'transparent',
            color: 'accent.text',
            fontSize: 'xs',
            fontWeight: 'bold',
            cursor: 'pointer',
          })}
        >
          変更
        </button>
      </div>
      <dd>{children}</dd>
    </div>
  );
}

function ProjectList({ items }: { items: SummaryProject[] }) {
  return (
    <ul
      className={css({ display: 'flex', flexDirection: 'column', gap: '8px' })}
    >
      {items.map(({ project, prefix }) => (
        <li
          key={project.id}
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          })}
        >
          <ProjectIcon project={project} size={36} />
          <span
            className={css({ minWidth: 0, fontSize: 'sm', color: 'fg.strong' })}
          >
            {prefix && (
              <span
                className={css({
                  mr: '6px',
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  color: 'accent.text',
                })}
              >
                {prefix}
              </span>
            )}
            {project.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
