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
          sheet: {
            background: { value: '#ffffff' },
            shadow: { value: 'rgba(0, 0, 0, 0.15)' },
            handle: { value: 'rgba(0, 0, 0, 0.28)' },
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
