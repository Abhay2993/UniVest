import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { STARTUPS } from '../data/mock';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import {
  FactorSlice,
  portfolioFactorExposure,
  portfolioUnderScenario,
  PositionLike,
  SCENARIOS,
} from '../utils/quant';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const startupOf = (id: string) => STARTUPS.find((s) => s.id === id);

/**
 * Factor-based portfolio analytics (no return series required) + scenario
 * stress testing driven by the same milestone-tree Monte Carlo used on each
 * deal page. Surfaces concentration honestly and shows how sector shocks
 * revalue the book.
 */
export function PortfolioRiskCard({ positions }: { positions: PositionLike[] }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [scenarioId, setScenarioId] = useState('baseline');

  const fx = useMemo(() => portfolioFactorExposure(positions, startupOf), [positions]);

  const baseline = useMemo(
    () => portfolioUnderScenario(positions, startupOf, SCENARIOS[0]),
    [positions],
  );
  const selected = useMemo(
    () => portfolioUnderScenario(positions, startupOf, SCENARIOS.find((x) => x.id === scenarioId)!),
    [positions, scenarioId],
  );

  const cats = palette.chartCategorical;
  const expectedDelta = selected.expectedMultiple - baseline.expectedMultiple;
  const lossDelta = selected.pTotalLoss - baseline.pTotalLoss;

  return (
    <View style={s.card}>
      <Text style={s.overline}>Portfolio Risk — Factor Exposure</Text>
      <Text style={s.note}>{fx.note}</Text>

      <FactorGroup title="By vertical" slices={fx.byVertical} colors={cats} s={s} />
      <FactorGroup title="By technology readiness" slices={fx.byTRL} colors={cats} s={s} />
      <FactorGroup title="By time to liquidity" slices={fx.byLiquidity} colors={cats} s={s} />

      <View style={s.divider} />

      <Text style={s.overline}>Scenario Stress Test</Text>
      <Text style={s.hint}>
        Applies a sector shock to the milestone model and revalues the book. Institutional stress
        testing, retail-legible.
      </Text>
      <View style={s.scenarioRow}>
        {SCENARIOS.map((sc) => (
          <Pressable
            key={sc.id}
            style={[s.scenChip, scenarioId === sc.id && s.scenChipActive]}
            onPress={() => {
              LayoutAnimation.configureNext(QUIET_EASE);
              setScenarioId(sc.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: scenarioId === sc.id }}
          >
            <Text style={[s.scenText, scenarioId === sc.id && s.scenTextActive]}>{sc.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.scenDetail}>{selected.scenario.detail}</Text>

      <View style={s.resultRow}>
        <View style={s.resultBlock}>
          <Text style={s.resultValue}>{selected.expectedMultiple.toFixed(2)}×</Text>
          <Text style={s.resultLabel}>Expected multiple</Text>
          {scenarioId !== 'baseline' && (
            <Text style={[s.delta, { color: expectedDelta < 0 ? palette.danger : palette.emerald }]}>
              {expectedDelta >= 0 ? '+' : ''}
              {expectedDelta.toFixed(2)}× vs baseline
            </Text>
          )}
        </View>
        <View style={[s.resultBlock, s.resultRight]}>
          <Text style={[s.resultValue, { color: palette.amber }]}>
            {Math.round(selected.pTotalLoss * 100)}%
          </Text>
          <Text style={s.resultLabel}>P(total loss)</Text>
          {scenarioId !== 'baseline' && (
            <Text style={[s.delta, { color: lossDelta > 0 ? palette.danger : palette.emerald }]}>
              {lossDelta >= 0 ? '+' : ''}
              {Math.round(lossDelta * 100)} pts vs baseline
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function FactorGroup({
  title,
  slices,
  colors,
  s,
}: {
  title: string;
  slices: FactorSlice[];
  colors: readonly string[];
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.group}>
      <Text style={s.groupTitle}>{title}</Text>
      {/* Segmented bar — 2px surface gaps between segments */}
      <View style={s.stackBar}>
        {slices.map((slice, i) => (
          <View
            key={slice.label}
            style={[
              s.segment,
              {
                flex: Math.max(slice.weight, 0.001),
                backgroundColor: colors[i % colors.length],
                marginLeft: i === 0 ? 0 : 2,
              },
            ]}
          />
        ))}
      </View>
      {slices.map((slice, i) => (
        <View key={slice.label} style={s.legendRow}>
          <View style={[s.swatch, { backgroundColor: colors[i % colors.length] }]} />
          <Text style={s.legendLabel}>{slice.label}</Text>
          <Text style={s.legendValue}>{Math.round(slice.weight * 100)}%</Text>
        </View>
      ))}
    </View>
  );
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
      marginHorizontal: space.md,
      marginBottom: space.md,
    },
    overline: { ...T.overline },
    note: {
      ...T.body,
      fontSize: 13,
      lineHeight: 20,
      marginTop: space.sm,
      marginBottom: space.md,
      color: c.ink,
    },
    hint: { ...T.caption, fontSize: 11, marginTop: space.xs, marginBottom: space.md },

    group: { marginBottom: space.md },
    groupTitle: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: c.inkMuted,
      marginBottom: space.sm,
    },
    stackBar: {
      flexDirection: 'row',
      height: 16,
      borderRadius: radius.sm,
      overflow: 'hidden',
      marginBottom: space.sm,
    },
    segment: { height: '100%' },
    legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
    swatch: { width: 9, height: 9, borderRadius: 2, marginRight: space.sm },
    legendLabel: { ...T.body, fontSize: 12, flex: 1 },
    legendValue: { ...T.financial, fontSize: 12, fontWeight: '600' },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.hairline,
      marginVertical: space.md,
    },

    scenarioRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm },
    scenChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm + 2,
      paddingVertical: 7,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    scenChipActive: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    scenText: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted },
    scenTextActive: { color: c.bronze, fontWeight: '600' },
    scenDetail: { ...T.caption, fontSize: 12, lineHeight: 18, marginBottom: space.md },

    resultRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
    },
    resultBlock: { flex: 1 },
    resultRight: { alignItems: 'flex-end' },
    resultValue: { fontFamily: font.serif, fontSize: 24, color: c.ink },
    resultLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 1 },
    delta: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', marginTop: 2, ...tabularNums },
  });
};
