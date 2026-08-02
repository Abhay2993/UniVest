import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import {
  applicableSchemes,
  bestScheme,
  formatSchemeMoney,
  reliefFor,
} from '../utils/tax-relief';

const SAMPLE = 10000; // worked-example amount, in the scheme's currency

/**
 * Tax Relief — surfaces the tax-advantaged scheme a deal qualifies for at the
 * point of decision (EIS/SEIS/KI-EIS in the UK, QSBS in the US, ESIC in AU).
 * Mirrors the backend `GET /tax-relief/campaigns/:id/eligibility` + `/estimate`.
 * The applicable scheme is resolved from the spinout's jurisdiction.
 */
export function TaxReliefCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const schemes = applicableSchemes(startup.university.country);
  const best = bestScheme(schemes);
  if (!best) return null;

  const relief = reliefFor(best, SAMPLE);
  const holdYears = Math.round(best.minHoldMonths / 12);
  const others = schemes.filter((x) => x.code !== best.code);

  return (
    <View style={s.card}>
      <Text style={s.overline}>Tax Relief</Text>

      <View style={s.headRow}>
        <View style={s.headMain}>
          <Text style={s.scheme}>{best.name}</Text>
          <Text style={s.sub}>Advance assurance · {best.certificateKind}</Text>
        </View>
        <View style={s.headline}>
          {best.incomeReliefPct > 0 ? (
            <>
              <Text style={s.pct}>{best.incomeReliefPct}%</Text>
              <Text style={s.pctLabel}>income-tax relief</Text>
            </>
          ) : (
            <>
              <Text style={s.pct}>100%</Text>
              <Text style={s.pctLabel}>CGT-exempt</Text>
            </>
          )}
        </View>
      </View>

      {best.incomeReliefPct > 0 ? (
        <Text style={s.worked}>
          Invest {formatSchemeMoney(SAMPLE, best.capCurrency)} → claim{' '}
          <Text style={s.workedStrong}>{formatSchemeMoney(relief.reliefAmount, best.capCurrency)}</Text>{' '}
          back at your marginal rate.
        </Text>
      ) : (
        <Text style={s.worked}>
          No upfront relief, but qualifying gains are{' '}
          <Text style={s.workedStrong}>capital-gains-tax exempt</Text> after the holding period.
        </Text>
      )}

      <View style={s.badgeRow}>
        <Badge label={`${holdYears}-yr hold`} />
        {best.cgtExempt && <Badge label="CGT-exempt" />}
        {best.lossRelief && <Badge label="Loss relief" />}
        {best.annualCap != null && (
          <Badge label={`Cap ${formatSchemeMoney(best.annualCap, best.capCurrency)}/yr`} />
        )}
      </View>

      {others.length > 0 && (
        <Text style={s.also}>
          Also available: {others.map((o) => o.name).join(', ')}.
        </Text>
      )}

      <Text style={s.footnote}>
        Subject to your tax residency and eligibility; certificate issued after the raise closes.
        Not tax advice.
      </Text>
    </View>
  );

  function Badge({ label }: { label: string }) {
    return (
      <View style={s.badge}>
        <Text style={s.badgeText}>{label}</Text>
      </View>
    );
  }
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    card: {
      backgroundColor: c.surfaceGoldTint,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      padding: space.lg,
    },
    overline: { ...T.overline, color: c.bronze },
    headRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.sm },
    headMain: { flex: 1, marginRight: space.md },
    scheme: { fontFamily: font.serif, fontSize: 18, color: c.ink },
    sub: { ...T.caption, marginTop: 2 },
    headline: { alignItems: 'flex-end' },
    pct: { fontFamily: font.serif, fontSize: 30, color: c.bronze, lineHeight: 32, ...tabularNums },
    pctLabel: { fontFamily: font.sans, fontSize: 10, color: c.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

    worked: { ...T.body, fontSize: 14, color: c.ink, marginTop: space.md },
    workedStrong: { fontWeight: '700', color: c.bronze },

    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm as number, marginTop: space.md },
    badge: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      backgroundColor: c.surface,
      borderRadius: radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', color: c.bronze },

    also: { ...T.caption, marginTop: space.md },
    footnote: { ...T.caption, marginTop: space.sm, fontStyle: 'italic' },
  });
};
