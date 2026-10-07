import { IconMinus, IconPlus } from '@tabler/icons-react';
import type { MaxHeadcount } from 'api';
import { useState } from 'react';
import { css } from '../../../../styled-system/css';

const MIN_HEADCOUNT = 1;
const MAX_HEADCOUNT: MaxHeadcount = 10;

type HeadcountStepProps = {
  onConfirm: (headcount: number) => void;
};

export default function HeadcountStep({ onConfirm }: HeadcountStepProps) {
  const [headcount, setHeadcount] = useState(1);

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        p: '16px',
      })}
    >
      <div>
        <h2
          className={css({
            fontSize: '15px',
            fontWeight: 'bold',
            color: 'fg.strong',
          })}
        >
          何人分のアンケートに答えますか？
        </h2>
        <p
          className={css({
            fontSize: '13px',
            color: 'fg.subtle',
            lineHeight: 1.7,
            mt: '6px',
          })}
        >
          スマホをお持ちでないお子様の分も、保護者の方がまとめて回答できます。
          <br />
          同伴されている人数分を選択してください。
        </p>
      </div>

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          py: '12px',
        })}
      >
        <StepButton
          icon={IconMinus}
          label="人数を減らす"
          disabled={headcount <= MIN_HEADCOUNT}
          onClick={() => setHeadcount((n) => Math.max(MIN_HEADCOUNT, n - 1))}
        />
        <span
          className={css({
            minWidth: '64px',
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'fg.strong',
          })}
        >
          {headcount}人
        </span>
        <StepButton
          icon={IconPlus}
          label="人数を増やす"
          disabled={headcount >= MAX_HEADCOUNT}
          onClick={() => setHeadcount((n) => Math.min(MAX_HEADCOUNT, n + 1))}
        />
      </div>

      <button
        type="button"
        onClick={() => onConfirm(headcount)}
        className={css({
          width: '100%',
          py: '12px',
          borderRadius: '999px',
          border: 'none',
          bg: 'accent',
          color: 'surface',
          fontSize: '15px',
          fontWeight: 'bold',
          cursor: 'pointer',
        })}
      >
        次へ
      </button>
    </div>
  );
}

function StepButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof IconPlus;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '999px',
        border: '1px solid',
        borderColor: disabled ? 'border' : 'accent',
        bg: 'surface',
        color: disabled ? 'fg.placeholder' : 'accent',
        cursor: disabled ? 'not-allowed' : 'pointer',
      })}
    >
      <Icon size={18} />
    </button>
  );
}
