import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { STARTUPS } from '../data/mock';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { formatMoneyCompact, formatPct } from '../utils/format';

const MAX_COMPARE = 3;

interface Props {
  onClose: () => void;
  onSelectStartup: (startup: Startup) => void;
}

interface MetricRow {
  label: string;
  value: (st: Startup) => string;
  /** Highlight the best column for this metric. */
  best?: (values: number[]) => number;
  numeric?: (st: Startup) => number;
}

const METRICS: MetricRow[] = [
  { label: 'University', value: (st) => st.university.shortName },
  { label: 'Vertical', value: (st) => st.vertical },
  { label: 'Target', value: (st) => formatMoneyCompact(st.targetAmount) },
  {
    label: 'Subscribed',
    value: (st) => formatPct(st.raisedAmount / st.targetAmount),
    numeric: (st) => st.raisedAmount / st.targetAmount,
    best: (v) => v.indexOf(Math.max(...v)),
  },
  {
    label: 'Investors',
    value: (st) => st.investorCount.toLocaleString('en-US'),
    numeric: (st) => st.investorCount,
    best: (v) => v.indexOf(Math.max(...v)),
  },
  { label: 'Min. ticket', value: (st) => formatMoneyCompact(st.minInvestment) },
  {
    label: 'Closes in',
    value: (st) => `${st.daysLeft}d`,
    numeric: (st) => st.daysLeft,
    best: (v) => v.indexOf(Math.max(...v)),
  },
  { label: 'Lead investor', value: (st) => st.leadInvestor },
  { label: 'TTO verified', value: (st) => (st.verified ? '✦ Yes' : '—') },
  {
    label: 'Attestation rate',
    value: (st) => {
      const completed = st.milestones.filter((m) => m.status === 'completed').length;
      const attested = st.milestones.filter((m) => m.attestation).length;
      return completed === 0 ? '—' : `${Math.round((attested / completed) * 100)}%`;
    },
    numeric: (st) => {
      const completed = st.milestones.filter((m) => m.status === 'completed').length;
      return completed === 0 ? 0 : st.milestones.filter((m) => m.attestation).length / completed;
    },
    best: (v) => v.indexOf(Math.max(...v)),
  },
  {
    label: 'Lab progress',
    value: (st) => {
      const score = st.milestones.reduce(
        (acc, m) => acc + (m.status === 'completed' ? 1 : m.status === 'in_progress' ? 0.5 : 0),
        0,
      );
      return `${Math.round((score / st.milestones.length) * 100)}%`;
    },
  },
];

/** Side-by-side offering comparison — up to three deals, one metric per row. */
export function CompareScreen({ onClose, onSelectStartup }: Props) {
  const s = useThemedStyles(makeStyles);
  const [selectedIds, setSelectedIds] = useState<string[]>([STARTUPS[0].id, STARTUPS[2].id]);

  const toggle = (id: string) => {
    setSelectedIds((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= MAX_COMPARE
          ? cur
          : [...cur, id],
    );
  };

  const selected = STARTUPS.filter((st) => selectedIds.includes(st.id));

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close comparison">
          <Text style={s.back}>← Discovery</Text>
        </Pressable>
        <Text style={s.title}>Compare Offerings</Text>
        <Text style={s.subtitle}>Select up to {MAX_COMPARE} open deals</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pickerRow}>
          {STARTUPS.map((st) => {
            const on = selectedIds.includes(st.id);
            return (
              <Pressable
                key={st.id}
                style={[s.pick, on && s.pickActive]}
                onPress={() => toggle(st.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.pickText, on && s.pickTextActive]}>{st.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {selected.length < 2 ? (
          <Text style={s.empty}>Select at least two offerings to compare.</Text>
        ) : (
          <View style={s.table}>
            {/* Column headers */}
            <View style={s.row}>
              <View style={s.labelCell} />
              {selected.map((st) => (
                <Pressable
                  key={st.id}
                  style={s.valueCell}
                  onPress={() => onSelectStartup(st)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${st.name}`}
                >
                  <Text style={s.colHeader} numberOfLines={2}>
                    {st.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {METRICS.map((metric) => {
              const bestIndex =
                metric.best && metric.numeric
                  ? metric.best(selected.map((st) => metric.numeric!(st)))
                  : -1;
              return (
                <View key={metric.label} style={s.row}>
                  <View style={s.labelCell}>
                    <Text style={s.rowLabel}>{metric.label}</Text>
                  </View>
                  {selected.map((st, i) => (
                    <View key={st.id} style={s.valueCell}>
                      <Text style={[s.rowValue, i === bestIndex && s.rowValueBest]}>
                        {metric.value(st)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
        <Text style={s.footnote}>
          ✦ gold marks the leader per metric · tap a column header to open the offering
        </Text>
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
    subtitle: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted, marginTop: space.xs },
    pickerRow: { marginTop: space.md },
    pick: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairlineOnNavy,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm + 2,
      paddingVertical: 7,
      marginRight: space.sm,
    },
    pickActive: { borderColor: c.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
    pickText: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted },
    pickTextActive: { color: c.gold, fontWeight: '600' },

    content: { padding: space.md, paddingBottom: space.xxl },
    empty: { ...T.body, color: c.inkMuted, textAlign: 'center', marginTop: space.xl },

    table: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairline,
      paddingVertical: space.sm + 2,
    },
    labelCell: { width: 108, justifyContent: 'center' },
    valueCell: { flex: 1, justifyContent: 'center', paddingLeft: space.sm },
    colHeader: { fontFamily: font.serif, fontSize: 14, color: c.ink },
    rowLabel: {
      fontFamily: font.sans,
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: c.inkMuted,
    },
    rowValue: { fontFamily: font.sans, fontSize: 12, lineHeight: 17, color: c.ink, ...tabularNums },
    rowValueBest: { color: c.bronze, fontWeight: '700' },
    footnote: { ...T.caption, fontSize: 10, textAlign: 'center', marginTop: space.md },
  });
};
