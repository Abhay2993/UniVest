/**
 * UniVest design tokens — institutional / private-wealth aesthetic.
 *
 * Rules encoded here:
 *  - Deep navy dominates; champagne gold appears only on primary CTAs,
 *    verified badges, watchlist marks, and highlight metrics.
 *  - Border radii capped at 4–8px. No pill shapes, no playful curves.
 *  - Serif display type for headers (Playfair Display, loaded via expo-font),
 *    geometric sans for body, tabular numerals for all financial figures.
 *  - Two palettes: off-white light mode and rich charcoal dark mode
 *    (#050C16), selected by ThemeContext.
 */
import { Platform, TextStyle } from 'react-native';

export interface Palette {
  /** Institutional anchors */
  navy: string;
  navyDeep: string;
  charcoal: string;
  /** Champagne gold / bronze — use sparingly */
  gold: string;
  bronze: string;
  /** Surfaces */
  background: string;
  surface: string;
  surfaceMuted: string;
  /** Gold-tinted selected surface (university tiles, active chips) */
  surfaceGoldTint: string;
  /** Strokes & dividers — hairlines, never heavy */
  hairline: string;
  hairlineOnNavy: string;
  /** Typography */
  ink: string;
  inkMuted: string;
  inkFaint: string;
  onNavy: string;
  onNavyMuted: string;
  /** Data visualization */
  emerald: string;
  projection: string;
  amber: string;
  danger: string;
  /**
   * Categorical chart palette (fixed assignment order, never cycled) —
   * validated per-surface with the dataviz six-checks script.
   */
  chartCategorical: readonly [string, string, string, string];
}

export const lightPalette: Palette = {
  navy: '#0A192F',
  navyDeep: '#0D1E36',
  charcoal: '#050C16',

  gold: '#D4AF37',
  bronze: '#C5A059',

  background: '#F9F9FB',
  surface: '#FFFFFF',
  surfaceMuted: '#ECEFF1',
  surfaceGoldTint: '#FBF7EC',

  hairline: '#E3E7EC',
  hairlineOnNavy: 'rgba(255,255,255,0.12)',

  ink: '#0A192F',
  inkMuted: '#5B6B7E',
  inkFaint: '#8B97A6',
  onNavy: '#F5F7FA',
  onNavyMuted: 'rgba(245,247,250,0.64)',

  emerald: '#1B7A55',
  projection: '#4A6E96',
  amber: '#B0821F',
  danger: '#9B3B3B',
  chartCategorical: ['#3E6FB0', '#B8860B', '#7D5BA6', '#1B7A55'],
};

export const darkPalette: Palette = {
  navy: '#0A192F',
  navyDeep: '#0D1E36',
  charcoal: '#050C16',

  gold: '#D4AF37',
  bronze: '#C5A059',

  background: '#050C16',
  surface: '#0A1626',
  surfaceMuted: '#12213A',
  surfaceGoldTint: 'rgba(212,175,55,0.08)',

  hairline: 'rgba(255,255,255,0.10)',
  hairlineOnNavy: 'rgba(255,255,255,0.12)',

  ink: '#F5F7FA',
  inkMuted: '#94A3B6',
  inkFaint: '#5E6E80',
  onNavy: '#F5F7FA',
  onNavyMuted: 'rgba(245,247,250,0.64)',

  emerald: '#2FA97C',
  projection: '#7A9CC4',
  amber: '#C9971F',
  danger: '#C05B5B',
  chartCategorical: ['#5B8AD1', '#B08410', '#9C77C4', '#2FA97C'],
};

export const font = {
  /** High-contrast serif for headers — Playfair Display via expo-font. */
  serif: 'PlayfairDisplay_500Medium',
  /** Precise geometric sans for body & financials (SF Pro / Roboto). */
  sans: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' })!,
} as const;

/** Apply to every financial figure so columns of digits align. */
export const tabularNums: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

export const radius = {
  sm: 4,
  md: 6,
  lg: 8, // hard maximum per design spec
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Palette-aware type ramp. Call inside a style factory: `const T = typeStyles(c)`. */
export const typeStyles = (c: Palette) =>
  ({
    display: { fontFamily: font.serif, fontSize: 30, lineHeight: 38, color: c.ink },
    title: { fontFamily: font.serif, fontSize: 22, lineHeight: 28, color: c.ink },
    heading: { fontFamily: font.serif, fontSize: 17, lineHeight: 24, color: c.ink },
    /** Letter-spaced small caps for section labels — quiet authority. */
    overline: {
      fontFamily: font.sans,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 1.6,
      textTransform: 'uppercase' as const,
      color: c.inkMuted,
    },
    body: { fontFamily: font.sans, fontSize: 14, lineHeight: 21, color: c.ink },
    caption: { fontFamily: font.sans, fontSize: 12, lineHeight: 17, color: c.inkMuted },
    financial: {
      fontFamily: font.sans,
      fontSize: 14,
      lineHeight: 20,
      color: c.ink,
      ...tabularNums,
    },
  }) as const;
