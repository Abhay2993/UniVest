import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ACTIVE_AUCTION } from '../data/mock';
import { AuctionOrderInput } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { clearUniformPrice } from '../utils/finance';
import { liquidityMetrics } from '../utils/quant';
import { ChartPoint, LineChart } from '../components/LineChart';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const UNIT_PRESETS = [25, 50, 100];
const PRICE_PRESETS = [12.0, 12.25, 12.5, 12.75];

/**
 * The Liquidity Windows market — batch auctions instead of a continuous
 * book. Orders rest inside the window and everything crosses at one uniform
 * clearing price (the same algorithm as the database's clear_auction()).
 */
export function MarketsScreen() {
  const s = useThemedStyles(makeStyles);
  const [myOrders, setMyOrders] = useState<AuctionOrderInput[]>([]);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [units, setUnits] = useState(50);
  const [limitPrice, setLimitPrice] = useState(12.5);

  const book = useMemo(() => [...ACTIVE_AUCTION.book, ...myOrders], [myOrders]);
  const indicative = useMemo(() => clearUniformPrice(book), [book]);

  const depth = useMemo(
    () => ({
      bidUnits: book.filter((o) => o.side === 'buy').reduce((sum, o) => sum + o.units, 0),
      askUnits: book.filter((o) => o.side === 'sell').reduce((sum, o) => sum + o.units, 0),
    }),
    [book],
  );

  const history = useMemo<ChartPoint[]>(
    () => ACTIVE_AUCTION.history.map((h) => ({ date: h.date, value: h.price })),
    [],
  );

  const liquidity = useMemo(
    () => liquidityMetrics(book, ACTIVE_AUCTION.history.map((h) => h.price), 100),
    [book],
  );

  const daysToClose = Math.max(
    0,
    Math.ceil((Date.parse(ACTIVE_AUCTION.closesAt) - Date.now()) / 86_400_000),
  );

  const placeOrder = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    LayoutAnimation.configureNext(QUIET_EASE);
    setMyOrders((cur) => [...cur, { side, units, limitPrice }]);
  };

  const withdrawOrder = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(QUIET_EASE);
    setMyOrders((cur) => cur.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.brand}>MARKETS</Text>
        <Text style={s.heroTitle}>Liquidity Windows</Text>
        <Text style={s.heroSubtitle}>
          Orders rest inside a monthly window and cross at one uniform clearing price — fairer
          marks than a thin continuous book.
        </Text>
      </View>

      {/* Active window */}
      <View style={s.card}>
        <View style={s.windowHeader}>
          <View>
            <Text style={s.overline}>Open Window</Text>
            <Text style={s.spvName}>{ACTIVE_AUCTION.spvName}</Text>
          </View>
          <View style={s.closesIn}>
            <Text style={s.closesInValue}>{daysToClose}d</Text>
            <Text style={s.closesInLabel}>to clearing</Text>
          </View>
        </View>

        <View style={s.indicativeRow}>
          <View style={s.indicativeBlock}>
            <Text style={s.indicativePrice}>
              {indicative.price === null ? '—' : `$${indicative.price.toFixed(2)}`}
            </Text>
            <Text style={s.indicativeLabel}>Indicative Clearing Price</Text>
          </View>
          <View style={s.indicativeBlockRight}>
            <Text style={s.indicativeUnits}>
              {indicative.volume.toLocaleString('en-US')} units
            </Text>
            <Text style={s.indicativeLabel}>Would Cross</Text>
          </View>
        </View>

        <View style={s.depthRow}>
          <Text style={s.depthText}>
            Demand {depth.bidUnits.toLocaleString('en-US')}u · Supply{' '}
            {depth.askUnits.toLocaleString('en-US')}u
          </Text>
        </View>
      </View>

      {/* Order entry */}
      <View style={s.card}>
        <Text style={s.overline}>Place an Order</Text>

        <View style={s.sideToggle}>
          {(['buy', 'sell'] as const).map((sd) => (
            <Pressable
              key={sd}
              style={[s.sideBtn, side === sd && (sd === 'buy' ? s.sideBtnBuy : s.sideBtnSell)]}
              onPress={() => setSide(sd)}
              accessibilityRole="button"
              accessibilityState={{ selected: side === sd }}
            >
              <Text style={[s.sideBtnText, side === sd && s.sideBtnTextActive]}>
                {sd === 'buy' ? 'Buy Units' : 'Sell Units'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.fieldLabel}>UNITS</Text>
        <View style={s.presetRow}>
          {UNIT_PRESETS.map((u) => (
            <Chip key={u} label={String(u)} active={units === u} onPress={() => setUnits(u)} />
          ))}
        </View>

        <Text style={s.fieldLabel}>LIMIT PRICE</Text>
        <View style={s.presetRow}>
          {PRICE_PRESETS.map((p) => (
            <Chip
              key={p}
              label={`$${p.toFixed(2)}`}
              active={limitPrice === p}
              onPress={() => setLimitPrice(p)}
            />
          ))}
        </View>

        <Pressable style={s.cta} onPress={placeOrder} accessibilityRole="button">
          <Text style={s.ctaText}>
            {side === 'buy' ? 'Bid' : 'Offer'} {units} units at ${limitPrice.toFixed(2)}
          </Text>
        </Pressable>
        <Text style={s.footnote}>
          Orders are binding once the window clears · 1.5% admin fee on the buyer side
        </Text>

        {myOrders.length > 0 && (
          <View style={s.myOrders}>
            <Text style={s.fieldLabel}>YOUR RESTING ORDERS</Text>
            {myOrders.map((o, i) => (
              <View key={`${o.side}-${o.limitPrice}-${i}`} style={s.orderRow}>
                <Text style={s.orderText}>
                  {o.side === 'buy' ? 'Bid' : 'Offer'} · {o.units}u @ ${o.limitPrice.toFixed(2)}
                </Text>
                <Pressable onPress={() => withdrawOrder(i)} hitSlop={8} accessibilityRole="button">
                  <Text style={s.withdraw}>Withdraw</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Liquidity analytics */}
      <View style={s.card}>
        <View style={s.liqHeader}>
          <Text style={s.overline}>Liquidity Analytics</Text>
          <View style={s.liqScore}>
            <Text style={s.liqScoreValue}>{liquidity.score}</Text>
            <Text style={s.liqScoreLabel}>LIQUIDITY SCORE</Text>
          </View>
        </View>
        <View style={s.liqGrid}>
          <LiqStat
            label="Implied spread"
            value={liquidity.spread === null ? '—' : `$${liquidity.spread.toFixed(2)}`}
          />
          <LiqStat label="Bid depth" value={`${liquidity.bidDepth.toLocaleString('en-US')}u`} />
          <LiqStat label="Ask depth" value={`${liquidity.askDepth.toLocaleString('en-US')}u`} />
          <LiqStat
            label="Clearing volatility"
            value={`$${liquidity.clearingVolatility.toFixed(2)}`}
          />
        </View>
        <View style={s.liqImpact}>
          <Text style={s.liqImpactText}>
            Selling 100 units clears near{' '}
            <Text style={s.liqImpactStrong}>
              {liquidity.sellImpactVWAP === null ? '—' : `$${liquidity.sellImpactVWAP.toFixed(2)}`}
            </Text>
            {liquidity.sellImpactPct !== null
              ? ` — a ${liquidity.sellImpactPct.toFixed(1)}% impact below the best bid.`
              : '.'}
          </Text>
        </View>
        <Text style={s.footnote}>
          Real market microstructure — depth, spread, and price impact — the legitimate quant for a
          batch-auction venue.
        </Text>
      </View>

      {/* Clearing history */}
      <View style={s.card}>
        <Text style={s.overline}>Clearing Price — Past Windows</Text>
        <View style={s.chartWrap}>
          <LineChart points={history} formatValue={(v) => `$${v.toFixed(2)}`} />
        </View>
        <Text style={s.footnote}>
          One uniform price per monthly window · marks feed SPV NAV and carry accounting
        </Text>
      </View>
    </ScrollView>
  );

  function LiqStat({ label, value }: { label: string; value: string }) {
    return (
      <View style={s.liqStat}>
        <Text style={s.liqStatValue}>{value}</Text>
        <Text style={s.liqStatLabel}>{label}</Text>
      </View>
    );
  }

  function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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
    overline: { ...T.overline },

    windowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    spvName: { fontFamily: font.serif, fontSize: 18, color: c.ink, marginTop: 2 },
    closesIn: { alignItems: 'flex-end' },
    closesInValue: { ...T.financial, fontSize: 18, fontWeight: '600', color: c.amber },
    closesInLabel: { ...T.caption, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6 },

    indicativeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
    },
    indicativeBlock: {},
    indicativeBlockRight: { alignItems: 'flex-end' },
    indicativePrice: {
      fontFamily: font.sans,
      fontSize: 26,
      fontWeight: '600',
      color: c.emerald,
      ...tabularNums,
    },
    indicativeUnits: { ...T.financial, fontSize: 15, fontWeight: '600' },
    indicativeLabel: {
      ...T.caption,
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 2,
    },
    depthRow: { marginTop: space.sm },
    depthText: { ...T.caption, fontSize: 11 },

    sideToggle: {
      flexDirection: 'row',
      marginTop: space.md,
      marginBottom: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      overflow: 'hidden',
    },
    sideBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
    sideBtnBuy: { backgroundColor: c.emerald },
    sideBtnSell: { backgroundColor: c.danger },
    sideBtnText: { fontFamily: font.sans, fontSize: 13, color: c.inkMuted },
    sideBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },

    fieldLabel: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      color: c.inkMuted,
      marginBottom: space.sm,
      marginTop: space.xs,
    },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm },
    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: 8,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    chipActive: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    chipText: { ...T.financial, fontSize: 13, color: c.inkMuted },
    chipTextActive: { color: c.bronze, fontWeight: '600' },

    cta: {
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 13,
      marginTop: space.sm,
    },
    ctaText: { fontFamily: font.sans, fontSize: 14, fontWeight: '700', letterSpacing: 0.3, color: '#0A192F' },
    footnote: { ...T.caption, fontSize: 10, textAlign: 'center', marginTop: space.sm },

    myOrders: { marginTop: space.md },
    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.sm,
    },
    orderText: { ...T.financial, fontSize: 13 },
    withdraw: { fontFamily: font.sans, fontSize: 12, color: c.danger, fontWeight: '600' },

    chartWrap: { marginTop: space.md },

    liqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    liqScore: { alignItems: 'flex-end' },
    liqScoreValue: { fontFamily: font.serif, fontSize: 26, color: c.bronze },
    liqScoreLabel: { fontFamily: font.sans, fontSize: 8, letterSpacing: 1.1, color: c.inkFaint, fontWeight: '700' },
    liqGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md },
    liqStat: { width: '50%', paddingVertical: space.sm },
    liqStatValue: { ...T.financial, fontSize: 16, fontWeight: '600' },
    liqStatLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },
    liqImpact: {
      marginTop: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: c.gold,
      paddingLeft: space.md,
    },
    liqImpactText: { ...T.body, fontSize: 13, lineHeight: 20, color: c.inkMuted },
    liqImpactStrong: { color: c.ink, fontWeight: '700' },
  });
};
