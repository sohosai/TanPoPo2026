import { useState } from 'react';
import { css } from '../../../../styled-system/css';
import { QUESTIONNAIRE_QUESTIONS } from './questions';

type Answers = Record<string, string>;

type SurveyFormProps = {
  headcount: number;
  submitting: boolean;
  errorMessage?: string;
  onComplete: (responses: Answers[]) => void;
};

/** headcount 人分を1人ずつ順番に回答させるステップ形式のフォーム。 */
export default function SurveyForm({
  headcount,
  submitting,
  errorMessage,
  onComplete,
}: SurveyFormProps) {
  const [personIndex, setPersonIndex] = useState(0);
  const [collected, setCollected] = useState<Answers[]>([]);
  const [current, setCurrent] = useState<Answers>({});

  const isLastPerson = personIndex === headcount - 1;
  const canProceed = QUESTIONNAIRE_QUESTIONS.every(
    (q) => q.type === 'text' || Boolean(current[q.id]),
  );

  const handleNext = () => {
    const next = [...collected, current];
    if (isLastPerson) {
      onComplete(next);
      return;
    }
    setCollected(next);
    setCurrent({});
    setPersonIndex((i) => i + 1);
  };

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        p: '16px',
        pb: '96px',
      })}
    >
      <p className={css({ fontSize: '13px', color: 'fg.subtle' })}>
        {headcount > 1
          ? `${personIndex + 1}人目 / 全${headcount}人`
          : 'アンケートにご協力ください'}
      </p>

      {QUESTIONNAIRE_QUESTIONS.map((question) => (
        <div key={question.id}>
          <h3
            className={css({
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'fg.strong',
              mb: '8px',
            })}
          >
            {question.label}
          </h3>

          {question.type === 'radio' && (
            <div
              className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px' })}
            >
              {question.options?.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={current[question.id] === option}
                  onClick={() =>
                    setCurrent((prev) => ({ ...prev, [question.id]: option }))
                  }
                  className={css({
                    px: '16px',
                    py: '8px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor:
                      current[question.id] === option ? 'accent' : 'border',
                    bg: current[question.id] === option ? 'accent' : 'surface',
                    color:
                      current[question.id] === option ? 'surface' : 'fg.muted',
                    fontSize: '14px',
                    cursor: 'pointer',
                  })}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {question.type === 'text' && (
            <textarea
              value={current[question.id] ?? ''}
              onChange={(e) =>
                setCurrent((prev) => ({
                  ...prev,
                  [question.id]: e.target.value,
                }))
              }
              rows={3}
              className={css({
                width: '100%',
                p: '10px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'border',
                fontSize: '14px',
                color: 'fg',
                resize: 'vertical',
              })}
            />
          )}
        </div>
      ))}

      {errorMessage && (
        <p className={css({ color: 'favorite', fontSize: '13px' })}>
          {errorMessage}
        </p>
      )}

      <div
        className={css({
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: '16px',
          bg: 'sheet.background',
          borderTop: '1px solid token(colors.border.subtle)',
        })}
      >
        <button
          type="button"
          disabled={!canProceed || submitting}
          onClick={handleNext}
          className={css({
            width: '100%',
            py: '12px',
            borderRadius: '999px',
            border: 'none',
            bg: canProceed && !submitting ? 'accent' : 'surface.muted',
            color: canProceed && !submitting ? 'surface' : 'fg.subtle',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
          })}
        >
          {submitting ? '送信中...' : isLastPerson ? '回答を送信' : '次の人へ'}
        </button>
      </div>
    </div>
  );
}
