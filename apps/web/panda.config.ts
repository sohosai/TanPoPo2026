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
            50: { value: '#eef6f6' },
            100: { value: '#bfe9e9' },
            500: { value: '#3bb6b6' },
          },
          sheet: {
            background: { value: '#ffffff' },
            shadow: { value: 'rgba(0, 0, 0, 0.15)' },
            handle: { value: 'rgba(0, 0, 0, 0.28)' },
          },
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
            text: { value: '#1d7f7f' },
            subtle: { value: '{colors.brand.50}' },
            border: { value: '{colors.brand.100}' },
          },
          // 企画の分類バッジ用。分類の識別にだけ使い、`accent`とは混ぜない。
          category: {
            food: { DEFAULT: { value: '#c2410c' }, bg: { value: '#fff1e6' } },
            goods: { DEFAULT: { value: '#be185d' }, bg: { value: '#fdeef5' } },
            exhibit: {
              DEFAULT: { value: '#1d4ed8' },
              bg: { value: '#ebf1ff' },
            },
            academic: {
              DEFAULT: { value: '#6d28d9' },
              bg: { value: '#f3edff' },
            },
            stage: { DEFAULT: { value: '#0f766e' }, bg: { value: '#e6f6f4' } },
            other: { DEFAULT: { value: '#525866' }, bg: { value: '#f0f1f3' } },
          },
          // 文字・アイコンの色。濃いほど主要な情報に使う。
          fg: {
            // 本文。
            DEFAULT: { value: '#333333' },
            // 企画名・入力文字など、特に目立たせたい文字。
            strong: { value: '#222222' },
            // 閉じるボタン・補足説明などの副次的な文字。
            muted: { value: '#555555' },
            // 注釈・未選択状態など、さらに控えめな文字。
            subtle: { value: '#888888' },
            // 入力欄のプレースホルダーと、無効状態の文字。
            placeholder: { value: '#9aa5a5' },
          },
          border: {
            DEFAULT: { value: '#d4dede' },
            subtle: { value: '#eef3f3' },
          },
          surface: {
            DEFAULT: { value: '#ffffff' },
            muted: { value: '#9e9e9e' },
          },
          favorite: {
            DEFAULT: { value: '#ff6b81' },
            inactive: { value: '#cccccc' },
            subtle: { value: '{colors.favorite/10}' },
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
              gold: { value: '#ffd166' },
              blue: { value: '#4a93d7' },
              mint: { value: '#7ed6a5' },
            },
            dust: {
              light: { value: '#c7d6d6' },
              mid: { value: '#b8c2c2' },
              dark: { value: '#9aa5a5' },
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
          card: { value: '0 1px 3px {colors.black/6}' },
          tab: { value: '0 1px 4px {colors.black/12}' },
          bar: { value: '0 -4px 12px {colors.black/5}' },
          float: { value: '0 2px 8px {colors.black/18}' },
          raised: { value: '0 4px 20px {colors.black/18}' },
          carousel: { value: '0 4px 12px {colors.black/10}' },
          ring: { value: 'inset 0 0 0 1px {colors.black/8}' },
          win: { value: '0 8px 28px {colors.brand.500/50}' },
          lose: { value: '0 8px 24px {colors.result.lose/40}' },
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
    // 現在地は MapControls の独自ボタンから操作するため、MapLibre 標準のボタンは出さない。
    '.maplibregl-ctrl-group:has(> .maplibregl-ctrl-geolocate)': {
      display: 'none',
    },
  },

  outdir: 'styled-system',
});
