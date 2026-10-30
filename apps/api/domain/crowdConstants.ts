// 人流の定数。web からも読むため、zod などを持ち込まないよう crowd.ts から分けている。

/** 1回の送信の上限。通信が途切れて貯まった分は、この件数ずつ古い順に送る。 */
export const MAX_POINTS_PER_REPORT = 50;

/** 全体の人数を表す area_id。 */
export const ALL_AREAS_ID = 'all';
