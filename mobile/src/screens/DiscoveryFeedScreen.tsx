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
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { useWatchlist } from '../state/WatchlistContext';
import { formatMoneyCompact } from '../utils/format';
import { ResearchMap } from '../components/ResearchMap';
import { StartupCard } from '../components/StartupCard';
import { UniversityLeaderboard } from '../components/UniversityLeaderboard';

interface Props {
  onSelectStartup: (startup: Startup) => void;
}

const THEME_LABEL: Record<'system' | 'light' | 'dark', string> = {
  system: 'AUTO',
  light: 'LIGHT',
  dark: 'DARK',
};

/**
 * Global Discovery Feed — Module 1.
 * List and map views over active spinouts, filterable by academic vertical,
 * originating university, and the user's watchlist.
 */
export function DiscoveryFeedScreen({ onSelectStartup }: Props) {
  const { preference, cyclePreference } = useTheme();
  const s = useThemedStyles(makeStyles);
  const { watchedIds, isFollowing } = useWatchlist();

  const [view, setView] = useState<'list' | 'map'>('list');
  const [vertical, setVertical] = useState<Vertical | 'All'>('All');
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  const startups = useMemo(
    () =>
      STARTUPS.filter(
        (st) =>
          (vertical === 'All' || st.vertical === vertical) &&
          (universityId === null || st.university.id === universityId) &&
          (!watchlistOnly || watchedIds.includes(st.id)),
      ),
    [vertical, universityId, watchlistOnly, watchedIds],
  );

  const totalDeployed = useMemo(
    () => STARTUPS.reduce((sum, st) => sum + st.raisedAmount, 0),
    [],
  );

  if (view === 'map') {
    return (
      <ResearchMap
        onClose={() => setView('list')}
        onShowOfferings={(id) => {
          setUniversityId(id);
          setVertical('All');
          setWatchlistOnly(false);
          setView('list');
        }}
      />
    );
  }

  return (
    <View style={s.screen}>
      <FlatList
        data={startups}
        keyExtractor={(st) => st.id}
        renderItem={({ item }) => <StartupCard startup={item} onPress={onSelectStartup} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.brandRow}>
                <Text style={s.brand}>UNIVEST</Text>
                <Pressable
                  onPress={cyclePreference}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Theme: ${THEME_LABEL[preference]}. Tap to change.`}
                >
                  <Text style={s.themeToggle}>◐ {THEME_LABEL[preference]}</Text>
                </Pressable>
              </View>
              <Text style={s.heroTitle}>Global Discovery</Text>
              <Text style={s.heroSubtitle}>
                Deep-tech spinouts from the world's leading research universities
              </Text>

              <View style={s.statsRow}>
                <HeroStat value={String(STARTUPS.length)} label="Active Raises" />
                <View style={s.statDivider} />
                <HeroStat value={String(UNIVERSITIES.length)} label="Universities" />
                <View style={s.statDivider} />
                <HeroStat value={formatMoneyCompact(totalDeployed)} label="Committed" gold />
              </View>

              <View style={s.viewToggle}>
                <View style={[s.viewToggleBtn, s.viewToggleBtnActive]}>
                  <Text style={[s.viewToggleText, s.viewToggleTextActive]}>List View</Text>
                </View>
                <Pressable
                  style={s.viewToggleBtn}
                  onPress={() => setView('map')}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to the global research map"
                >
                  <Text style={s.viewToggleText}>Research Map</Text>
                </Pressable>
              </View>
            </View>

            <Text style={s.sectionLabel}>Academic Vertical</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipRow}
            >
              {(['All', ...VERTICALS] as const).map((v) => (
                <FilterChip key={v} label={v} active={vertical === v} onPress={() => setVertical(v)} />
              ))}
            </ScrollView>

            <Text style={s.sectionLabel}>Universities</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipRow}
            >
              {UNIVERSITIES.map((u) => (
                <UniversityTile
                  key={u.id}
                  shortName={u.shortName}
                  country={u.country}
                  deals={u.activeDeals}
                  active={universityId === u.id}
                  followed={isFollowing(u.id)}
                  onPress={() => setUniversityId(universityId === u.id ? null : u.id)}
                />
              ))}
            </ScrollView>

            <UniversityLeaderboard />

            <View style={s.offeringsRow}>
              <Text style={s.sectionLabelInline}>
                {startups.length} Open Offering{startups.length === 1 ? '' : 's'}
              </Text>
              <Pressable
                onPress={() => setWatchlistOnly((cur) => !cur)}
                accessibilityRole="button"
                accessibilityState={{ selected: watchlistOnly }}
                style={[s.watchlistToggle, watchlistOnly && s.watchlistToggleActive]}
              >
                <Text style={[s.watchlistToggleText, watchlistOnly && s.watchlistToggleTextActive]}>
                  ★ Watchlist{watchedIds.length > 0 ? ` (${watchedIds.length})` : ''}
                </Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={s.empty}>
            {watchlistOnly
              ? 'Your watchlist is empty — tap the ☆ on any offering to follow it and get closing alerts.'
              : 'No open offerings match this selection.'}
          </Text>
        }
      />
    </View>
  );

  function HeroStat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
    return (
      <View style={s.stat}>
        <Text style={[s.statValue, gold && s.statValueGold]}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
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
        style={[s.chip, active && s.chipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  }

  function UniversityTile({
    shortName,
    country,
    deals,
    active,
    followed,
    onPress,
  }: {
    shortName: string;
    country: string;
    deals: number;
    active: boolean;
    followed: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={[s.uniTile, active && s.uniTileActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[s.uniName, active && s.uniNameActive]}>
          {shortName}
          {followed ? <Text style={s.uniFollowMark}> ★</Text> : null}
        </Text>
        <Text style={s.uniMeta}>
          {country} · {deals} deal{deals === 1 ? '' : 's'}
        </Text>
      </Pressable>
    );
  }
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    listContent: { paddingBottom: space.xxl },

    hero: {
      backgroundColor: c.navy,
      paddingTop: space.xxl + space.md,
      paddingHorizontal: space.lg,
      paddingBottom: space.lg,
      marginBottom: space.lg,
    },
    brandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space.md,
    },
    brand: { fontFamily: font.sans, fontSize: 11, letterSpacing: 4, color: c.gold },
    themeToggle: {
      fontFamily: font.sans,
      fontSize: 10,
      letterSpacing: 1.4,
      color: c.onNavyMuted,
    },
    heroTitle: { fontFamily: font.serif, fontSize: 32, lineHeight: 42, color: c.onNavy },
    heroSubtitle: {
      fontFamily: font.sans,
      fontSize: 13,
      lineHeight: 20,
      color: c.onNavyMuted,
      marginTop: space.sm,
      maxWidth: 300,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: space.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairlineOnNavy,
      paddingTop: space.md,
    },
    stat: { flex: 1 },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 28,
      backgroundColor: c.hairlineOnNavy,
      marginRight: space.md,
    },
    statValue: {
      fontFamily: font.sans,
      fontSize: 18,
      fontWeight: '600',
      color: c.onNavy,
      ...tabularNums,
    },
    statValueGold: { color: c.gold },
    statLabel: {
      fontFamily: font.sans,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.onNavyMuted,
      marginTop: 2,
    },

    viewToggle: {
      flexDirection: 'row',
      marginTop: space.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairlineOnNavy,
      borderRadius: radius.sm,
      overflow: 'hidden',
    },
    viewToggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 9 },
    viewToggleBtnActive: { backgroundColor: 'rgba(212,175,55,0.14)' },
    viewToggleText: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted },
    viewToggleTextActive: { color: c.gold, fontWeight: '600' },

    sectionLabel: {
      ...T.overline,
      marginHorizontal: space.md,
      marginBottom: space.sm,
      marginTop: space.sm,
    },
    sectionLabelInline: { ...T.overline },
    chipRow: { paddingHorizontal: space.md, paddingBottom: space.md },

    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: 7,
      marginRight: space.sm,
    },
    chipActive: { backgroundColor: c.navy, borderColor: c.projection },
    chipText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    chipTextActive: { color: '#F5F7FA', fontWeight: '600' },

    uniTile: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      marginRight: space.sm,
      minWidth: 104,
    },
    uniTileActive: { borderColor: c.bronze, backgroundColor: c.surfaceGoldTint },
    uniName: { fontFamily: font.serif, fontSize: 15, color: c.ink },
    uniNameActive: { color: c.bronze },
    uniFollowMark: { fontSize: 11, color: c.gold },
    uniMeta: { fontFamily: font.sans, fontSize: 10, color: c.inkFaint, marginTop: 2 },

    offeringsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: space.md,
      marginTop: space.sm,
      marginBottom: space.sm,
    },
    watchlistToggle: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 4,
    },
    watchlistToggleActive: { borderColor: c.bronze, backgroundColor: c.surfaceGoldTint },
    watchlistToggleText: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted },
    watchlistToggleTextActive: { color: c.bronze, fontWeight: '600' },

    empty: {
      ...T.body,
      color: c.inkMuted,
      textAlign: 'center',
      marginTop: space.xl,
      marginHorizontal: space.xl,
    },
  });
};
