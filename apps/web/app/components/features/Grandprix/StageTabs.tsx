import { IconCheck } from '@tabler/icons-react';
import type { GrandprixStage, Project } from 'api';
import { css } from '../../../../styled-system/css';

// タブは3つ横に並べるため「ステージ」を省いた短い名前にする。
const STAGE_LABELS: Record<GrandprixStage, string> = {
  '1a': '1A',
  united: 'UNITED',
  kaikan: '会館',
};

export default function StageTabs({
  active,
  votedStages,
  counts,
  onSelect,
}: {
  active: GrandprixStage;
  votedStages: Partial<Record<GrandprixStage, string>>;
  counts: { stage: GrandprixStage; projects: Project[] }[] | undefined;
  onSelect: (stage: GrandprixStage) => void;
}) {
  return (
    <div
      role="tablist"
      className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        mx: '16px',
        p: '4px',
        borderRadius: '12px',
        bg: 'border.subtle',
      })}
    >
      {(Object.keys(STAGE_LABELS) as GrandprixStage[]).map((stage) => {
        const selected = stage === active;
        const voted = votedStages[stage] !== undefined;
        const count = counts?.find((group) => group.stage === stage)?.projects
          .length;
        return (
          <button
            key={stage}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(stage)}
            className={css({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              py: '8px',
              borderRadius: '9px',
              bg: selected ? 'surface' : 'transparent',
              boxShadow: selected ? '0 1px 4px rgba(0, 0, 0, 0.12)' : 'none',
              color: selected ? 'accent.text' : 'fg.muted',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            })}
          >
            <span className={css({ fontSize: '14px', fontWeight: 'bold' })}>
              {STAGE_LABELS[stage]}
            </span>
            {/* どのステージに投票済みかを、タブを切り替えずに分かるようにする */}
            <span
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                h: '1lh',
                fontSize: '11px',
                fontWeight: voted ? 'bold' : 'normal',
                color: voted ? 'accent.text' : 'fg.subtle',
              })}
            >
              {voted ? (
                <>
                  <IconCheck size={12} stroke={3} />
                  <span
                    className={css({ textBox: 'trim-both cap alphabetic' })}
                  >
                    投票済み
                  </span>
                </>
              ) : count !== undefined ? (
                `${count}企画`
              ) : (
                '…'
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
