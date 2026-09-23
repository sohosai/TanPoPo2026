export type QuestionType = 'radio' | 'text';

export type QuestionDef = {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
};

// TODO: 質問内容はクライアントと今後調整する。現状は仮の質問セット。
export const QUESTIONNAIRE_QUESTIONS: QuestionDef[] = [
  {
    id: 'visitCount',
    label: '雙峰祭への来場は何回目ですか？',
    type: 'radio',
    options: ['初めて', '2回目', '3回目以上'],
  },
  {
    id: 'satisfaction',
    label: '雙峰祭の満足度を教えてください',
    type: 'radio',
    options: ['とても満足', '満足', '普通', '不満'],
  },
  {
    id: 'comment',
    label: 'ご意見・ご感想があればお聞かせください（任意）',
    type: 'text',
  },
];
