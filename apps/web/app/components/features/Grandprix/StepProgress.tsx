import { css } from '../../../../styled-system/css';

/** 投票の手順のどこにいるかを示す帯。 */
export default function StepProgress({
  labels,
  current,
}: {
  labels: readonly string[];
  current: number;
}) {
  return (
    <ol
      aria-label={`ステップ ${current + 1} / ${labels.length}`}
      className={css({
        display: 'grid',
        gridAutoColumns: '1fr',
        gridAutoFlow: 'column',
        gap: '4px',
        px: '4px',
      })}
    >
      {labels.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '2xs',
            fontWeight: index === current ? 'bold' : 'normal',
            color: index <= current ? 'accent.text' : 'fg.subtle',
          })}
        >
          <span
            className={css({
              h: '4px',
              borderRadius: 'full',
              bg: index <= current ? 'accent' : 'border.subtle',
              transition: 'background 0.2s',
            })}
          />
          {label}
        </li>
      ))}
    </ol>
  );
}
