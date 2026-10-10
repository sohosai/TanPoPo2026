import { Link } from 'react-router';
import { css } from '../../styled-system/css';
import type { Route } from './+types/not-found';

export const meta: Route.MetaFunction = () => [
  { title: 'ページが見つかりません | 雙峰祭 企画検索システム' },
];

export const links: Route.LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Yusei+Magic&family=Zen+Maru+Gothic:wght@500;700;900&display=swap',
  },
];

const colors = {
  bg: '#f9feff',
  ink: '#29444f',
  blue: '#31cee2',
  lightBlue: '#8de5f0',
  orange: '#fb985c',
  lightOrange: '#ffc7a6',
  sohosaiOrange: '#ed6d1f',
  purple: '#9b6fc4',
  // 山画像の両端の色。画像より広い画面で左右を埋める。
  ground: 'rgb(72 201 218)',
};

const confettiShape = {
  dot: { width: '18px', height: '18px', borderRadius: '50%' },
  tri: {
    width: '24px',
    height: '21px',
    clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
  },
  bar: { width: '30px', height: '10px', borderRadius: '5px' },
};

const confetti: {
  shape: keyof typeof confettiShape;
  top: string;
  left: string;
  color: string;
  delay: string;
}[] = [
  { shape: 'dot', top: '6%', left: '5%', color: colors.orange, delay: '0s' },
  {
    shape: 'tri',
    top: '4%',
    left: '30%',
    color: colors.lightBlue,
    delay: '-2s',
  },
  { shape: 'bar', top: '9%', left: '58%', color: colors.purple, delay: '-1s' },
  {
    shape: 'dot',
    top: '5%',
    left: '84%',
    color: colors.lightOrange,
    delay: '-1.5s',
  },
  { shape: 'tri', top: '24%', left: '16%', color: colors.blue, delay: '-3s' },
  {
    shape: 'bar',
    top: '22%',
    left: '46%',
    color: colors.lightOrange,
    delay: '-4s',
  },
  {
    shape: 'dot',
    top: '28%',
    left: '93%',
    color: colors.orange,
    delay: '-2.5s',
  },
  {
    shape: 'tri',
    top: '40%',
    left: '3%',
    color: colors.lightBlue,
    delay: '-3.5s',
  },
  {
    shape: 'bar',
    top: '44%',
    left: '36%',
    color: colors.purple,
    delay: '-0.5s',
  },
  { shape: 'dot', top: '38%', left: '70%', color: colors.blue, delay: '-5s' },
  {
    shape: 'tri',
    top: '60%',
    left: '12%',
    color: colors.orange,
    delay: '-4.5s',
  },
  {
    shape: 'dot',
    top: '64%',
    left: '52%',
    color: colors.lightBlue,
    delay: '-2.2s',
  },
  {
    shape: 'bar',
    top: '58%',
    left: '86%',
    color: colors.purple,
    delay: '-5.5s',
  },
  {
    shape: 'tri',
    top: '72%',
    left: '30%',
    color: colors.lightOrange,
    delay: '-3.2s',
  },
];

const headline = '404 NOT FOUND!';

const tablet = '@media (max-width: 900px)';

export default function NotFound() {
  return (
    <div
      className={css({
        '--mountain-h': 'clamp(90px, min(22vw, 30svh), 320px)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100svh',
        // preflight の行送り（1.5）をブラウザ既定に戻す。'normal' と書くと Panda のトークン（1.5）になる。
        lineHeight: 'initial',
        overflow: 'hidden',
        bg: colors.bg,
        color: colors.ink,
        fontFamily: "'Zen Maru Gothic', sans-serif",
        [tablet]: {
          '--mountain-h': 'clamp(90px, min(34vw, 24svh), 280px)',
        },
      })}
    >
      <div aria-hidden="true">
        {confetti.map((c) => (
          <span
            key={`${c.top}-${c.left}`}
            className={css({
              position: 'absolute',
              display: 'block',
              animation: 'drift 6s ease-in-out infinite alternate',
              _motionReduce: { animation: 'none' },
            })}
            style={{
              ...confettiShape[c.shape],
              top: c.top,
              left: c.left,
              background: c.color,
              animationDelay: c.delay,
            }}
          />
        ))}
      </div>

      <main
        className={css({
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          width: '100%',
          maxWidth: '1040px',
          mx: 'auto',
          padding: 'clamp(24px, 12svh, 140px) 24px clamp(16px, 5svh, 48px)',
          [tablet]: {
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: 0,
            paddingTop: 'clamp(24px, 8svh, 96px)',
          },
        })}
      >
        <div>
          <p
            className={css({
              fontFamily: "'Luckiest Guy', cursive",
              fontSize: 'clamp(1.6rem, min(7vw, 8svh), 4.2rem)',
              lineHeight: 1,
              color: colors.orange,
              textShadow: `3px 3px 0 ${colors.ink}`,
              letterSpacing: '0.04em',
              transform: 'rotate(-4deg)',
              transformOrigin: 'left bottom',
              '& span:nth-child(odd)': { color: colors.blue },
            })}
          >
            {[...headline].map((char, i) =>
              char === ' ' ? (
                ' '
              ) : (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: 固定の文字列
                  key={i}
                  aria-hidden="true"
                  className={css({
                    display: 'inline-block',
                    animation: 'hop 2.4s ease-in-out infinite',
                    _motionReduce: { animation: 'none' },
                  })}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  {char}
                </span>
              ),
            )}
            {/* 1文字ずつの span は読み上げないため、見出し全体をここで読ませる。奇数番目を色替えする nth-child がずれないよう最後に置く。 */}
            <span className={css({ srOnly: true })}>{headline}</span>
          </p>

          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              mt: 'clamp(10px, 3.5svh, 28px)',
            })}
          >
            <img
              src="/logo/square.svg"
              alt=""
              className={css({
                flexShrink: 0,
                width: 'clamp(44px, 8vw, 64px)',
                maxWidth: 'none',
                height: 'auto',
              })}
            />
            <h1
              className={css({
                fontWeight: 900,
                fontSize: 'clamp(1.5rem, min(6vw, 6svh), 3.2rem)',
                lineHeight: 1.2,
                textWrap: 'wrap',
                wordBreak: 'normal',
                // マーカーで塗ったような下線
                background: `linear-gradient(transparent 62%, ${colors.lightOrange} 62%, ${colors.lightOrange} 92%, transparent 92%)`,
                px: '0.1em',
              })}
            >
              <small
                className={css({
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.42em',
                  letterSpacing: '0.08em',
                  color: colors.sohosaiOrange,
                })}
              >
                筑波大学学園祭 雙峰祭
              </small>
              企画検索システム
            </h1>
          </div>

          <p
            className={css({
              mt: 'clamp(8px, 2.5svh, 20px)',
              fontFamily: "'Yusei Magic', sans-serif",
              fontSize: 'clamp(0.9rem, min(2.6vw, 2.8svh), 1.2rem)',
              lineHeight: 1.9,
            })}
          >
            お探しのページは見つかりませんでした。
            <br />
            URLが正しいかご確認ください。
          </p>

          <ul
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'clamp(8px, 1.5svh, 12px) 16px',
              mt: 'clamp(12px, 3.5svh, 28px)',
              listStyle: 'none',
              '& li:nth-child(1)': { transform: 'rotate(-2deg)' },
              '& li:nth-child(2)': { transform: 'rotate(1.5deg)' },
            })}
          >
            <li>
              <Link to="/" className={linkButton}>
                トップページへ戻る
              </Link>
            </li>
            <li>
              <a
                href="https://sohosai.com"
                target="_blank"
                rel="noopener"
                className={linkButton}
              >
                雙峰祭公式サイト
                <small
                  className={css({
                    fontWeight: 500,
                    fontSize: '0.8em',
                    opacity: 0.7,
                  })}
                >
                  sohosai.com
                </small>
              </a>
            </li>
          </ul>
        </div>

        <img
          src="/not-found/balloon-sopotan.png"
          alt="風船を持ってふわふわ浮かぶそぽたん"
          className={css({
            flexShrink: 0,
            width: 'clamp(140px, min(30vw, 45svh), 340px)',
            maxWidth: 'none',
            height: 'auto',
            animation: 'float 4.5s ease-in-out infinite',
            _motionReduce: { animation: 'none' },
            // 縦並びでは本文と山の間の空きに浮かべ、高さが足りない画面では縮んで吸収する
            [tablet]: {
              alignSelf: 'flex-end',
              flexShrink: 1,
              minHeight: 0,
              width: 'auto',
              height: 'min(38vw, 26svh, 260px)',
              objectFit: 'contain',
              margin: 'clamp(8px, 3svh, 24px) 10vw 0',
            },
          })}
        />
      </main>

      <div className={css({ position: 'relative' })}>
        <p
          aria-hidden="true"
          className={css({
            position: 'absolute',
            bottom: 'calc(var(--mountain-h) * 0.9)',
            left: 'calc(50% + var(--mountain-h) * 0.35)',
            zIndex: 2,
            bg: 'white',
            border: `2px solid ${colors.ink}`,
            borderRadius: '20px',
            padding: '8px 18px',
            fontFamily: "'Yusei Magic', sans-serif",
            fontSize: 'clamp(0.85rem, 2.2vw, 1.05rem)',
            whiteSpace: 'nowrap',
            transform: 'rotate(4deg)',
            _after: {
              content: '""',
              position: 'absolute',
              left: '16px',
              bottom: '-12px',
              width: '16px',
              height: '12px',
              bg: colors.ink,
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            },
            // 風船そぽたんと重ならないよう左に置き、尻尾を右（山そぽたん側）に向ける
            [tablet]: {
              left: '16px',
              maxWidth: '58vw',
              whiteSpace: 'normal',
              transform: 'rotate(-3deg)',
              _after: {
                left: 'auto',
                right: '16px',
                clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
              },
            },
          })}
        >
          道に迷ってしまったそぽ…
        </p>
        <div
          className={css({
            display: 'flex',
            justifyContent: 'center',
            height: 'var(--mountain-h)',
            overflow: 'hidden',
            background: `linear-gradient(${colors.ground}, ${colors.ground}) left bottom / 100% 26.1% no-repeat`,
          })}
        >
          <img
            src="/not-found/mountain-sopo-wide.png"
            alt="筑波山から顔を出すそぽたん"
            className={css({
              flexShrink: 0,
              height: '100%',
              width: 'auto',
              // preflight の max-width: 100% が効くと、横長の画像が画面幅に縮んで潰れる。
              maxWidth: 'none',
            })}
          />
        </div>
      </div>
    </div>
  );
}

const linkButton = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 24px',
  border: `2px solid ${colors.blue}`,
  borderRadius: '12px',
  bg: 'white',
  color: colors.ink,
  fontWeight: 700,
  textDecoration: 'none',
  transition:
    'background-color .25s ease, color .25s ease, transform .3s cubic-bezier(.34, 1.56, .64, 1)',
  _after: {
    content: '""',
    width: '10px',
    height: '12px',
    bg: colors.blue,
    clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
    transition:
      'transform .3s cubic-bezier(.34, 1.56, .64, 1), background-color .25s ease',
  },
  _hover: {
    bg: colors.blue,
    color: 'white',
    transform: 'scale(1.06)',
    _after: { bg: 'white', transform: 'translateX(4px)' },
  },
});
