/** Official Compras Abertas visual tokens. Keep in sync with globals.css. */
export const brandTokens = {
  colors: {
    institutional: '#123B5D',
    primary: '#2563A6',
    softBlue: '#EAF3F8',
    opportunity: '#D9A441',
    graphite: '#25313C',
    white: '#FFFFFF',
  },
  typography: {
    family: 'var(--font-sans)',
    monoFamily: 'var(--font-mono)',
    sizes: {
      '2xs': 'var(--text-2xs)',   // 12px
      xs: 'var(--text-xs)',       // 13px
      sm: 'var(--text-sm)',       // 14px
      base: 'var(--text-base)',   // 16px
      md: 'var(--text-md)',       // 17px
      lg: 'var(--text-lg)',       // 20px
      xl: 'var(--text-xl)',       // 24px
      '2xl': 'var(--text-2xl)',   // 30px
      '3xl': 'var(--text-3xl)',   // clamp(30px, 2.5vw, 36px)
    },
    pxSizes: {
      '2xs': '12px',
      xs: '13px',
      sm: '14px',
      base: '16px',
      md: '17px',
      lg: '20px',
      xl: '24px',
      '2xl': '30px',
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeights: {
      tight: 1.22,
      snug: 1.38,
      normal: 1.55,
      relaxed: 1.66,
    },
  },
  radius: { small: 9, medium: 14, large: 22 },
} as const

