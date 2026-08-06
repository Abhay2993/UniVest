import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { formatMoney, formatMoneyCompact } from '../utils/format';
import { allocateBudget, indexComposition } from '../utils/index-fund';

const QUIET = LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity);
const BUDGETS = [2500, 10000, 50000];
const BARS: { label: string; value: number }[] = [
  { label: 'All deals', value: 0 },
  { label: '≥1 attested', value: 1 },
  { label: '≥2 attested', value: 2 },
];
const MAX_PER_DEAL_PCT = 25;

/**
 * Invest in the Index — the benchmark's investable counterpart. A budget is auto-
 * allocated across the qualifying live deals (a diligence bar on attested
 * milestones, capped per deal), one-off or as a quarterly rolling fund. Mirrors
 * the backend `POST /index/mandates` + `/preview`.
 */
export function IndexInvestCard({ startups }: { startups: Startup[] }) {
  const s = useThemedStyles(makeStyles);
  const [budget, setBudget] = useState(10000);
  const [quarterly, setQuarterly] = useState(true);
  const [minAttested, setMinAttested] = useState(1);
  const [active, setActive] = useState(false);

  const composition = useMemo(
    () => indexComposition(startups, { minAttested, verticals: [] }),
    [startups, minAttested],
  );
  const plan = useMemo(
    () =>
      allocateBudget(
        budget,
        composition.constituents.map((c) => ({ startupId: c.startupId, capacity: c.capacity })),
        MAX_PER_DEAL_PCT,
      ),
    [budget, composition],
  );
  const nameById = useMemo(
    () => new Map(composition.constituents.map((c) => [c.startupId, c.startupName])),
    [composition],
  );

  const pick = (fn: () => void) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(QUIET);
    setActive(false);
    fn();
  };

  return (
    <View style={s.card}>
      <Text style={s.overline}>Invest in the Index</Text>
      <Text style={s.hint}>
        Auto-allocate across every deal clearing the diligence bar — equal-weighted, max{' '}
        {MAX_PER_DEAL_PCT}% per deal. One decision, a diversified deep-tech book.
      </Text>

      <Text style={s.groupLabel}>Budget</Text>
      <View style={s.chipRow}>
        {BUDGETS.map((b) => (
          <Chip key={b} label={formatMoneyCompact(b)} on={budget === b} onPress={() => pick(() => setBudget(b))} />
        ))}
      </View>

      <Text style={s.groupLabel}>Cadence</Text>
      <View style={s.chipRow}>
        <Chip label="One-off" on={!quarterly} onPress={() => pick(() => setQuarterly(false))} />
        <Chip label="Quarterly (rolling)" on={quarterly} onPress={() => pick(() => setQuarterly(true))} />
      </View>

      <Text style={s.groupLabel}>Diligence bar</Text>
      <View style={s.chipRow}>
        {BARS.map((b) => (
          <Chip key={b.value} label={b.label} on={minAttested === b.value} onPress={() => pick(() => setMinAttested(b.value))} />
        ))}
      </View>

      {/* Live allocation preview */}
      <View style={s.previewHead}>
        <Text style={s.previewTitle}>
          {composition.count} deals · {formatMoney(plan.deployed)} deployed
          {plan.undeployed > 0 ? ` · ${formatMoney(plan.undeployed)} uninvested` : ''}
        </Text>
      </View>
      {composition.count === 0 ? (
        <Text style={s.empty}>No deals clear this bar — lower it to build the index.</Text>
      ) : (
        plan.allocations.map((a, i) => (
          <View key={a.startupId} style={[s.row, i === plan.allocations.length - 1 && s.rowLast]}>
            <View style={s.dot} />
            <Text style={s.rowName} numberOfLines={1}>{nameById.get(a.startupId)}</Text>
            <Text style={s.rowPct}>{Math.round((a.amount / budget) * 100)}%</Text>
            <Text style={s.rowAmt}>{formatMoney(a.amount)}</Text>
          </View>
        ))
      )}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setActive(true);
        }}
        disabled={composition.count === 0}
        style={[s.cta, (composition.count === 0 || active) && s.ctaDisabled]}
        accessibilityRole="button"
      >
        <Text style={s.ctaText}>
          {active
            ? `✓ Auto-invest active${quarterly ? ' · renews quarterly' : ''}`
            : `Set up auto-invest${quarterly ? ' — ' + formatMoneyCompact(budget) + '/quarter' : ''}`}
        </Text>
      </Pressable>
    </View>
  );

  function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        style={[s.chip, on ? s.chipOn : s.chipOff]}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
      >
        <Text style={[s.chipText, on ? s.chipTextOn : s.chipTextOff]}>{label}</Text>
      </Pressable>
    );
  }
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
    },
    overline: { ...T.overline },
    hint: { ...T.caption, marginTop: space.sm, marginBottom: space.md },

    groupLabel: { fontFamily: font.sans, fontSize: 10, fontWeight: '700', color: c.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: space.sm, marginBottom: space.xs },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm as number },
    chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 6 },
    chipOn: { backgroundColor: c.navy, borderColor: c.navy },
    chipOff: { backgroundColor: c.background, borderColor: c.hairline },
    chipText: { fontFamily: font.sans, fontSize: 12, fontWeight: '600' },
    chipTextOn: { color: '#F5F7FA' },
    chipTextOff: { color: c.inkMuted },

    previewHead: {
      marginTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
    },
    previewTitle: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.ink, ...tabularNums },
    empty: { ...T.caption, marginTop: space.sm },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
    rowLast: {},
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.bronze, marginRight: space.sm },
    rowName: { flex: 1, fontFamily: font.sans, fontSize: 13, color: c.ink, marginRight: space.sm },
    rowPct: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted, width: 44, textAlign: 'right', ...tabularNums },
    rowAmt: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.ink, width: 90, textAlign: 'right', ...tabularNums },

    cta: {
      marginTop: space.md,
      backgroundColor: c.navy,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: 'center',
    },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { fontFamily: font.sans, fontSize: 14, fontWeight: '700', color: '#F5F7FA' },
  });
};
