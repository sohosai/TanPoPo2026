import { css } from '../../../../styled-system/css';

/** 福引所での引き換え時間帯（クライアント指定の文言をそのまま表示）。 */
export default function RedemptionSchedule() {
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        p: '14px',
        borderRadius: '8px',
        bg: 'accent.subtle',
        fontSize: '13px',
        color: 'fg',
        lineHeight: 1.8,
      })}
    >
      <div>
        <p className={css({ fontWeight: 'bold' })}>本祭 1日目 10月31日(日)</p>
        <p>12:00〜14:00</p>
        <p>14:30〜17:00</p>
        <p>17:30〜20:00</p>
      </div>
      <div>
        <p className={css({ fontWeight: 'bold' })}>本祭 2日目 11月01日(月)</p>
        <p>10:00〜12:00</p>
        <p>12:30〜14:30</p>
        <p>15:00〜17:00</p>
      </div>
      <p className={css({ color: 'fg.subtle' })}>※ 景品がなくなり次第終了</p>
    </div>
  );
}
