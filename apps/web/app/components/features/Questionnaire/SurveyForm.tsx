import { useState } from 'react';
import { css } from '../../../../styled-system/css';
import {
  type Answers,
  isAnswered,
  isOtherSelected,
  type Lang,
  otherKey,
  type QuestionDef,
  type QuestionOption,
  toSubmission,
  visibleQuestions,
} from './questions';

const TEXT = {
  ja: {
    progress: (n: number, total: number) => `${n}人目 / 全${total}人`,
    intro: 'アンケートにご協力ください',
    required: '必須',
    optional: '任意',
    multiple: '複数選択可',
    otherPlaceholder: '具体的にご記入ください',
    submitting: '送信中...',
    submit: '回答を送信',
    next: '次の人へ',
  },
  en: {
    progress: (n: number, total: number) => `Person ${n} of ${total}`,
    intro: 'Thank you for taking our survey',
    required: 'Required',
    optional: 'Optional',
    multiple: 'Select all that apply',
    otherPlaceholder: 'Please specify',
    submitting: 'Submitting...',
    submit: 'Submit',
    next: 'Next person',
  },
} satisfies Record<Lang, unknown>;

type SurveyFormProps = {
  headcount: number;
  lang: Lang;
  submitting: boolean;
  errorMessage?: string;
  onComplete: (responses: Answers[]) => void;
};

/** headcount 人分を1人ずつ順番に回答させるステップ形式のフォーム。 */
export default function SurveyForm({
  headcount,
  lang,
  submitting,
  errorMessage,
  onComplete,
}: SurveyFormProps) {
  const [personIndex, setPersonIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers[]>([]);
  const current = answers[personIndex] ?? {};
  const text = TEXT[lang];

  const questions = visibleQuestions(current);
  const isLastPerson = personIndex === headcount - 1;
  const canProceed = questions.every((q) => isAnswered(q, current));

  const setCurrentAnswer = (key: string, value: string | string[]) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[personIndex] = { ...current, [key]: value };
      return next;
    });
  };

  const toggleOption = (question: QuestionDef, option: QuestionOption) => {
    if (question.type !== 'multiple') return;
    const value = option.label.ja;
    const prev = (current[question.id] as string[] | undefined) ?? [];
    const isExclusive = (v: string) =>
      question.options.some((o) => o.label.ja === v && o.kind === 'exclusive');
    setCurrentAnswer(
      question.id,
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : option.kind === 'exclusive'
          ? [value]
          : [...prev.filter((v) => !isExclusive(v)), value],
    );
  };

  const handleNext = () => {
    if (isLastPerson) {
      onComplete(answers.map(toSubmission));
      return;
    }
    setPersonIndex((i) => i + 1);
    // 1人分の質問が長いため、次の人の回答は先頭から始められるようにする。
    window.scrollTo({ top: 0 });
  };

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        p: '16px',
        pb: '96px',
      })}
    >
      <p className={css({ fontSize: 'sm', color: 'fg.subtle' })}>
        {headcount > 1 ? text.progress(personIndex + 1, headcount) : text.intro}
      </p>

      {questions.map((question) => {
        const answer = current[question.id];
        return (
          <div key={question.id}>
            <h3
              className={css({
                fontSize: 'md',
                fontWeight: 'bold',
                color: 'fg.strong',
                lineHeight: 1.6,
                mb: '8px',
              })}
            >
              {question.label[lang]}
              <span
                className={css({
                  ml: '8px',
                  fontSize: 'xs',
                  fontWeight: 'normal',
                  color: question.type === 'text' ? 'fg.subtle' : 'accent',
                  whiteSpace: 'nowrap',
                })}
              >
                {question.type === 'text' ? text.optional : text.required}
                {question.type === 'multiple' && ` · ${text.multiple}`}
              </span>
            </h3>

            {question.type !== 'text' && (
              <div
                className={css({
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                })}
              >
                {question.options.map((option) => (
                  <OptionButton
                    key={option.label.ja}
                    label={option.label[lang]}
                    pressed={
                      Array.isArray(answer)
                        ? answer.includes(option.label.ja)
                        : answer === option.label.ja
                    }
                    onClick={() =>
                      question.type === 'single'
                        ? setCurrentAnswer(question.id, option.label.ja)
                        : toggleOption(question, option)
                    }
                  />
                ))}
              </div>
            )}

            {isOtherSelected(question, current) && (
              <input
                type="text"
                value={current[otherKey(question.id)] ?? ''}
                placeholder={text.otherPlaceholder}
                onChange={(e) =>
                  setCurrentAnswer(otherKey(question.id), e.target.value)
                }
                className={css({
                  width: '100%',
                  mt: '8px',
                  p: '12px',
                  borderRadius: 'lg',
                  border: 'token(borderWidths.thin) solid',
                  borderColor: 'border',
                  fontSize: 'md',
                  color: 'fg',
                })}
              />
            )}

            {question.type === 'text' && (
              <textarea
                value={answer ?? ''}
                onChange={(e) => setCurrentAnswer(question.id, e.target.value)}
                rows={3}
                className={css({
                  width: '100%',
                  p: '12px',
                  borderRadius: 'lg',
                  border: 'token(borderWidths.thin) solid',
                  borderColor: 'border',
                  fontSize: 'md',
                  color: 'fg',
                  resize: 'vertical',
                })}
              />
            )}
          </div>
        );
      })}

      {errorMessage && (
        <p className={css({ color: 'favorite.text', fontSize: 'sm' })}>
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
          borderTop:
            'token(borderWidths.divider) solid token(colors.border.subtle)',
        })}
      >
        <button
          type="button"
          disabled={!canProceed || submitting}
          onClick={handleNext}
          className={css({
            width: '100%',
            py: '12px',
            borderRadius: 'full',
            border: 'none',
            bg: canProceed && !submitting ? 'accent' : 'surface.muted',
            color: canProceed && !submitting ? 'surface' : 'fg.subtle',
            fontSize: 'lg',
            fontWeight: 'bold',
            cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
          })}
        >
          {submitting
            ? text.submitting
            : isLastPerson
              ? text.submit
              : text.next}
        </button>
      </div>
    </div>
  );
}

function OptionButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={css({
        px: '16px',
        py: '8px',
        borderRadius: 'full',
        border: 'token(borderWidths.thin) solid',
        borderColor: pressed ? 'accent' : 'border',
        bg: pressed ? 'accent' : 'surface',
        color: pressed ? 'surface' : 'fg.muted',
        fontSize: 'md',
        textAlign: 'left',
        cursor: 'pointer',
      })}
    >
      {label}
    </button>
  );
}
