import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DIRECTORY_SPINOUTS,
  DIRECTORY_UNIVERSITIES,
  DirectorySpinout,
  DirectoryUniversity,
} from '../data/directory';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';

interface Props {
  onClose: () => void;
}

type Filter = DirectoryUniversity | 'All';

/**
 * Spinout Directory — a read-only, factual reference of real companies spun
 * out of Oxford, MIT, and Harvard. No fundraising, no attestations, no invest
 * actions: this is educational reference material, deliberately separate from
 * UniVest's (fictional) investable offerings.
 */
export function DirectoryScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const [filter, setFilter] = useState<Filter>('All');

  const spinouts = useMemo(
    () =>
      DIRECTORY_SPINOUTS.filter((sp) => filter === 'All' || sp.university === filter).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [filter],
  );

  const counts = useMemo(() => {
    const by: Record<string, number> = { All: DIRECTORY_SPINOUTS.length };
    for (const u of DIRECTORY_UNIVERSITIES) {
      by[u] = DIRECTORY_SPINOUTS.filter((sp) => sp.university === u).length;
    }
    return by;
  }, []);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to discovery feed">
          <Text style={s.back}>← Discovery</Text>
        </Pressable>
        <Text style={s.title}>Spinout Directory</Text>
        <Text style={s.subtitle}>
          Notable real companies spun out of Oxford, MIT, and Harvard — factual reference, not
          UniVest offerings.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {(['All', ...DIRECTORY_UNIVERSITIES] as Filter[]).map((f) => (
            <Pressable
              key={f}
              style={[s.filterChip, filter === f && s.filterChipActive]}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f }}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f} · {counts[f]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            A curated, non-exhaustive selection of well-documented spinouts. Descriptions and
            listing status are public information; these companies are not raising on UniVest and
            nothing here is an offer to invest.
          </Text>
        </View>

        {spinouts.map((sp) => (
          <SpinoutCard key={sp.id} spinout={sp} />
        ))}
      </ScrollView>
    </View>
  );
}

function SpinoutCard({ spinout }: { spinout: DirectorySpinout }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.uni}>{spinout.university.toUpperCase()}</Text>
        <View style={s.statusChip}>
          <Text style={s.statusText}>{spinout.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={s.name}>{spinout.name}</Text>
      <Text style={s.sector}>
        {spinout.sector}
        {spinout.founded ? ` · est. ${spinout.founded}` : ''}
      </Text>
      <Text style={s.description}>{spinout.description}</Text>
      {spinout.note ? <Text style={s.note}>{spinout.note}</Text> : null}
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
      paddingBottom: space.md,
    },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginBottom: space.md },
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 34, color: c.onNavy },
    subtitle: {
      fontFamily: font.sans,
      fontSize: 12,
      lineHeight: 18,
      color: c.onNavyMuted,
      marginTop: space.xs,
      maxWidth: 340,
    },
    filterRow: { marginTop: space.md, marginHorizontal: -space.xs },
    filterChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairlineOnNavy,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: 7,
      marginHorizontal: space.xs,
    },
    filterChipActive: { borderColor: c.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
    filterText: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted },
    filterTextActive: { color: c.gold, fontWeight: '600' },

    content: { padding: space.md, paddingBottom: space.xxl },
    disclaimer: {
      borderLeftWidth: 2,
      borderLeftColor: c.bronze,
      paddingLeft: space.md,
      marginBottom: space.md,
      marginHorizontal: space.xs,
    },
    disclaimerText: { ...T.caption, fontSize: 11, lineHeight: 16 },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.sm,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space.sm,
    },
    uni: { ...T.overline, color: c.projection },
    statusChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    statusText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 1.1, fontWeight: '700', color: c.inkMuted },
    name: { ...T.title, fontSize: 20, marginBottom: 2 },
    sector: { ...T.caption, marginBottom: space.sm },
    description: { ...T.body, fontSize: 14, lineHeight: 21, color: c.inkMuted },
    note: {
      ...T.caption,
      fontSize: 11,
      lineHeight: 16,
      marginTop: space.sm,
      color: c.inkFaint,
      fontStyle: 'italic',
    },
  });
};
