import { css, cx } from '../../../../styled-system/css';
import { contentWidth } from './styles';

type StepNavProps = {
  /** 次へ進めない理由など、ボタンの上に出す一言。 */
  hint?: string;
  nextLabel: string;
  nextDisabled: boolean;
  onNext: () => void;
  /** 最初の手順では戻るボタンを出さない。 */
  onBack?: () => void;
};

/** 画面下に固定する、手順を進める・戻るボタンの欄。 */
export default function StepNav({
  hint,
  nextLabel,
  nextDisabled,
  onNext,
  onBack,
}: StepNavProps) {
  return (
    <div
      className={css({
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        bg: 'sheet.background',
        borderTop:
          'token(borderWidths.divider) solid token(colors.border.subtle)',
        boxShadow: 'bar',
      })}
    >
      <div
        className={cx(
          contentWidth,
          css({
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            px: '16px',
            pt: '12px',
            pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          }),
        )}
      >
        {hint && (
          <p
            className={css({
              fontSize: 'xs',
              textAlign: 'center',
              color: 'fg.subtle',
            })}
          >
            {hint}
          </p>
        )}
        <div className={css({ display: 'flex', gap: '8px' })}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={css({
                flex: 1,
                py: '12px',
                borderRadius: 'full',
                border: 'token(borderWidths.thin) solid',
                borderColor: 'border',
                bg: 'surface',
                color: 'fg.muted',
                fontSize: 'lg',
                fontWeight: 'bold',
                cursor: 'pointer',
              })}
            >
              戻る
            </button>
          )}
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className={css({
              flex: 2,
              py: '12px',
              borderRadius: 'full',
              border: 'none',
              bg: nextDisabled ? 'surface.muted' : 'accent',
              color: nextDisabled ? 'fg.subtle' : 'surface',
              fontSize: 'lg',
              fontWeight: 'bold',
              cursor: nextDisabled ? 'not-allowed' : 'pointer',
            })}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
