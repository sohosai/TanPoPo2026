import { IconCheck } from '@tabler/icons-react';
import type { GrandprixStage, MaxGeneralVotes, Shop, ShopCategory } from 'api';
import { useMemo, useState } from 'react';
import { trpc } from '~/lib/trcp';
import { css } from '../../../../styled-system/css';

const STAGE_LABELS: Record<GrandprixStage, string> = {
  '1a': '1Aステージ',
  united: 'UNITEDステージ',
  kaikan: '会館ステージ',
};
const STAGE_IDS = Object.keys(STAGE_LABELS) as GrandprixStage[];

const MAX_GENERAL_VOTES: MaxGeneralVotes = 4;

// 一般部門の一覧をこの順で分類ごとにグループ表示する。
const CATEGORY_ORDER: ShopCategory[] = [
  '食品',
  '物販',
  '展示',
  '学術',
  'ステージ',
  'その他',
];

type GrandprixFormProps = {
  onSubmitted: (result: 'win' | 'lose') => void;
};

export default function GrandprixForm({ onSubmitted }: GrandprixFormProps) {
  const { data: shops, status: shopsStatus } = trpc.shop.list.useQuery();
  const shopsByCategory = useMemo(() => {
    const groups = new Map<ShopCategory, Shop[]>();
    for (const shop of shops ?? []) {
      const list = groups.get(shop.category);
      if (list) {
        list.push(shop);
      } else {
        groups.set(shop.category, [shop]);
      }
    }
    return CATEGORY_ORDER.map((category) => ({
      category,
      shops: groups.get(category) ?? [],
    })).filter((group) => group.shops.length > 0);
  }, [shops]);
  const [generalIds, setGeneralIds] = useState<string[]>([]);
  const [stageIds, setStageIds] = useState<GrandprixStage[]>([]);
  const [isTsukubaStudent, setIsTsukubaStudent] = useState<boolean | null>(
    null,
  );

  const submit = trpc.grandprix.submit.useMutation({
    onSuccess: (data) => onSubmitted(data.result),
  });

  const toggleGeneral = (id: string) => {
    setGeneralIds((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= MAX_GENERAL_VOTES) return prev;
      return [...prev, id];
    });
  };

  const toggleStage = (id: GrandprixStage) => {
    setStageIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const hasGeneralVote = generalIds.length >= 1;
  const hasStageVote = stageIds.length >= 1;
  const hasStudentAnswer = isTsukubaStudent !== null;
  const canSubmit =
    hasGeneralVote && hasStageVote && hasStudentAnswer && !submit.isPending;

  const handleSubmit = () => {
    if (!canSubmit || isTsukubaStudent === null) return;
    submit.mutate({
      generalShopIds: generalIds,
      stagePlaceIds: stageIds,
      isTsukubaStudent,
    });
  };

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        p: '16px',
        pb: 'calc(220px + env(safe-area-inset-bottom, 0px))',
      })}
    >
      <section>
        <SectionHeading
          title="一般部門"
          description={`最大${MAX_GENERAL_VOTES}票まで投票できます（${generalIds.length}/${MAX_GENERAL_VOTES}）`}
        />
        {shopsStatus === 'pending' && (
          <p
            className={css({ color: 'fg.subtle', fontSize: '13px', mt: '8px' })}
          >
            読み込み中...
          </p>
        )}
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            mt: '8px',
          })}
        >
          {shopsByCategory.map(({ category, shops: categoryShops }) => (
            <div key={category}>
              <p
                className={css({
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'fg.subtle',
                  mb: '6px',
                })}
              >
                {category}（{categoryShops.length}）
              </p>
              <div
                className={css({
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                })}
              >
                {categoryShops.map((shop) => (
                  <ShopVoteRow
                    key={shop.id}
                    shop={shop}
                    selected={generalIds.includes(shop.id)}
                    disabled={
                      !generalIds.includes(shop.id) &&
                      generalIds.length >= MAX_GENERAL_VOTES
                    }
                    onToggle={() => toggleGeneral(shop.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="ステージ部門"
          description="1つ以上選択してください（複数選択可）"
        />
        <div
          className={css({
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            mt: '8px',
          })}
        >
          {STAGE_IDS.map((stage) => (
            <ToggleButton
              key={stage}
              label={STAGE_LABELS[stage]}
              active={stageIds.includes(stage)}
              onClick={() => toggleStage(stage)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="筑波大学の学生ですか？" />
        <div className={css({ display: 'flex', gap: '8px', mt: '8px' })}>
          <ToggleButton
            label="はい"
            active={isTsukubaStudent === true}
            onClick={() => setIsTsukubaStudent(true)}
          />
          <ToggleButton
            label="いいえ"
            active={isTsukubaStudent === false}
            onClick={() => setIsTsukubaStudent(false)}
          />
        </div>
      </section>

      {submit.isError && (
        <p className={css({ color: 'favorite', fontSize: '13px' })}>
          {submit.error.message ||
            '送信に失敗しました。もう一度お試しください。'}
        </p>
      )}

      <div
        className={css({
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          p: '16px',
          pb: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          bg: 'sheet.background',
          borderTop: '1px solid token(colors.border.subtle)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
        })}
      >
        {!canSubmit && !submit.isPending && (
          <ul
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px',
            })}
          >
            <ChecklistItem
              done={hasGeneralVote}
              label="一般部門を1つ以上選択"
            />
            <ChecklistItem
              done={hasStageVote}
              label="ステージ部門を1つ以上選択"
            />
            <ChecklistItem
              done={hasStudentAnswer}
              label="筑波大学の学生かどうかを選択"
            />
          </ul>
        )}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={css({
            width: '100%',
            py: '12px',
            borderRadius: '999px',
            border: 'none',
            bg: canSubmit ? 'accent' : 'surface.muted',
            color: canSubmit ? 'surface' : 'fg.subtle',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          })}
        >
          {submit.isPending ? '送信中...' : '投票する'}
        </button>
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: done ? 'accent' : 'fg.subtle',
      })}
    >
      <span
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: '16px',
          height: '16px',
          borderRadius: '999px',
          border: '1px solid',
          borderColor: done ? 'accent' : 'border',
          bg: done ? 'accent' : 'transparent',
          color: 'surface',
        })}
      >
        {done && <IconCheck size={11} stroke={3} />}
      </span>
      {label}
    </li>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2
        className={css({
          fontSize: '15px',
          fontWeight: 'bold',
          color: 'fg.strong',
        })}
      >
        {title}
      </h2>
      {description && (
        <p className={css({ fontSize: '12px', color: 'fg.subtle', mt: '2px' })}>
          {description}
        </p>
      )}
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={css({
        px: '20px',
        py: '8px',
        borderRadius: '999px',
        border: '1px solid',
        borderColor: active ? 'accent' : 'border',
        bg: active ? 'accent' : 'surface',
        color: active ? 'surface' : 'fg.muted',
        fontSize: '14px',
        cursor: 'pointer',
      })}
    >
      {label}
    </button>
  );
}

function ShopVoteRow({
  shop,
  selected,
  disabled,
  onToggle,
}: {
  shop: Shop;
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
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        px: '12px',
        py: '8px',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: selected ? 'accent' : 'border',
        bg: selected ? 'accent.subtle' : 'surface',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <span
        className={css({ flex: 1, minWidth: 0, fontSize: '14px', color: 'fg' })}
      >
        {shop.name}
      </span>
      <span
        className={css({
          flexShrink: 0,
          fontSize: '12px',
          color: 'fg.subtle',
        })}
      >
        {shop.organization}
      </span>
    </button>
  );
}
