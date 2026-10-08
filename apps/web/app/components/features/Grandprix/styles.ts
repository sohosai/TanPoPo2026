import { css } from '../../../../styled-system/css';

/** 本文と下部の投票バーの幅。PC では中央に寄せる。 */
export const contentWidth = css({ w: '100%', maxW: '720px', mx: 'auto' });

export const emptyMessageClass = css({
  px: '24px',
  py: '40px',
  textAlign: 'center',
  fontSize: 'sm',
  color: 'fg.subtle',
});
