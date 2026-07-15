/**
 * UniVest design tokens — institutional / private-wealth aesthetic.
 *
 * Rules encoded here:
 *  - Deep navy dominates; champagne gold appears only on primary CTAs,
 *    verified badges, and highlight metrics.
 *  - Border radii capped at 4–8px. No pill shapes, no playful curves.
 *  - Serif display type for headers (academic-publishing gravitas),
 *    geometric sans for body, tabular numerals for all financial figures.
 */
import { Platform, TextStyle } from 'react-native';

export const color = {
  // Primary institutional palette
  navy: '#0A192F',
  navyDeep: '#0D1E36',
  charcoal: '#050C16',

  // Champagne gold / bronze — use sparingly
  gold: '#D4AF37',
  bronze: '#C5A059',

  // Surfaces (light mode)
  background: '#F9F9FB',
  surface: '#FFFFFF',
  surfaceMuted: '#ECEFF1',

  // Strokes & dividers — hairlines, never heavy
  hairline: '#E3E7EC',
  hairlineOnNavy: 'rgba(255,255,255,0.12)',

  // Typography
  ink: '#0A192F',
  inkMuted: '#5B6B7E',
  inkFaint: '#8B97A6',
  onNavy: '#F5F7FA',
  onNavyMuted: 'rgba(245,247,250,0.64)',

  // Data visualization
  emerald: '#1B7A55', // growth
  projection: '#4A6E96', // muted blue projections
  amber: '#B0821F', // in-progress states (desaturated gold)

  danger: '#9B3B3B',
} as const;

export const font = {
  /** High-contrast serif for headers — Playfair/Lora in production builds;
   *  Georgia/serif system fallbacks keep this runnable without font assets. */
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' })!,
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

export const type = {
  display: { fontFamily: font.serif, fontSize: 30, lineHeight: 38, color: color.ink },
  title: { fontFamily: font.serif, fontSize: 22, lineHeight: 28, color: color.ink },
  heading: { fontFamily: font.serif, fontSize: 17, lineHeight: 24, color: color.ink },
  /** Letter-spaced small caps for section labels — quiet authority. */
  overline: {
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: color.inkMuted,
  },
  body: { fontFamily: font.sans, fontSize: 14, lineHeight: 21, color: color.ink },
  caption: { fontFamily: font.sans, fontSize: 12, lineHeight: 17, color: color.inkMuted },
  financial: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: color.ink,
    ...tabularNums,
  },
} as const;
