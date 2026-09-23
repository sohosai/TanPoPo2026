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
        // グランプリ抽選演出：ルーレットが高速回転してから止まる。
        rouletteSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(1080deg)' },
        },
        // 抽選結果のポップイン（登場時に弾む）。
        resultReveal: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // 当選時のみ：結果の周囲に広がるリング。
        resultRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        // 結果の背後に一瞬広がるグロー。
        resultGlow: {
          '0%': { transform: 'scale(0.3)', opacity: '0.9' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        // 紙吹雪・キラキラ粒子。--dx/--dy/--rot を個別に渡して飛散方向を変える。
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
        // キラキラの明滅。
        sparkleTwinkle: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.6) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.15) rotate(20deg)' },
        },
        // はずれ演出：結果が出た瞬間の小さな首振り。
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
            subtle: { value: '{colors.brand.50}' },
            border: { value: '{colors.brand.100}' },
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
  },

  // The output directory for your css system
  outdir: 'styled-system',
});
