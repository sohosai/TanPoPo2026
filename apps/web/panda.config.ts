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
