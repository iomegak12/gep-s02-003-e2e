// Typography configuration derived from front-end/docs/ui-artifacts/DESIGN.md.
// All variants use Roboto; body text is 12px (the spec's "data-dense" baseline).

import { configureFonts } from 'react-native-paper';

const FAMILY = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  semibold: 'Roboto_700Bold',
  bold: 'Roboto_700Bold',
};

// MD3 variant overrides — size + weight + line-height per DESIGN.md.
const variants = {
  // Display (KPIs) — display-kpi
  displayLarge:   { fontFamily: FAMILY.bold,    fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: -0.5 },
  displayMedium:  { fontFamily: FAMILY.bold,    fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: -0.5 },
  displaySmall:   { fontFamily: FAMILY.bold,    fontSize: 22, fontWeight: '700', lineHeight: 30 },

  // Headlines — section titles
  headlineLarge:  { fontFamily: FAMILY.semibold, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  headlineMedium: { fontFamily: FAMILY.semibold, fontSize: 20, fontWeight: '600', lineHeight: 26 },
  headlineSmall:  { fontFamily: FAMILY.semibold, fontSize: 18, fontWeight: '600', lineHeight: 24 },

  // Titles — card headers, screen sub-headers (headline-sm = 16px)
  titleLarge:     { fontFamily: FAMILY.semibold, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  titleMedium:    { fontFamily: FAMILY.medium,   fontSize: 14, fontWeight: '500', lineHeight: 20 },
  titleSmall:     { fontFamily: FAMILY.medium,   fontSize: 13, fontWeight: '500', lineHeight: 18 },

  // Body — main content (body-md = 12px, body-sm = 11px)
  bodyLarge:      { fontFamily: FAMILY.regular,  fontSize: 12, fontWeight: '400', lineHeight: 18 },
  bodyMedium:     { fontFamily: FAMILY.regular,  fontSize: 12, fontWeight: '400', lineHeight: 18 },
  bodySmall:      { fontFamily: FAMILY.regular,  fontSize: 11, fontWeight: '400', lineHeight: 16 },

  // Labels — table-header (11/500/14), label-caps (10/700/12 with letter-spacing)
  labelLarge:     { fontFamily: FAMILY.medium,   fontSize: 12, fontWeight: '500', lineHeight: 16 },
  labelMedium:    { fontFamily: FAMILY.medium,   fontSize: 11, fontWeight: '500', lineHeight: 14 },
  labelSmall:     { fontFamily: FAMILY.bold,     fontSize: 10, fontWeight: '700', lineHeight: 12, letterSpacing: 0.5 },

  // Default — what Paper falls back to when no variant is specified.
  default:        { fontFamily: FAMILY.regular,  fontSize: 12, fontWeight: '400', lineHeight: 18 },
};

export const paperFonts = configureFonts({ config: variants });

export const FONT_FAMILY = FAMILY;
