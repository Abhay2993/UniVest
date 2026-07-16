import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { STARTUPS, UNIVERSITIES } from '../data/mock';
import { useWatchlist } from '../state/WatchlistContext';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { formatMoneyCompact } from '../utils/format';

interface Props {
  onClose: () => void;
  onShowOfferings: (universityId: string) => void;
}

/**
 * Web build of the Global Research Map. react-native-maps is native-only,
 * so the browser gets an institution index with the same data and actions;
 * the interactive pin map ships in the iOS/Android app.
 */
export function ResearchMap({ onClose, onShowOfferings }: Props) {
  const s = useThemedStyles(makeStyles);
  const { isFollowing, toggleFollow } = useWatchlist();

  const stats = useMemo(
    () =>
      UNIVERSITIES.map((u) => ({
        ...u,
        raisingVolume: STARTUPS.filter((st) => st.university.id === u.id).reduce(
          (sum, st) => sum + st.targetAmount,
          0,
        ),
      })),
    [],
  );

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back to list view">
          <Text style={s.back}>← List View</Text>
        </Pressable>
        <Text style={s.title}>Global Research Map</Text>
        <Text style={s.subtitle}>
          {UNIVERSITIES.length} universities · {STARTUPS.length} active raises — the interactive
          pin map is available in the iOS / Android app
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {stats.map((u) => {
          const following = isFollowing(u.id);
          return (
            <View key={u.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardLeft}>
                  <Text style={s.uniName}>{u.name}</Text>
                  <Text style={s.uniMeta}>
                    {u.city} · {u.country} · {u.latitude.toFixed(2)}°, {u.longitude.toFixed(2)}°
                  </Text>
                </View>
                <View style={s.pin}>
                  <Text style={s.pinCount}>{u.activeDeals}</Text>
                </View>
              </View>
              <View style={s.statRow}>
                <Text style={s.stat}>
                  {u.activeDeals} active deal{u.activeDeals === 1 ? '' : 's'}
                </Text>
                <Text style={s.statGold}>{formatMoneyCompact(u.raisingVolume)} raising</Text>
              </View>
              <View style={s.actions}>
                <Pressable
                  style={s.cta}
                  onPress={() => onShowOfferings(u.id)}
                  accessibilityRole="button"
                >
                  <Text style={s.ctaText}>View Offerings</Text>
                </Pressable>
                <Pressable
                  style={[s.followBtn, following && s.followBtnOn]}
                  onPress={() => toggleFollow(u.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: following }}
                >
                  <Text style={s.followText}>{following ? '★ Following' : '☆ Follow'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
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
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 32, color: c.onNavy },
    subtitle: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLeft: { flex: 1, paddingRight: space.md },
    uniName: { fontFamily: font.serif, fontSize: 17, color: c.ink },
    uniMeta: { ...T.caption, fontSize: 11, marginTop: 2 },
    pin: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(10,25,47,0.88)',
      borderWidth: 1.5,
      borderColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinCount: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', color: c.gold },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: space.md,
      marginBottom: space.md,
    },
    stat: { ...T.body, fontSize: 13, color: c.inkMuted },
    statGold: { ...T.financial, fontSize: 13, fontWeight: '600', color: c.bronze },
    actions: { flexDirection: 'row', alignItems: 'center' },
    cta: {
      flex: 1,
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 10,
      marginRight: space.sm,
    },
    ctaText: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', color: '#0A192F' },
    followBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      paddingVertical: 10,
      paddingHorizontal: space.md,
    },
    followBtnOn: { backgroundColor: c.surfaceGoldTint },
    followText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.bronze },
  });
};
