import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STARTUPS, SYNDICATES, VERTICALS } from '../data/mock';
import { Vertical } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoney, formatMoneyCompact } from '../utils/format';

const AUTOINVEST_KEY = 'univest.autoinvest.v1';
const BUDGET_PRESETS = [100, 250, 500, 1_000];

interface AutoInvestPrefs {
  active: boolean;
  monthlyBudget: number;
  verticals: Vertical[];
  followedSyndicates: string[];
}

const DEFAULT_PREFS: AutoInvestPrefs = {
  active: false,
  monthlyBudget: 250,
  verticals: [],
  followedSyndicates: [],
};

/** Tools tab: deep-tech DCA for investors, cap-table simulator for founders. */
export function ToolsScreen() {
  const s = useThemedStyles(makeStyles);
  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.brand}>TOOLS</Text>
        <Text style={s.heroTitle}>Instruments</Text>
        <Text style={s.heroSubtitle}>
          Recurring allocation for investors · deal modeling for founders and TTOs
        </Text>
      </View>

      <AutoInvestCard />
      <CapTableSimulator />
    </ScrollView>
  );
}

// ----------------------------------------------------------------------------
// Auto-Invest — deep-tech DCA
// ----------------------------------------------------------------------------
function AutoInvestCard() {
  const s = useThemedStyles(makeStyles);
  const [prefs, setPrefs] = useState<AutoInvestPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(AUTOINVEST_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AutoInvestPrefs>) });
      })
      .catch(() => {});
  }, []);

  const update = (patch: Partial<AutoInvestPrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      AsyncStorage.setItem(AUTOINVEST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const qualifying = useMemo(
    () =>
      STARTUPS.filter(
        (st) =>
          st.daysLeft > 0 &&
          (prefs.verticals.length === 0 || prefs.verticals.includes(st.vertical)),
      ),
    [prefs.verticals],
  );

  const perDeal = qualifying.length === 0 ? 0 : prefs.monthlyBudget / qualifying.length;

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <Text style={s.overline}>Auto-Invest · Deep-Tech DCA</Text>
          <Text style={s.cardTitle}>Monthly Allocation</Text>
        </View>
        <Pressable
          style={[s.toggle, prefs.active && s.toggleOn]}
          onPress={() => update({ active: !prefs.active })}
          accessibilityRole="switch"
          accessibilityState={{ checked: prefs.active }}
        >
          <Text style={[s.toggleText, prefs.active && s.toggleTextOn]}>
            {prefs.active ? 'ACTIVE' : 'PAUSED'}
          </Text>
        </Pressable>
      </View>
      <Text style={s.hint}>
        A fixed monthly budget spread evenly across every new qualifying deal — dollar-cost
        averaging for deep-tech. Cancel any time; Reg CF limits always apply.
      </Text>

      <Text style={s.fieldLabel}>MONTHLY BUDGET</Text>
      <View style={s.presetRow}>
        {BUDGET_PRESETS.map((b) => (
          <Pressable
            key={b}
            style={[s.chip, prefs.monthlyBudget === b && s.chipActive]}
            onPress={() => update({ monthlyBudget: b })}
            accessibilityRole="button"
            accessibilityState={{ selected: prefs.monthlyBudget === b }}
          >
            <Text style={[s.chipText, prefs.monthlyBudget === b && s.chipTextActive]}>
              {formatMoney(b)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.fieldLabel}>VERTICALS (EMPTY = ALL)</Text>
      <View style={s.presetRow}>
        {VERTICALS.map((v) => {
          const on = prefs.verticals.includes(v);
          return (
            <Pressable
              key={v}
              style={[s.chip, on && s.chipActive]}
              onPress={() =>
                update({
                  verticals: on ? prefs.verticals.filter((x) => x !== v) : [...prefs.verticals, v],
                })
              }
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.chipText, on && s.chipTextActive]}>{v}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.fieldLabel}>VERIFIED LEADS TO MATCH</Text>
      {SYNDICATES.map((syn) => {
        const on = prefs.followedSyndicates.includes(syn.id);
        return (
          <View key={syn.id} style={s.syndicateRow}>
            <View style={s.syndicateLeft}>
              <Text style={s.syndicateName}>
                {syn.name}
                {syn.verified ? <Text style={s.syndicateVerified}> ✦</Text> : null}
              </Text>
              <Text style={s.syndicateThesis}>{syn.thesis}</Text>
            </View>
            <Pressable
              style={[s.followBtn, on && s.followBtnOn]}
              onPress={() =>
                update({
                  followedSyndicates: on
                    ? prefs.followedSyndicates.filter((x) => x !== syn.id)
                    : [...prefs.followedSyndicates, syn.id],
                })
              }
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.followText, on && s.followTextOn]}>
                {on ? 'Matching' : 'Match'}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <View style={s.preview}>
        <Text style={s.previewTitle}>
          Next window: {qualifying.length} qualifying deal{qualifying.length === 1 ? '' : 's'}
        </Text>
        <Text style={s.previewText}>
          {qualifying.length === 0
            ? 'No open deals match this filter — your budget rolls over.'
            : `${formatMoney(prefs.monthlyBudget)} / month → ~${formatMoney(perDeal)} per deal, allocated on each campaign's close.`}
        </Text>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Cap Table & Dilution Simulator (for founders / TTOs)
// ----------------------------------------------------------------------------
const PRE_MONEY_PRESETS = [4_000_000, 6_000_000, 9_000_000, 12_000_000];
const RAISE_PRESETS = [900_000, 1_800_000, 2_500_000, 3_200_000];
const UNI_EQUITY_PRESETS = [10, 15, 20, 25];
const POOL_PRESETS = [0, 10, 15];

const SEGMENT_LABELS = ['Founders & Team', 'University (TTO)', 'Option Pool', 'New Investors (SPV)'] as const;

function CapTableSimulator() {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [preMoney, setPreMoney] = useState(6_000_000);
  const [raise, setRaise] = useState(1_800_000);
  const [uniPct, setUniPct] = useState(15);
  const [poolPct, setPoolPct] = useState(10);

  const postMoney = preMoney + raise;
  const investorShare = (raise / postMoney) * 100;
  const dilutionFactor = preMoney / postMoney;
  const university = uniPct * dilutionFactor;
  const pool = poolPct * dilutionFactor;
  const founders = Math.max(0, 100 - investorShare - university - pool);
  const segments = [founders, university, pool, investorShare];

  return (
    <View style={s.card}>
      <Text style={s.overline}>For Founders · Cap Table Simulator</Text>
      <Text style={s.cardTitle}>What does this raise cost you?</Text>
      <Text style={s.hint}>
        Standardized template terms, one SPV line for the crowd. Adjust the deal and see the
        post-money table instantly — before you ever open a negotiation.
      </Text>

      <Text style={s.fieldLabel}>PRE-MONEY VALUATION</Text>
      <View style={s.presetRow}>
        {PRE_MONEY_PRESETS.map((v) => (
          <SimChip key={v} label={formatMoneyCompact(v)} active={preMoney === v} onPress={() => setPreMoney(v)} />
        ))}
      </View>

      <Text style={s.fieldLabel}>RAISE AMOUNT</Text>
      <View style={s.presetRow}>
        {RAISE_PRESETS.map((v) => (
          <SimChip key={v} label={formatMoneyCompact(v)} active={raise === v} onPress={() => setRaise(v)} />
        ))}
      </View>

      <Text style={s.fieldLabel}>UNIVERSITY EQUITY (PRE-ROUND)</Text>
      <View style={s.presetRow}>
        {UNI_EQUITY_PRESETS.map((v) => (
          <SimChip key={v} label={`${v}%`} active={uniPct === v} onPress={() => setUniPct(v)} />
        ))}
      </View>

      <Text style={s.fieldLabel}>OPTION POOL (PRE-ROUND)</Text>
      <View style={s.presetRow}>
        {POOL_PRESETS.map((v) => (
          <SimChip key={v} label={v === 0 ? 'None' : `${v}%`} active={poolPct === v} onPress={() => setPoolPct(v)} />
        ))}
      </View>

      <View style={s.postMoneyRow}>
        <Text style={s.postMoneyLabel}>Post-money</Text>
        <Text style={s.postMoneyValue}>{formatMoneyCompact(postMoney)}</Text>
      </View>

      {/* Stacked ownership bar — 2px surface gaps between segments */}
      <View style={s.stackBar}>
        {segments.map((pct, i) => (
          <View
            key={SEGMENT_LABELS[i]}
            style={[
              s.stackSegment,
              {
                flex: Math.max(pct, 0.001),
                backgroundColor: palette.chartCategorical[i],
                marginLeft: i === 0 ? 0 : 2,
              },
            ]}
          />
        ))}
      </View>

      {SEGMENT_LABELS.map((label, i) => (
        <View key={label} style={s.legendRow}>
          <View style={[s.swatch, { backgroundColor: palette.chartCategorical[i] }]} />
          <Text style={s.legendLabel}>{label}</Text>
          <Text style={s.legendValue}>{segments[i].toFixed(1)}%</Text>
        </View>
      ))}

      <Text style={s.footnote}>
        Founder dilution this round: {(100 - dilutionFactor * 100).toFixed(1)}% · university stake
        pre-cleared at {uniPct}% under the standardized template
      </Text>
    </View>
  );

  function SimChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable
        style={[s.chip, active && s.chipActive]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  }
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: space.xl },

    hero: {
      backgroundColor: c.navy,
      paddingTop: space.xxl + space.md,
      paddingHorizontal: space.lg,
      paddingBottom: space.xl,
      marginBottom: space.lg,
    },
    brand: { fontFamily: font.sans, fontSize: 11, letterSpacing: 4, color: c.gold, marginBottom: space.md },
    heroTitle: { fontFamily: font.serif, fontSize: 30, lineHeight: 40, color: c.onNavy },
    heroSubtitle: {
      fontFamily: font.sans,
      fontSize: 13,
      lineHeight: 20,
      color: c.onNavyMuted,
      marginTop: space.sm,
      maxWidth: 320,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginHorizontal: space.md,
      marginBottom: space.md,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardHeaderLeft: { flex: 1, paddingRight: space.sm },
    overline: { ...T.overline },
    cardTitle: { fontFamily: font.serif, fontSize: 18, color: c.ink, marginTop: 2 },
    hint: { ...T.caption, marginTop: space.sm, marginBottom: space.md },

    toggle: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 5,
    },
    toggleOn: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    toggleText: { fontFamily: font.sans, fontSize: 10, letterSpacing: 1.2, color: c.inkFaint, fontWeight: '600' },
    toggleTextOn: { color: c.bronze },

    fieldLabel: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      color: c.inkMuted,
      marginBottom: space.sm,
      marginTop: space.sm,
    },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm + 2,
      paddingVertical: 7,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    chipActive: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    chipText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted, ...tabularNums },
    chipTextActive: { color: c.bronze, fontWeight: '600' },

    syndicateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.sm + 2,
    },
    syndicateLeft: { flex: 1, paddingRight: space.sm },
    syndicateName: { ...T.body, fontWeight: '600', fontSize: 13 },
    syndicateVerified: { color: c.gold, fontSize: 11 },
    syndicateThesis: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1 },
    followBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 5,
    },
    followBtnOn: { backgroundColor: c.surfaceGoldTint },
    followText: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', color: c.bronze },
    followTextOn: { color: c.bronze },

    preview: {
      marginTop: space.md,
      borderLeftWidth: 2,
      borderLeftColor: c.gold,
      paddingLeft: space.md,
    },
    previewTitle: { ...T.body, fontWeight: '600', fontSize: 13 },
    previewText: { ...T.caption, fontSize: 12, marginTop: 2 },

    postMoneyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: space.md,
      marginBottom: space.sm,
    },
    postMoneyLabel: { ...T.overline },
    postMoneyValue: { fontFamily: font.serif, fontSize: 22, color: c.bronze },

    stackBar: {
      flexDirection: 'row',
      height: 18,
      borderRadius: radius.sm,
      overflow: 'hidden',
      marginBottom: space.md,
    },
    stackSegment: { height: '100%' },

    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
    },
    swatch: { width: 10, height: 10, borderRadius: 2, marginRight: space.sm },
    legendLabel: { ...T.body, fontSize: 13, flex: 1 },
    legendValue: { ...T.financial, fontSize: 13, fontWeight: '600' },

    footnote: { ...T.caption, fontSize: 10, marginTop: space.md },
  });
};
