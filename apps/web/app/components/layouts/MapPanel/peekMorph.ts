import { css } from '../../../../styled-system/css';

// シートが中段から最小段へ寄る進み具合 --sheet-peek（0: 中段、1: 最小段）に合わせて、
// 詳細のヘッダーを最小段の形へ連続的に変える。--sheet-peek は BottomSheet が
// data-sheet-morph を付けた要素へ渡す。レイアウトは変えず、translate / scale / opacity だけで動かす。
// 位置の値は、ヘッダーの上の余白 10px・左右の余白 16px・アイコン 48px・間隔 12px の配置から、
// 最小段のカード（高さ 80px、角丸 40px）の上下中央へ寄せる量。最小段ではカードが細くなり、
// カードの縁は中身の端より 6px 内側に来るため、横の位置はその分を含めて寄せる。

/** アイコン。48px から 32px に縮め、カードと同心の位置（カードの縁から 24px）へ寄せる。 */
export const peekIconStyles = css({
  transformOrigin: 'left top',
  translate: 'calc(var(--sheet-peek, 0) * 14px) 0',
  scale: 'calc(1 - var(--sheet-peek, 0) / 3)',
});

/** 名前。0.8 倍に縮め、アイコンの右でカードの上下中央へ寄せる。 */
export const peekTitleStyles = css({
  transformOrigin: 'left top',
  translate:
    'calc(var(--sheet-peek, 0) * -4px) calc(var(--sheet-peek, 0) * 4.7px)',
  scale: 'calc(1 - var(--sheet-peek, 0) * 0.2)',
});

/** 上揃えのヘッダーのバツ。カードと同心の位置（カードの縁から 22px）へ寄せる。 */
export const peekCloseStyles = css({
  translate:
    'calc(var(--sheet-peek, 0) * -12px) calc(var(--sheet-peek, 0) * -2px)',
});

/** 上下中央揃えのヘッダーのバツ。 */
export const peekCloseCenteredStyles = css({
  translate:
    'calc(var(--sheet-peek, 0) * -12px) calc(var(--sheet-peek, 0) * -8px)',
});

/** 最小段では見せない要素。最小段との中間までに消し切る。 */
export const peekFadeStyles = css({
  opacity: 'max(0, calc(1 - var(--sheet-peek, 0) * 2))',
});
