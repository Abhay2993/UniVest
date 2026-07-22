import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { INDEX_BY_VERTICAL } from '../data/outcomes';
import { compositeIndex, indexReturn, IndexPoint } from '../utils/calibration';
import { Vertical } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { ChartPoint, LineChart } from '../components/LineChart';

interface Props {
  onClose: () => void;
}

const VERTICALS = Object.keys(INDEX_BY_VERTICAL) as Vertical[];

/**
 * The UniVest Deep-Tech Index — an "S&P for university spinouts". A composite
 * benchmark plus per-vertical sub-indices (base 100 at inception), computed
 * from aggregate NAV progress. If the category cites this as its reference
 * rate, that is a brand + data moat.
 */
export function DeepTechIndexScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [selected, setSelected] = useState<Vertical | 'Composite'>('Composite');

  const composite = useMemo(() => compositeIndex(INDEX_BY_VERTICAL), []);
  const activeSeries: IndexPoint[] =
    selected === 'Composite' ? composite : INDEX_BY_VERTICAL[selected];
  const activeReturn = useMemo(() => indexReturn(activeSeries), [activeSeries]);

  const chartPoints: ChartPoint[] = activeSeries.map((p) => ({ date: p.date, value: p.level }));
  const currentLevel = activeSeries[activeSeries.length - 1].level;

  // Ranked vertical table.
  const rows = useMemo(
    () =>
      VERTICALS.map((v) => ({
        vertical: v,
        level: INDEX_BY_VERTICAL[v][INDEX_BY_VERTICAL[v].length - 1].level,
        ret: indexReturn(INDEX_BY_VERTICAL[v]),
      })).sort((a, b) => b.ret.total - a.ret.total),
    [],
  );

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to discovery feed">
          <Text style={s.back}>← Discovery</Text>
        </Pressable>
        <Text style={s.title}>Deep-Tech Index</Text>
        <Text style={s.subtitle}>
          The benchmark for university spinout equity — composite and by vertical, base 100 at
          inception.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.overline}>{selected === 'Composite' ? 'UniVest Composite' : selected}</Text>
          <View style={s.levelRow}>
            <Text style={s.level}>{currentLevel.toFixed(1)}</Text>
            <View style={s.retBlock}>
              <Text style={[s.ret, { color: activeReturn.total >= 0 ? palette.emerald : palette.danger }]}>
                {activeReturn.total >= 0 ? '+' : ''}
                {(activeReturn.total * 100).toFixed(1)}%
              </Text>
              <Text style={s.retLabel}>
                since inception · {(activeReturn.annualized * 100).toFixed(1)}%/yr
              </Text>
            </View>
          </View>
          <View style={s.chartWrap}>
            <LineChart
              points={chartPoints}
              formatValue={(v) => v.toFixed(1)}
              color={selected === 'Composite' ? palette.gold : palette.emerald}
            />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.overline}>Select Index</Text>
          <View style={s.chipRow}>
            {(['Composite', ...VERTICALS] as const).map((v) => (
              <Pressable
                key={v}
                style={[s.chip, selected === v && s.chipActive]}
                onPress={() => setSelected(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === v }}
              >
                <Text style={[s.chipText, selected === v && s.chipTextActive]}>{v}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.overline}>Sub-Indices by Vertical</Text>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.colName]}>Vertical</Text>
            <Text style={[s.th, s.colNum]}>Level</Text>
            <Text style={[s.th, s.colNum]}>Return</Text>
          </View>
          {rows.map((r, i) => (
            <Pressable
              key={r.vertical}
              style={[s.tr, i === rows.length - 1 && s.trLast]}
              onPress={() => setSelected(r.vertical)}
              accessibilityRole="button"
            >
              <Text style={[s.td, s.colName]}>{r.vertical}</Text>
              <Text style={[s.td, s.colNum]}>{r.level.toFixed(1)}</Text>
              <Text
                style={[s.td, s.colNum, { color: r.ret.total >= 0 ? palette.emerald : palette.danger }]}
              >
                {r.ret.total >= 0 ? '+' : ''}
                {(r.ret.total * 100).toFixed(1)}%
              </Text>
            </Pressable>
          ))}
          <Text style={s.footnote}>
            Modeled from aggregate SPV NAV marks and milestone progress. Not a tradable instrument;
            a benchmark for context. Production computes levels from spv_valuations.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.navy,
      paddingTop: space.xxl + space.sm,
      paddingHorizontal: space.lg,
      paddingBottom: space.lg,
    },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginBottom: space.md },
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 34, color: c.onNavy },
    subtitle: { fontFamily: font.sans, fontSize: 12, lineHeight: 18, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.md,
    },
    overline: { ...T.overline, marginBottom: space.sm },
    levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    level: { fontFamily: font.serif, fontSize: 34, color: c.ink, ...tabularNums },
    retBlock: { alignItems: 'flex-end' },
    ret: { ...T.financial, fontSize: 18, fontWeight: '600' },
    retLabel: { ...T.caption, fontSize: 10, marginTop: 1 },
    chartWrap: { marginTop: space.md },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
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
    chipText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    chipTextActive: { color: c.bronze, fontWeight: '600' },

    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairline,
      paddingBottom: 6,
    },
    th: { fontFamily: font.sans, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: c.inkFaint },
    tr: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairline,
      paddingVertical: space.sm + 2,
    },
    trLast: { borderBottomWidth: 0 },
    td: { ...T.financial, fontSize: 13 },
    colName: { flex: 1 },
    colNum: { width: 72, textAlign: 'right', ...tabularNums },
    footnote: { ...T.caption, fontSize: 10, lineHeight: 15, marginTop: space.md },
  });
};
