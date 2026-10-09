import { IconCheck } from '@tabler/icons-react';
import type { Project } from 'api';
import {
  ProjectRowContent,
  projectRowClass,
} from '~/components/features/Project/ProjectListItem';
import { css, cx } from '../../../../styled-system/css';

/** 投票の対象として選ぶ企画の行。見た目は企画一覧の行と揃える。 */
export default function ProjectVoteRow({
  project,
  locationLabel,
  selected,
  disabled,
  onToggle,
}: {
  project: Project;
  locationLabel: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cx(
        projectRowClass,
        css({
          w: '100%',
          bg: selected ? 'accent.subtle' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          _last: { borderBottom: 'none' },
        }),
      )}
    >
      <ProjectRowContent project={project} locationLabel={locationLabel} />
      <span
        className={css({
          flexShrink: 0,
          alignSelf: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          w: '26px',
          h: '26px',
          borderRadius: 'full',
          border: 'token(borderWidths.thick) solid',
          borderColor: selected ? 'accent' : 'border',
          bg: selected ? 'accent' : 'surface',
          color: 'surface',
        })}
      >
        {selected && <IconCheck size={16} stroke={3} />}
      </span>
    </button>
  );
}
