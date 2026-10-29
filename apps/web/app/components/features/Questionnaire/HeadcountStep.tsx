import { IconMinus, IconPlus } from '@tabler/icons-react';
import type { MaxHeadcount } from 'api';
import { useState } from 'react';
import { css } from '../../../../styled-system/css';
import type { Lang } from './questions';

const MIN_HEADCOUNT = 1;
const MAX_HEADCOUNT: MaxHeadcount = 10;

const TEXT = {
  ja: {
    title: '何人分のアンケートに答えますか？',
    description: [
      'スマホをお持ちでないお子様の分も、保護者の方がまとめて回答できます。',
      '同伴されている人数分を選択してください。',
    ],
    decrease: '人数を減らす',
    increase: '人数を増やす',
    count: (n: number) => `${n}人`,
    next: '次へ',
  },
  en: {
    title: 'How many people are answering?',
    description: [
      'A parent or guardian can answer on behalf of children without a smartphone.',
      'Please select the number of people in your group.',
    ],
    decrease: 'Decrease',
    increase: 'Increase',
    count: (n: number) => `${n}`,
    next: 'Next',
  },
} satisfies Record<Lang, unknown>;

type HeadcountStepProps = {
  lang: Lang;
  onConfirm: (headcount: number) => void;
};

export default function HeadcountStep({ lang, onConfirm }: HeadcountStepProps) {
  const [headcount, setHeadcount] = useState(1);
  const text = TEXT[lang];

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
            fontSize: 'lg',
            fontWeight: 'bold',
            color: 'fg.strong',
          })}
        >
          {text.title}
        </h2>
        <p
          className={css({
            fontSize: 'sm',
            color: 'fg.subtle',
            lineHeight: 1.7,
            mt: '6px',
          })}
        >
          {text.description[0]}
          <br />
          {text.description[1]}
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
          label={text.decrease}
          disabled={headcount <= MIN_HEADCOUNT}
          onClick={() => setHeadcount((n) => Math.max(MIN_HEADCOUNT, n - 1))}
        />
        <span
          className={css({
            minWidth: '64px',
            textAlign: 'center',
            fontSize: '3xl',
            fontWeight: 'bold',
            color: 'fg.strong',
          })}
        >
          {text.count(headcount)}
        </span>
        <StepButton
          icon={IconPlus}
          label={text.increase}
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
          borderRadius: 'full',
          border: 'none',
          bg: 'accent',
          color: 'surface',
          fontSize: 'lg',
          fontWeight: 'bold',
          cursor: 'pointer',
        })}
      >
        {text.next}
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
        borderRadius: 'full',
        border: 'token(borderWidths.thin) solid',
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
