import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { EXITED_POSITIONS, PORTFOLIO_POSITIONS, STARTUPS, TAX_DOCUMENTS } from '../data/mock';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { usePortfolio } from '../state/PortfolioContext';
import { CashFlow, tvpi, xirr } from '../utils/finance';
import { formatDate, formatMoney, formatMoneyPrecise } from '../utils/format';
import {
  exposureBy,
  isLongTerm,
  moic,
  stageFromMilestones,
} from '../utils/portfolio-analytics';
import { ChartPoint, LineChart } from '../components/LineChart';
import { PortfolioRiskCard } from '../components/PortfolioRiskCard';

type PortfolioView = 'overview' | 'analytics' | 'tax';

interface Props {
  onSelectStartup: (startup: Startup) => void;
}

/**
 * Portfolio analytics: paid-in vs current value, TVPI and XIRR from the
 * actual cash-flow dates, the portfolio NAV series (validated emerald line),
 * per-position detail, and the Tax Document Center.
 */
export function PortfolioScreen({ onSelectStartup }: Props) {
  const s = useThemedStyles(makeStyles);
  const { commitments } = usePortfolio();
  const [view, setView] = useState<PortfolioView>('overview');

  const signedAgreements = useMemo(
    () =>
      Object.values(commitments)
        .filter((c) => c.signerName)
        .map((c) => ({
          ...c,
          startupName: STARTUPS.find((st) => st.id === c.startupId)?.name ?? 'Offering',
        })),
    [commitments],
  );

  const metrics = useMemo(() => {
    const paidIn = PORTFOLIO_POSITIONS.reduce((sum, p) => sum + p.costBasis, 0);
    const currentValue = PORTFOLIO_POSITIONS.reduce((sum, p) => {
      const nav = p.navSeries[p.navSeries.length - 1]?.navPerUnit ?? p.costBasis / p.units;
      return sum + p.units * nav;
    }, 0);

    // XIRR over the real cash-flow dates: capital calls out, today's NAV in.
    const flows: CashFlow[] = PORTFOLIO_POSITIONS.map((p) => ({
      date: Date.parse(p.investedOn),
      amount: -p.costBasis,
    }));
    flows.push({ date: Date.now(), amount: currentValue });
    flows.sort((a, b) => a.date - b.date);

    return {
      paidIn,
      currentValue,
      multiple: tvpi(currentValue, 0, paidIn),
      irr: xirr(flows),
    };
  }, []);

  const series = useMemo<ChartPoint[]>(() => {
    const dates = [...new Set(PORTFOLIO_POSITIONS.flatMap((p) => p.navSeries.map((n) => n.date)))].sort();
    return dates.map((date) => {
      let total = 0;
      for (const p of PORTFOLIO_POSITIONS) {
        if (Date.parse(p.investedOn) > Date.parse(date)) continue; // not yet invested
        const mark = [...p.navSeries].reverse().find((n) => n.date <= date);
        total += p.units * (mark ? mark.navPerUnit : p.costBasis / p.units);
      }
      return { date, value: Math.round(total * 100) / 100 };
    });
  }, []);

  // Per-position analytics: join to the startup for vertical/geography/stage.
  const analyticsPositions = useMemo(() => {
    const now = Date.now();
    return PORTFOLIO_POSITIONS.map((p) => {
      const startup = STARTUPS.find((st) => st.id === p.startupId);
      const nav = p.navSeries[p.navSeries.length - 1]?.navPerUnit ?? p.costBasis / p.units;
      const currentValue = p.units * nav;
      const completed = startup?.milestones.filter((m) => m.status === 'completed').length ?? 0;
      return {
        id: p.id,
        name: p.startupName,
        currentValue,
        costBasis: p.costBasis,
        units: p.units,
        vertical: startup?.vertical ?? 'Unknown',
        country: startup?.university.country ?? 'Unknown',
        stage: stageFromMilestones(completed),
        moic: moic(currentValue, p.costBasis),
        acquiredOn: p.investedOn,
        longTerm: isLongTerm(Date.parse(p.investedOn), now),
        spvName: p.spvName,
      };
    });
  }, []);

  const exposure = useMemo(
    () => ({
      byVertical: exposureBy(analyticsPositions, (p) => p.vertical),
      byGeography: exposureBy(analyticsPositions, (p) => p.country),
      byStage: exposureBy(analyticsPositions, (p) => p.stage),
    }),
    [analyticsPositions],
  );

  const realized = useMemo(() => {
    const dist = EXITED_POSITIONS.reduce((sum, e) => {
      const profit = Math.max(e.grossProceeds - e.costBasis, 0);
      const carry = Math.round(profit * e.carryPct) / 100;
      return sum + (e.grossProceeds - carry);
    }, 0);
    return Math.round(dist * 100) / 100;
  }, []);

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.brand}>PORTFOLIO</Text>
        <Text style={s.heroTitle}>Your Positions</Text>
        <View style={s.statsRow}>
          <HeroStat value={formatMoney(metrics.currentValue)} label="Current Value" gold />
          <HeroStat value={formatMoney(metrics.paidIn)} label="Paid-In" />
          <HeroStat value={`${metrics.multiple.toFixed(2)}x`} label="TVPI" />
          <HeroStat
            value={metrics.irr === null ? '—' : `${(metrics.irr * 100).toFixed(1)}%`}
            label="IRR (XIRR)"
          />
        </View>
      </View>

      <View style={s.segmented}>
        {(['overview', 'analytics', 'tax'] as PortfolioView[]).map((v) => (
          <Pressable
            key={v}
            style={[s.segment, view === v && s.segmentActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setView(v);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: view === v }}
          >
            <Text style={[s.segmentText, view === v && s.segmentTextActive]}>
              {v === 'overview' ? 'Overview' : v === 'analytics' ? 'Analytics' : 'Tax'}
            </Text>
          </Pressable>
        ))}
      </View>

      {view === 'overview' && (
        <>
      <View style={s.card}>
        <Text style={s.overline}>Portfolio Value — Quarterly NAV Marks</Text>
        <View style={s.chartWrap}>
          <LineChart points={series} formatValue={(v) => formatMoney(v)} />
        </View>
        <Text style={s.chartNote}>
          Unrealized, from fund-administrator marks. Tap the chart to inspect a quarter.
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.overline}>Positions</Text>
        {PORTFOLIO_POSITIONS.map((p, i) => {
          const nav = p.navSeries[p.navSeries.length - 1]?.navPerUnit ?? 0;
          const value = p.units * nav;
          const multiple = value / p.costBasis;
          const startup = STARTUPS.find((st) => st.id === p.startupId);
          return (
            <Pressable
              key={p.id}
              style={[s.position, i === PORTFOLIO_POSITIONS.length - 1 && s.positionLast]}
              onPress={() => startup && onSelectStartup(startup)}
              accessibilityRole="button"
              accessibilityLabel={`${p.startupName} position, ${formatMoney(value)}`}
            >
              <View style={s.positionHeader}>
                <Text style={s.positionName}>{p.startupName}</Text>
                <Text style={s.positionValue}>{formatMoney(value)}</Text>
              </View>
              <View style={s.positionMeta}>
                <Text style={s.positionSub}>
                  {p.spvName} · {p.units.toLocaleString('en-US')} units
                </Text>
                <Text style={[s.positionMultiple, multiple < 1 && s.positionMultipleDown]}>
                  {multiple.toFixed(2)}x
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Factor exposure + scenario stress testing (milestone-tree Monte Carlo) */}
      <PortfolioRiskCard
        positions={PORTFOLIO_POSITIONS.map((p) => ({ startupId: p.startupId, costBasis: p.costBasis }))}
      />

      {/* Realized exits: the distribution waterfall */}
      {EXITED_POSITIONS.map((exit) => {
        const profit = Math.max(exit.grossProceeds - exit.costBasis, 0);
        const carry = Math.round(profit * exit.carryPct) / 100;
        const net = exit.grossProceeds - carry;
        return (
          <View key={exit.id} style={s.card}>
            <Text style={s.overline}>Distribution Statement</Text>
            <View style={s.exitHeader}>
              <View style={s.exitLeft}>
                <Text style={s.positionName}>{exit.startupName}</Text>
                <Text style={s.positionSub}>
                  {exit.spvName} · {exit.exitKind} · {formatDate(exit.exitedOn)}
                </Text>
              </View>
              <Text style={s.exitMultiple}>{(net / exit.costBasis).toFixed(2)}x net</Text>
            </View>
            <WaterfallRow label="Gross proceeds" value={formatMoney(exit.grossProceeds)} />
            <WaterfallRow label="Return of capital" value={formatMoney(exit.costBasis)} muted />
            <WaterfallRow label="Profit" value={formatMoney(profit)} />
            <WaterfallRow
              label={`Platform carry (${exit.carryPct}%)`}
              value={`− ${formatMoney(carry)}`}
              muted
            />
            <View style={s.netRow}>
              <Text style={s.netLabel}>Net to you</Text>
              <Text style={s.netValue}>{formatMoney(net)}</Text>
            </View>
            <Text style={s.taxHint}>
              Carry applies to profit only — never to your returned capital. Recorded in the carry
              ledger at the moment of distribution.
            </Text>
          </View>
        );
      })}
        </>
      )}

      {view === 'analytics' && (
        <>
          <View style={s.card}>
            <Text style={s.overline}>Performance</Text>
            <View style={s.metricGrid}>
              <MetricTile k="TVPI" v={`${metrics.multiple.toFixed(2)}x`} />
              <MetricTile k="IRR (XIRR)" v={metrics.irr === null ? '—' : `${(metrics.irr * 100).toFixed(1)}%`} />
              <MetricTile k="Unrealized" v={formatMoney(metrics.currentValue)} />
              <MetricTile k="Realized" v={formatMoney(realized)} />
            </View>
            <Text style={s.taxHint}>
              MOIC is value ÷ cost; TVPI adds realized distributions. IRR is annualized over your
              actual capital-call dates.
            </Text>
          </View>

          <ExposureCard title="Exposure by Vertical" slices={exposure.byVertical} />
          <ExposureCard title="Exposure by Geography" slices={exposure.byGeography} />
          <ExposureCard title="Exposure by Stage" slices={exposure.byStage} />

          <View style={s.card}>
            <Text style={s.overline}>Positions by MOIC</Text>
            {analyticsPositions.map((p, i) => (
              <View key={p.id} style={[s.moicRow, i === analyticsPositions.length - 1 && s.positionLast]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.positionName}>{p.name}</Text>
                  <Text style={s.positionSub}>{p.vertical} · {p.country} · {p.stage}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.positionValue}>{formatMoney(p.currentValue)}</Text>
                  <Text style={[s.positionMultiple, p.moic < 1 && s.positionMultipleDown]}>
                    {p.moic.toFixed(2)}x
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {view === 'tax' && (
        <>
      <View style={s.card}>
        <Text style={s.overline}>Document Vault</Text>
        <Text style={s.taxHint}>
          Signed subscription agreements and Schedule K-1s, filed per SPV. K-1s are issued by the
          fund administrator each March.
        </Text>
        {signedAgreements.map((agreement) => (
          <View key={agreement.startupId} style={s.taxRow}>
            <View style={s.taxLeft}>
              <Text style={s.taxKind}>Subscription Agreement — {agreement.startupName}</Text>
              <Text style={s.positionSub}>
                Signed {agreement.signerName} · {formatDate(agreement.committedAt.slice(0, 10))} ·{' '}
                {formatMoney(agreement.amount)}
              </Text>
            </View>
            <View style={s.taxBadge}>
              <Text style={s.taxBadgeText}>↓ PDF</Text>
            </View>
          </View>
        ))}
        {TAX_DOCUMENTS.map((doc, i) => (
          <View key={doc.id} style={[s.taxRow, i === TAX_DOCUMENTS.length - 1 && s.positionLast]}>
            <View style={s.taxLeft}>
              <Text style={s.taxKind}>
                {doc.kind} · {doc.taxYear}
              </Text>
              <Text style={s.positionSub}>{doc.spvName}</Text>
            </View>
            {doc.status === 'available' ? (
              <View style={s.taxBadge}>
                <Text style={s.taxBadgeText}>↓ PDF</Text>
              </View>
            ) : (
              <Text style={s.taxPending}>Pending</Text>
            )}
          </View>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.overline}>Tax Lots</Text>
        <Text style={s.taxHint}>
          Cost-basis lots per position. Holding period drives long- vs short-term capital-gains
          treatment on disposal.
        </Text>
        {analyticsPositions.map((p, i) => (
          <View key={p.id} style={[s.taxRow, i === analyticsPositions.length - 1 && s.positionLast]}>
            <View style={s.taxLeft}>
              <Text style={s.taxKind}>{p.name} · {p.units.toLocaleString('en-US')} units</Text>
              <Text style={s.positionSub}>
                Acquired {formatDate(p.acquiredOn)} · cost {formatMoney(p.costBasis)} · basis{' '}
                {formatMoneyPrecise(p.costBasis / p.units)}/unit
              </Text>
            </View>
            <View style={[s.termBadge, p.longTerm ? s.termLong : s.termShort]}>
              <Text style={[s.termText, p.longTerm ? s.termLongText : s.termShortText]}>
                {p.longTerm ? 'Long-term' : 'Short-term'}
              </Text>
            </View>
          </View>
        ))}
      </View>
        </>
      )}
    </ScrollView>
  );

  function WaterfallRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
      <View style={s.waterfallRow}>
        <Text style={[s.waterfallLabel, muted && s.waterfallMuted]}>{label}</Text>
        <Text style={[s.waterfallValue, muted && s.waterfallMuted]}>{value}</Text>
      </View>
    );
  }

  function MetricTile({ k, v }: { k: string; v: string }) {
    return (
      <View style={s.metricTile}>
        <Text style={s.metricV} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
        <Text style={s.metricK}>{k}</Text>
      </View>
    );
  }

  function ExposureCard({ title, slices }: { title: string; slices: { key: string; value: number; pct: number }[] }) {
    return (
      <View style={s.card}>
        <Text style={s.overline}>{title}</Text>
        {slices.map((sl) => (
          <View key={sl.key} style={s.expRow}>
            <View style={s.expHead}>
              <Text style={s.expKey}>{sl.key}</Text>
              <Text style={s.expPct}>{sl.pct}% · {formatMoney(sl.value)}</Text>
            </View>
            <View style={s.expTrack}>
              <View style={[s.expFill, { width: `${Math.max(2, sl.pct)}%` }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  function HeroStat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
    return (
      <View style={s.stat}>
        <Text style={[s.statValue, gold && s.statValueGold]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
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
    statsRow: {
      flexDirection: 'row',
      marginTop: space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairlineOnNavy,
      paddingTop: space.md,
    },
    stat: { flex: 1, paddingRight: space.sm },
    statValue: {
      fontFamily: font.sans,
      fontSize: 15,
      fontWeight: '600',
      color: c.onNavy,
      ...tabularNums,
    },
    statValueGold: { color: c.gold },
    statLabel: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: c.onNavyMuted,
      marginTop: 2,
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
    overline: { ...T.overline },

    // Segmented control (Overview / Analytics / Tax)
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.sm,
      padding: 3,
      marginHorizontal: space.md,
      marginBottom: space.md,
    },
    segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm - 2 },
    segmentActive: { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline },
    segmentText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.inkMuted },
    segmentTextActive: { color: c.ink },

    // Performance metric tiles
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
    metricTile: { width: '50%', paddingVertical: space.sm },
    metricV: { fontFamily: font.serif, fontSize: 22, color: c.ink, ...tabularNums },
    metricK: { fontFamily: font.sans, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: c.inkFaint, marginTop: 1 },

    // Exposure bars
    expRow: { marginTop: space.md },
    expHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
    expKey: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.ink },
    expPct: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted, ...tabularNums },
    expTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceMuted, overflow: 'hidden' },
    expFill: { height: '100%', borderRadius: 4, backgroundColor: c.gold },

    moicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
    },

    // Tax-lot holding-period badges
    termBadge: { borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 4 },
    termLong: { backgroundColor: c.surfaceGoldTint },
    termShort: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline },
    termText: { fontFamily: font.sans, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
    termLongText: { color: c.bronze },
    termShortText: { color: c.inkMuted },

    chartWrap: { marginTop: space.md },
    chartNote: { ...T.caption, fontSize: 10, marginTop: space.sm },

    position: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
      marginTop: space.xs,
    },
    positionLast: { paddingBottom: 0 },
    positionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    positionName: { fontFamily: font.serif, fontSize: 16, color: c.ink },
    positionValue: { ...T.financial, fontSize: 15, fontWeight: '600' },
    positionMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: 2,
    },
    positionSub: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted },
    positionMultiple: { ...T.financial, fontSize: 12, color: c.emerald, fontWeight: '600' },
    positionMultipleDown: { color: c.amber },

    taxHint: { ...T.caption, fontSize: 11, marginTop: space.xs, marginBottom: space.sm },

    exitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: space.sm,
      marginBottom: space.md,
    },
    exitLeft: { flex: 1, paddingRight: space.sm },
    exitMultiple: { ...T.financial, fontSize: 15, fontWeight: '700', color: c.emerald },
    waterfallRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.sm,
    },
    waterfallLabel: { ...T.body, fontSize: 13 },
    waterfallValue: { ...T.financial, fontSize: 13, fontWeight: '600' },
    waterfallMuted: { color: c.inkMuted, fontWeight: '400' },
    netRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderTopWidth: 1,
      borderTopColor: c.gold,
      paddingVertical: space.md,
    },
    netLabel: { fontFamily: font.serif, fontSize: 16, color: c.ink },
    netValue: { fontFamily: font.sans, fontSize: 18, fontWeight: '700', color: c.bronze, ...tabularNums },
    taxRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
    },
    taxLeft: {},
    taxKind: { ...T.body, fontWeight: '600', fontSize: 13 },
    taxBadge: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 4,
    },
    taxBadgeText: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', color: c.bronze },
    taxPending: { fontFamily: font.sans, fontSize: 11, color: c.inkFaint, fontStyle: 'italic' },
  });
};
