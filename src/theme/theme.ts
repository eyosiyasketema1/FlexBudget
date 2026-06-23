// Central design tokens. Dark-first, money-app legible.
export const colors = {
  bg: '#0E1116',
  surface: '#171B22',
  surfaceAlt: '#1F2530',
  border: '#2A313D',
  text: '#E8ECF2',
  textMuted: '#9AA4B2',
  primary: '#4F8CFF',
  // Variance semantics
  positive: '#34D399', // saved / under budget
  negative: '#F87171', // over budget
  warning: '#FBBF24',
  locked: '#6B7280',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 34 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' } as const,
};
