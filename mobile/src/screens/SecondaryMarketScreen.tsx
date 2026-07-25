import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PORTFOLIO_POSITIONS } from '../data/mock';
import {
  BookLevel,
  bestAsk,
  bestBid,
  buyerCost,
  midPrice,
  sellerProceeds,
  spread,
} from '../utils/secondary';
import { formatMoneyCompact, formatMoneyPrecise } from '../utils/format';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { ChartPoint, LineChart } from '../components/LineChart';

interface Props {
  onClose: () => void;
}

interface MyListing {
  id: string;
  positionId: string;
  units: number;
  price: number;
}

const QUIET = LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity);

/** Current NAV mark for a position (last quarterly point). */
function markOf(navSeries: { navPerUnit: number }[]): number {
  return navSeries[navSeries.length - 1]?.navPerUnit ?? 0;
}

/** A synthetic resting book around a mark — asks above, bids (tenders) below. */
function bookAround(mark: number): { asks: BookLevel[]; bids: BookLevel[] } {
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    asks: [
      { price: r(mark + 0.3), units: 120 },
      { price: r(mark + 0.85), units: 240 },
    ],
    bids: [
      { price: r(mark - 0.25), units: 160 },
      { price: r(mark - 0.9), units: 300 },
    ],
  };
}

/**
 * Investor-facing secondary market — list your SPV units, hit a resting bid, or
 * buy from the ask side. Uniform-price batch clearing and the real order book
 * run server-side (backend/api/src/secondary); this surfaces them to investors.
 */
export function SecondaryMarketScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const [selectedId, setSelectedId] = useState(PORTFOLIO_POSITIONS[0]?.id ?? '');
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [listUnits, setListUnits] = useState(25);
  const [listPrice, setListPrice] = useState(0);
  const [bought, setBought] = useState<string | null>(null);

  const position = PORTFOLIO_POSITIONS.find((p) => p.id === selectedId) ?? PORTFOLIO_POSITIONS[0];
  const mark = markOf(position.navSeries);
  const base = useMemo(() => bookAround(mark), [mark]);

  const listedUnits = myListings
    .filter((l) => l.positionId === position.id)
    .reduce((sum, l) => sum + l.units, 0);
  const available = position.units - listedUnits;

  // My listings join the ask side of the book.
  const asks: BookLevel[] = useMemo(() => {
    const mine = myListings
      .filter((l) => l.positionId === position.id)
      .map((l) => ({ price: l.price, units: l.units }));
    return [...base.asks, ...mine].sort((a, b) => a.price - b.price);
  }, [base.asks, myListings, position.id]);
  const bids = base.bids;

  const history = useMemo<ChartPoint[]>(
    () => position.navSeries.map((n) => ({ date: n.date, value: n.navPerUnit })),
    [position],
  );

  const openForm = () => {
    LayoutAnimation.configureNext(QUIET);
    setListPrice(Math.round((mark + 0.3) * 100) / 100);
    setFormOpen((o) => !o);
  };

  const submitListing = () => {
    if (listUnits <= 0 || listUnits > available) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    LayoutAnimation.configureNext(QUIET);
    setMyListings((cur) => [
      ...cur,
      { id: `${Date.now()}`, positionId: position.id, units: listUnits, price: listPrice },
    ]);
    setFormOpen(false);
  };

  const cancelListing = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(QUIET);
    setMyListings((cur) => cur.filter((l) => l.id !== id));
  };

  const UNIT_PRESETS = [25, 50, Math.max(1, available)];
  const PRICE_STEPS = [-0.25, -0.1, 0.1, 0.25];

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close secondary market">
          <Text style={s.back}>← Markets</Text>
        </Pressable>
        <Text style={s.title}>Secondary Market</Text>
        <Text style={s.subtitle}>List your units, hit a resting bid, or buy from the ask — cleared at a uniform price.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Position selector */}
        <View style={s.chipRow}>
          {PORTFOLIO_POSITIONS.map((p) => (
            <Pressable
              key={p.id}
              style={[s.posChip, p.id === position.id && s.posChipActive]}
              onPress={() => { LayoutAnimation.configureNext(QUIET); setSelectedId(p.id); setFormOpen(false); setBought(null); }}
              accessibilityRole="button"
            >
              <Text style={[s.posChipText, p.id === position.id && s.posChipTextActive]}>{p.startupName}</Text>
            </Pressable>
          ))}
        </View>

        {/* Your position + list action */}
        <View style={s.card}>
          <Text style={s.overline}>YOUR POSITION</Text>
          <View style={s.posHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.posName}>{position.startupName}</Text>
              <Text style={s.posSpv}>{position.spvName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.posMark}>{formatMoneyPrecise(mark)}</Text>
              <Text style={s.posMarkLabel}>NAV / UNIT</Text>
            </View>
          </View>
          <View style={s.posStats}>
            <Stat styles={s} k="Units held" v={String(position.units)} />
            <Stat styles={s} k="Available" v={String(available)} />
            <Stat styles={s} k="Value" v={formatMoneyCompact(position.units * mark)} />
          </View>
          <Pressable style={[s.listBtn, formOpen && s.listBtnOpen]} onPress={openForm} accessibilityRole="button">
            <Text style={[s.listBtnText, formOpen && s.listBtnTextOpen]}>{formOpen ? 'Close' : 'List units for sale →'}</Text>
          </Pressable>

          {formOpen && (
            <View style={s.form}>
              <Text style={s.formLabel}>UNITS</Text>
              <View style={s.chipRow}>
                {UNIT_PRESETS.map((u, i) => (
                  <Chip key={`${u}-${i}`} label={i === 2 ? `All ${u}` : String(u)} active={listUnits === u} onPress={() => setListUnits(u)} styles={s} />
                ))}
              </View>
              <Text style={s.formLabel}>PRICE / UNIT</Text>
              <View style={s.priceRow}>
                {PRICE_STEPS.map((d) => (
                  <Pressable key={d} style={s.stepBtn} onPress={() => setListPrice((p) => Math.max(0.01, Math.round((p + d) * 100) / 100))} accessibilityRole="button">
                    <Text style={s.stepBtnText}>{d > 0 ? `+${d}` : d}</Text>
                  </Pressable>
                ))}
                <Text style={s.priceValue}>{formatMoneyPrecise(listPrice)}</Text>
              </View>
              <Text style={s.proceeds}>
                You receive {formatMoneyPrecise(sellerProceeds(listUnits, listPrice))} if filled ({listUnits} × {formatMoneyPrecise(listPrice)}, no seller fee).
              </Text>
              <Pressable
                style={[s.cta, listUnits > available && s.ctaDisabled]}
                onPress={submitListing}
                disabled={listUnits > available}
                accessibilityRole="button"
              >
                <Text style={s.ctaText}>{listUnits > available ? 'Not enough units' : `List ${listUnits} units`}</Text>
              </Pressable>
            </View>
          )}

          {myListings.filter((l) => l.positionId === position.id).map((l) => (
            <View key={l.id} style={s.myListing}>
              <Text style={s.myListingText}>Listed {l.units} @ {formatMoneyPrecise(l.price)}</Text>
              <Pressable onPress={() => cancelListing(l.id)} hitSlop={8} accessibilityRole="button">
                <Text style={s.cancel}>Cancel</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Order book */}
        <View style={s.card}>
          <Text style={s.overline}>ORDER BOOK</Text>
          <View style={s.bookTop}>
            <BookQuote styles={s} k="BEST BID" v={bestBid(bids)} />
            <BookQuote styles={s} k="MID" v={midPrice(bids, asks)} />
            <BookQuote styles={s} k="BEST ASK" v={bestAsk(asks)} gold />
            <BookQuote styles={s} k="SPREAD" v={spread(bids, asks)} />
          </View>

          <Text style={s.bookSide}>ASKS · SELLERS</Text>
          {[...asks].reverse().map((a, i) => (
            <View key={`a${i}`} style={s.level}>
              <Text style={[s.levelPrice, s.askPrice]}>{formatMoneyPrecise(a.price)}</Text>
              <Text style={s.levelUnits}>{a.units} units</Text>
              <Pressable
                style={s.buyBtn}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  const c = buyerCost(Math.min(a.units, 25), a.price);
                  setBought(`Bought 25 @ ${formatMoneyPrecise(a.price)} — ${formatMoneyPrecise(c.subtotal)} + ${formatMoneyPrecise(c.fee)} fee = ${formatMoneyPrecise(c.total)}`);
                }}
                accessibilityRole="button"
              >
                <Text style={s.buyBtnText}>Buy</Text>
              </Pressable>
            </View>
          ))}

          <Text style={s.bookSide}>BIDS · TENDERS</Text>
          {bids.map((b, i) => (
            <View key={`b${i}`} style={s.level}>
              <Text style={[s.levelPrice, s.bidPrice]}>{formatMoneyPrecise(b.price)}</Text>
              <Text style={s.levelUnits}>{b.units} units</Text>
              <View style={s.tenderTag}><Text style={s.tenderTagText}>resting bid</Text></View>
            </View>
          ))}

          {bought && <Text style={s.boughtNote}>{bought}</Text>}
          <Text style={s.feeNote}>Buyers pay a 1.5% admin fee; sellers receive the full trade value. Transfers settle through the custody provider.</Text>
        </View>

        {/* Price history */}
        <View style={s.card}>
          <Text style={s.overline}>PRICE HISTORY — {position.startupName}</Text>
          <LineChart points={history} height={130} formatValue={(v) => formatMoneyPrecise(v)} />
        </View>
      </ScrollView>
    </View>
  );

  function Chip({ label, active, onPress, styles: st }: { label: string; active: boolean; onPress: () => void; styles: any }) {
    return (
      <Pressable style={[st.chip, active && st.chipActive]} onPress={onPress} accessibilityRole="button">
        <Text style={[st.chipText, active && st.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  }
}

function Stat({ k, v, styles: s }: { k: string; v: string; styles: any }) {
  return (
    <View style={s.stat}>
      <Text style={s.statV}>{v}</Text>
      <Text style={s.statK}>{k}</Text>
    </View>
  );
}

function BookQuote({ k, v, gold, styles: s }: { k: string; v: number | null; gold?: boolean; styles: any }) {
  return (
    <View style={s.quote}>
      <Text style={[s.quoteV, gold && s.quoteGold]}>{v === null ? '—' : formatMoneyPrecise(v)}</Text>
      <Text style={s.quoteK}>{k}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { backgroundColor: c.navy, paddingTop: space.xxl + space.sm, paddingHorizontal: space.lg, paddingBottom: space.lg },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginBottom: space.md },
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 34, color: c.onNavy },
    subtitle: { fontFamily: font.sans, fontSize: 12, lineHeight: 18, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
    posChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, backgroundColor: c.surface },
    posChipActive: { backgroundColor: c.navy, borderColor: c.navy },
    posChipText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.inkMuted },
    posChipTextActive: { color: c.gold },

    card: { backgroundColor: c.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, padding: space.lg, marginBottom: space.md },
    overline: { ...T.overline, marginBottom: space.sm },

    posHead: { flexDirection: 'row', alignItems: 'flex-start' },
    posName: { fontFamily: font.serif, fontSize: 19, color: c.ink },
    posSpv: { fontFamily: font.sans, fontSize: 12, color: c.inkFaint, marginTop: 2 },
    posMark: { fontFamily: font.serif, fontSize: 22, color: c.ink, ...tabularNums },
    posMarkLabel: { fontFamily: font.sans, fontSize: 9, letterSpacing: 1, color: c.inkFaint },
    posStats: { flexDirection: 'row', gap: space.lg, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline },
    stat: {},
    statV: { fontFamily: font.sans, fontSize: 16, fontWeight: '700', color: c.ink, ...tabularNums },
    statK: { fontFamily: font.sans, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: c.inkFaint, marginTop: 1 },

    listBtn: { marginTop: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: c.gold, alignItems: 'center', paddingVertical: 10 },
    listBtnOpen: { borderColor: c.hairline },
    listBtnText: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', color: c.gold },
    listBtnTextOpen: { color: c.inkFaint },

    form: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline },
    formLabel: { fontFamily: font.sans, fontSize: 10, letterSpacing: 1, color: c.inkFaint, marginBottom: space.sm, marginTop: space.sm },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, backgroundColor: c.surfaceMuted },
    chipActive: { backgroundColor: c.navy, borderColor: c.navy },
    chipText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.inkMuted },
    chipTextActive: { color: c.gold },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    stepBtn: { width: 46, height: 36, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceMuted },
    stepBtnText: { fontFamily: font.sans, fontSize: 12, color: c.ink },
    priceValue: { fontFamily: font.serif, fontSize: 20, color: c.gold, marginLeft: 'auto', ...tabularNums },
    proceeds: { ...T.caption, fontSize: 12, lineHeight: 17, color: c.inkMuted, marginTop: space.md },
    cta: { backgroundColor: c.gold, borderRadius: radius.sm, alignItems: 'center', paddingVertical: 12, marginTop: space.md },
    ctaDisabled: { backgroundColor: c.hairline },
    ctaText: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', color: '#0A192F' },

    myListing: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline },
    myListingText: { fontFamily: font.sans, fontSize: 13, color: c.ink },
    cancel: { fontFamily: font.sans, fontSize: 12, fontWeight: '600', color: c.danger },

    bookTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.md, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hairline },
    quote: { alignItems: 'center', flex: 1 },
    quoteV: { fontFamily: font.serif, fontSize: 16, color: c.ink, ...tabularNums },
    quoteGold: { color: c.gold },
    quoteK: { fontFamily: font.sans, fontSize: 8, letterSpacing: 0.8, color: c.inkFaint, marginTop: 2 },

    bookSide: { fontFamily: font.sans, fontSize: 10, letterSpacing: 1, color: c.inkFaint, marginTop: space.sm, marginBottom: space.xs },
    level: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline },
    levelPrice: { fontFamily: font.sans, fontSize: 15, fontWeight: '700', width: 84, ...tabularNums },
    askPrice: { color: c.danger },
    bidPrice: { color: c.emerald },
    levelUnits: { fontFamily: font.sans, fontSize: 13, color: c.inkMuted, flex: 1 },
    buyBtn: { backgroundColor: c.navy, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 16 },
    buyBtnText: { fontFamily: font.sans, fontSize: 12, fontWeight: '700', color: c.gold },
    tenderTag: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8 },
    tenderTagText: { fontFamily: font.sans, fontSize: 10, color: c.inkFaint },
    boughtNote: { ...T.caption, fontSize: 12, lineHeight: 17, color: c.emerald, marginTop: space.md },
    feeNote: { ...T.caption, fontSize: 11, lineHeight: 16, color: c.inkFaint, marginTop: space.sm },
  });
};
