import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,

  include: ['./app/**/*.{js,jsx,ts,tsx}'],

  exclude: [],

  theme: {
    extend: {
      tokens: {
        colors: {
          brand: {
            50: { value: '#e3effa' },
            100: { value: '#a3c8eb' },
            300: { value: '#76ade1' },
            500: { value: '#4a93d7' },
            700: { value: '#2f6fb0' },
            900: { value: '#1f5a99' },
          },
          sheet: {
            background: { value: '#ffffff' },
            shadow: { value: 'rgba(31, 90, 153, 0.16)' },
            handle: { value: '{colors.brand.100}' },
          },
        },
        radii: {
          sm: { value: '6px' },
          md: { value: '10px' },
          lg: { value: '12px' },
          xl: { value: '16px' },
          '2xl': { value: '22px' },
          full: { value: '9999px' },
        },
        borderWidths: {
          // 一覧の行やヘッダーの区切り線。枠線より細くして、面の区切りが主張しすぎないようにする。
          divider: { value: '1px' },
          thin: { value: '1px' },
          thick: { value: '2px' },
        },
        fontSizes: {
          '2xs': { value: '11px' },
          xs: { value: '12px' },
          sm: { value: '13px' },
          md: { value: '14px' },
          lg: { value: '15px' },
          xl: { value: '16px' },
          '2xl': { value: '21px' },
          '3xl': { value: '28px' },
          '4xl': { value: '30px' },
          '5xl': { value: '36px' },
        },
      },
      keyframes: {
        heartPop: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.4)' },
          '55%': { transform: 'scale(0.85)' },
          '75%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        heartBurst: {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0.3)',
            opacity: '0.7',
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(2)',
            opacity: '0',
          },
        },
        detailEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        detailExit: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
        },
        closeSpin: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '100%': { transform: 'rotate(90deg) scale(0.75)' },
        },
        itemEnter: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        viewerFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        viewerZoom: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        rouletteSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(1080deg)' },
        },
        resultReveal: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        resultRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        resultGlow: {
          '0%': { transform: 'scale(0.3)', opacity: '0.9' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        // 粒子ごとに飛散方向を変えるため、--dx/--dy/--rot を要素側の style で渡す。
        confettiPop: {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
            opacity: '1',
          },
          '65%': { opacity: '1' },
          '100%': {
            transform:
              'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(var(--rot))',
            opacity: '0',
          },
        },
        sparkleTwinkle: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.6) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.15) rotate(20deg)' },
        },
        resultShake: {
          '0%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '40%': { transform: 'rotate(7deg)' },
          '60%': { transform: 'rotate(-5deg)' },
          '80%': { transform: 'rotate(3deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
      semanticTokens: {
        colors: {
          accent: {
            DEFAULT: { value: '{colors.brand.500}' },
            // brand.500 は白背景上の文字としてはコントラストが足りないため、文字用に濃い版を持つ。
            text: { value: '{colors.brand.700}' },
            subtle: { value: '{colors.brand.50}' },
            border: { value: '{colors.brand.100}' },
            // 押せる主役（主要ボタン・イベントへの導線）の下に敷く硬い影の色。
            deep: { value: '{colors.brand.900}' },
          },
          // たんぽぽの花の黄色。楽しさを足す差し色として、使う場所を絞る。上に載せる文字は fg.strong にする。
          sun: {
            DEFAULT: { value: '#ffc83d' },
            subtle: { value: '#fff6d9' },
          },
          // 企画の分類。分類の識別にだけ使い、`accent`とは混ぜない。暗くすると茶色に濁る橙系は避ける。
          // DEFAULT は地図のテントやピンの塗り。bg は分類タグと画像のない企画のアイコンの面で、上の文字は分類によらず fg にする。
          category: {
            food: { DEFAULT: { value: '#f9c310' }, bg: { value: '#fdeebc' } },
            goods: { DEFAULT: { value: '#ec659f' }, bg: { value: '#fad4e4' } },
            exhibit: {
              DEFAULT: { value: '#39c684' },
              bg: { value: '#c8efdd' },
            },
            academic: {
              DEFAULT: { value: '#9679ec' },
              bg: { value: '#e2d9fa' },
            },
            stage: { DEFAULT: { value: '#3aaddf' }, bg: { value: '#c8e8f6' } },
            other: { DEFAULT: { value: '#8d9bb0' }, bg: { value: '#dfe3e9' } },
          },
          // 文字・アイコンの色。濃いほど主要な情報に使う。
          fg: {
            // 本文。
            DEFAULT: { value: '#2e3745' },
            // 企画名・入力文字など、特に目立たせたい文字。
            strong: { value: '#1f2834' },
            // 閉じるボタン・補足説明などの副次的な文字。
            muted: { value: '#4b5665' },
            // 注釈・未選択状態など、さらに控えめな文字。
            subtle: { value: '#647182' },
            // 入力欄のプレースホルダーと、無効状態の文字。
            placeholder: { value: '#8b96a5' },
          },
          border: {
            DEFAULT: { value: '#d3deea' },
            subtle: { value: '#eef3f9' },
          },
          surface: {
            DEFAULT: { value: '#ffffff' },
            muted: { value: '#828fa3' },
          },
          favorite: {
            // サーモンピンク。白地との差が小さいため、文字には text を使う。
            DEFAULT: { value: '#ff7965' },
            text: { value: '#bf3722' },
            inactive: { value: '#bdc4ce' },
            subtle: { value: '#fff1ee' },
          },
          sns: {
            x: { value: '{colors.black}' },
            instagram: { value: '#d62976' },
            youtube: { value: '#ff0000' },
          },
          logo: { value: '#ff0000' },
          overlay: {
            scrim: { value: '{colors.black/55}' },
            viewer: { value: 'rgba(10, 10, 12, 0.96)' },
            glass: { value: '{colors.white/12}' },
            glassHover: { value: '{colors.white/22}' },
            frosted: { value: '{colors.white/40}' },
            frostedHover: { value: '{colors.white/60}' },
            frostedBorder: { value: '{colors.white/30}' },
            control: { value: '{colors.white/95}' },
            tooltip: { value: '{colors.fg.strong/88}' },
          },
          result: {
            lose: { value: '#1f3a5f' },
            winGlow: { value: '{colors.brand.500/45}' },
            loseGlow: { value: '{colors.result.lose/35}' },
            confetti: {
              gold: { value: '#b28827' },
              blue: { value: '{colors.brand.500}' },
              mint: { value: '#24a263' },
            },
            dust: {
              light: { value: '#ced3db' },
              mid: { value: '#b0b8c4' },
              dark: { value: '#96a1b1' },
            },
          },
          // MapLibre は CSS 変数を解釈できないため、地図で使う色は16進の値で持つ。
          map: {
            campusBuilding: { value: '#97bbdc' },
            basemapBuilding: { value: '#d9d9d2' },
          },
          debug: {
            path: { value: '#ff5a36' },
            entrance: { value: '#2e9e5b' },
            label: { value: '#0a6b6b' },
            labelBg: { value: '{colors.white/82}' },
          },
        },
        shadows: {
          // 影は黒ではなくブランドの青を帯びさせ、ふんわり浮かせて軽く見せる。
          card: {
            value:
              // 参照を2つ並べると Panda が1つの参照として読み違えるため、影の色は accent.deep（#1f5a99）の値で書く。
              '0 0 0 1px {colors.border.subtle}, 0 6px 16px -8px rgba(31, 90, 153, 0.25)',
          },
          pop: { value: '0 6px 14px -6px {colors.accent.deep/55}' },
          tab: { value: '0 1px 4px {colors.accent.deep/15}' },
          bar: { value: '0 -4px 12px {colors.black/5}' },
          float: { value: '0 4px 12px -2px {colors.accent.deep/30}' },
          raised: { value: '0 10px 24px -8px {colors.accent.deep/35}' },
          carousel: { value: '0 4px 12px -2px {colors.accent.deep/25}' },
          ring: { value: 'inset 0 0 0 1px {colors.black/8}' },
          win: { value: '0 8px 28px {colors.brand.500/50}' },
          lose: { value: '0 8px 24px {colors.result.lose/40}' },
          sheet: { value: '0 -8px 24px {colors.sheet.shadow}' },
          panel: { value: '0 0 20px {colors.sheet.shadow}' },
          panelTab: { value: '4px 0 8px {colors.sheet.shadow}' },
        },
      },
    },
  },

  globalCss: {
    'html, body, #root': {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    },
    body: {
      fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
      color: 'fg',
      WebkitFontSmoothing: 'antialiased',
    },
    'button, input, textarea': {
      fontFamily: 'inherit',
    },
    // Tabler の既定の線幅（2）はロゴの太い線と並ぶと細く見えるため、全体で太くする。
    // stroke を個別に指定したアイコンは、その指定を優先する。
    '.tabler-icon[stroke-width="2"]': {
      strokeWidth: '2.5',
    },
    // 現在地は MapControls の独自ボタンから操作するため、MapLibre 標準のボタンは出さない。
    '.maplibregl-ctrl-group:has(> .maplibregl-ctrl-geolocate)': {
      display: 'none',
    },
  },

  outdir: 'styled-system',
});
