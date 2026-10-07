import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ['./app/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        colors: {
          // ブランドのティール系パレット（生の値）。
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
      // いいねの演出。ハートのポップと拡散リング。
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
        // 一覧 → 詳細へ入るときの入場アニメ（軽くスライドアップ＋フェード）。
        detailEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
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
      // 役割ベースの色。コンポーネントからはこちらを参照する。
      semanticTokens: {
        colors: {
          accent: {
            DEFAULT: { value: '{colors.brand.500}' },
            // brand.500 は白背景上の文字としてはコントラストが足りないため、文字用に濃い版を持つ。
            text: { value: '#1d7f7f' },
            subtle: { value: '{colors.brand.50}' },
            border: { value: '{colors.brand.100}' },
          },
          // 企画の分類バッジ用。分類の識別にだけ使い、操作色(accent)とは混ぜない。
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
          fg: {
            DEFAULT: { value: '#333333' },
            strong: { value: '#222222' },
            muted: { value: '#555555' },
            subtle: { value: '#888888' },
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
          },
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

  // The output directory for your css system
  outdir: 'styled-system',
});
