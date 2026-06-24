// ─────────────────────────────────────────────────────────────────────────
// FlexBudget design tokens — refined minimal (dark).
// One restrained accent, calm neutrals, clear semantic colors, a tight type
// scale, and soft elevation. Everything in the UI should read from here.
// ─────────────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces (near-black → progressively lighter)
  bg: '#0B0D10',
  surface: '#14171C',
  surfaceAlt: '#1B1F26',
  elevated: '#20252D',

  // Lines
  border: '#23282F',
  hairline: 'rgba(255,255,255,0.06)',

  // Text
  text: '#F4F6F8',
  textMuted: '#8B939F',
  textFaint: '#5A626D',
  onAccent: '#08111F',

  // Single restrained accent
  primary: '#4F7CFF',
  primarySoft: 'rgba(79,124,255,0.14)',

  // Semantic (variance / status)
  positive: '#3DD68C',
  positiveSoft: 'rgba(61,214,140,0.14)',
  negative: '#F4685E',
  negativeSoft: 'rgba(244,104,94,0.14)',
  warning: '#F5B544',
  warningSoft: 'rgba(245,181,68,0.14)',

  // Category/accent ramp for subtle data viz
  ramp: ['#4F7CFF', '#3DD68C', '#F5B544', '#C77DFF', '#5AD1E0', '#F4685E'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const font = {
  size: { xs: 12, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, display: 40 },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  } as const,
  // Subtle negative tracking on large numbers reads as "designed".
  tracking: { tight: -0.5, normal: 0, wide: 0.4, caps: 1.1 },
};

// Soft, low-contrast elevation for cards (Android elevation + iOS shadow).
export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
};
