import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { STARTUPS, UNIVERSITIES, VERTICALS } from '../data/mock';
import { Startup, Vertical } from '../types';
import { color, font, radius, space, type } from '../theme/tokens';
import { formatMoneyCompact } from '../utils/format';
import { StartupCard } from '../components/StartupCard';

interface Props {
  onSelectStartup: (startup: Startup) => void;
}

/**
 * Global Discovery Feed — Module 1.
 * Browse active spinouts by academic vertical or originating university.
 * The university strip is the list-form companion to the interactive
 * global research map (map view ships with the geo release).
 */
export function DiscoveryFeedScreen({ onSelectStartup }: Props) {
  const [vertical, setVertical] = useState<Vertical | 'All'>('All');
  const [universityId, setUniversityId] = useState<string | null>(null);

  const startups = useMemo(
    () =>
      STARTUPS.filter(
        (s) =>
          (vertical === 'All' || s.vertical === vertical) &&
          (universityId === null || s.university.id === universityId),
      ),
    [vertical, universityId],
  );

  const totalDeployed = useMemo(
    () => STARTUPS.reduce((sum, s) => sum + s.raisedAmount, 0),
    [],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={startups}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StartupCard startup={item} onPress={onSelectStartup} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <Text style={styles.brand}>UNIVEST</Text>
              <Text style={styles.heroTitle}>Global Discovery</Text>
              <Text style={styles.heroSubtitle}>
                Deep-tech spinouts from the world's leading research universities
              </Text>

              <View style={styles.statsRow}>
                <HeroStat value={String(STARTUPS.length)} label="Active Raises" />
                <View style={styles.statDivider} />
                <HeroStat value={String(UNIVERSITIES.length)} label="Universities" />
                <View style={styles.statDivider} />
                <HeroStat value={formatMoneyCompact(totalDeployed)} label="Committed" gold />
              </View>
            </View>

            <Text style={[type.overline, styles.sectionLabel]}>Academic Vertical</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {(['All', ...VERTICALS] as const).map((v) => (
                <FilterChip key={v} label={v} active={vertical === v} onPress={() => setVertical(v)} />
              ))}
            </ScrollView>

            <Text style={[type.overline, styles.sectionLabel]}>Research Map</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {UNIVERSITIES.map((u) => (
                <UniversityTile
                  key={u.id}
                  shortName={u.shortName}
                  country={u.country}
                  deals={u.activeDeals}
                  active={universityId === u.id}
                  onPress={() => setUniversityId(universityId === u.id ? null : u.id)}
                />
              ))}
            </ScrollView>

            <Text style={[type.overline, styles.sectionLabel]}>
              {startups.length} Open Offering{startups.length === 1 ? '' : 's'}
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No open offerings match this selection.</Text>
        }
      />
    </View>
  );
}

function HeroStat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, gold && { color: color.gold }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function UniversityTile({
  shortName,
  country,
  deals,
  active,
  onPress,
}: {
  shortName: string;
  country: string;
  deals: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.uniTile, active && styles.uniTileActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.uniName, active && styles.uniNameActive]}>{shortName}</Text>
      <Text style={styles.uniMeta}>
        {country} · {deals} deal{deals === 1 ? '' : 's'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  listContent: { paddingBottom: space.xxl },

  hero: {
    backgroundColor: color.navy,
    paddingTop: space.xxl + space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    marginBottom: space.lg,
  },
  brand: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 4,
    color: color.gold,
    marginBottom: space.md,
  },
  heroTitle: { fontFamily: font.serif, fontSize: 32, lineHeight: 40, color: color.onNavy },
  heroSubtitle: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: color.onNavyMuted,
    marginTop: space.sm,
    maxWidth: 300,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairlineOnNavy,
    paddingTop: space.md,
  },
  stat: { flex: 1 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: color.hairlineOnNavy,
    marginRight: space.md,
  },
  statValue: {
    fontFamily: font.sans,
    fontSize: 18,
    fontWeight: '600',
    color: color.onNavy,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.onNavyMuted,
    marginTop: 2,
  },

  sectionLabel: { marginHorizontal: space.md, marginBottom: space.sm, marginTop: space.sm },
  chipRow: { paddingHorizontal: space.md, paddingBottom: space.md },

  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    marginRight: space.sm,
  },
  chipActive: { backgroundColor: color.navy, borderColor: color.navy },
  chipText: { fontFamily: font.sans, fontSize: 12, color: color.inkMuted },
  chipTextActive: { color: color.onNavy, fontWeight: '600' },

  uniTile: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.sm,
    minWidth: 104,
  },
  uniTileActive: { borderColor: color.bronze, backgroundColor: '#FBF7EC' },
  uniName: { fontFamily: font.serif, fontSize: 15, color: color.ink },
  uniNameActive: { color: color.bronze },
  uniMeta: { fontFamily: font.sans, fontSize: 10, color: color.inkFaint, marginTop: 2 },

  empty: { ...type.body, color: color.inkMuted, textAlign: 'center', marginTop: space.xl },
});
