// ─────────────────────────────────────────────────────────────────────────
// FlexBudget design tokens — light / minimal.
// Pure white, heavy near-black type, one vivid green accent, soft gray fills,
// big display numbers, and black pill buttons. Inspired by clean, bold
// minimal fitness/finance UI. Everything in the UI reads from here.
// ─────────────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F5', // light gray fill (empty cells, inputs, chips)
  elevated: '#FFFFFF',

  // Lines
  border: '#ECEDEF',
  hairline: '#F0F1F2',

  // Text
  text: '#0B0C0E', // near-black, headings & numbers
  textMuted: '#9A9EA6', // secondary gray
  textFaint: '#C4C8CE', // faint gray (day labels, hints)
  onAccent: '#FFFFFF',

  // Ink = primary action (black pill buttons / active states)
  ink: '#0B0C0E',
  onInk: '#FFFFFF',

  // Vivid green accent — highlights, positive, active data
  primary: '#06C167',
  primarySoft: '#D9F7E7', // mint tint (partial heatmap-style fills)
  primaryFaint: '#EAFBF2',

  // Semantic
  positive: '#06C167',
  positiveSoft: '#D9F7E7',
  negative: '#FF4D4F',
  negativeSoft: '#FFE5E5',
  warning: '#F5A623',
  warningSoft: '#FDEFD6',

  // Accent ramp for subtle data viz
  ramp: ['#06C167', '#0B0C0E', '#F5A623', '#7C5CFF', '#19B5C9', '#FF4D4F'],
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
  size: { xs: 12, sm: 13, md: 15, lg: 18, xl: 24, xxl: 30, display: 46 },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  } as const,
  // Tight tracking on big bold numbers reads as "designed".
  tracking: { tight: -1, snug: -0.4, normal: 0, wide: 0.4, caps: 1 },
};

// Very soft elevation — on white we lean on hairlines, not heavy shadows.
export const elevation = {
  card: {
    shadowColor: '#0B0C0E',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  floating: {
    shadowColor: '#0B0C0E',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};
