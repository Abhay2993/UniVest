import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { STARTUPS, UNIVERSITIES } from '../data/mock';
import { useWatchlist } from '../state/WatchlistContext';
import { University } from '../types';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoneyCompact } from '../utils/format';

interface Props {
  onClose: () => void;
  /** "View offerings" from a pin — returns to the list filtered to this university. */
  onShowOfferings: (universityId: string) => void;
}

interface UniversityStat extends University {
  raisingVolume: number;
}

/**
 * The Global Research Map — Module 1's signature discovery view.
 * University pins are sized by active deal volume; selecting a pin surfaces
 * a summary card with a route into the filtered offering list.
 */
export function ResearchMap({ onClose, onShowOfferings }: Props) {
  const { palette, scheme } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo<UniversityStat[]>(
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

  const selected = stats.find((u) => u.id === selectedId) ?? null;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to list view">
          <Text style={s.back}>← List View</Text>
        </Pressable>
        <Text style={s.title}>Global Research Map</Text>
        <Text style={s.subtitle}>
          {UNIVERSITIES.length} universities · {STARTUPS.length} active raises — pins sized by deal volume
        </Text>
      </View>

      <MapView
        style={s.map}
        initialRegion={{ latitude: 46, longitude: 25, latitudeDelta: 55, longitudeDelta: 160 }}
        customMapStyle={scheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        onPress={() => setSelectedId(null)}
        accessibilityLabel="World map of active university spinout raises"
      >
        {stats.map((u) => (
          <Marker
            key={u.id}
            coordinate={{ latitude: u.latitude, longitude: u.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={selectedId === u.id}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedId(u.id);
            }}
          >
            <UniversityPin stat={u} selected={selectedId === u.id} />
          </Marker>
        ))}
      </MapView>

      {selected && (
        <View style={s.card}>
          <Text style={s.cardOverline}>{selected.city} · {selected.country}</Text>
          <Text style={s.cardTitle}>{selected.name}</Text>
          <View style={s.cardStats}>
            <View style={s.cardStat}>
              <Text style={s.cardStatValue}>{selected.activeDeals}</Text>
              <Text style={s.cardStatLabel}>Active Deals</Text>
            </View>
            <View style={s.cardStatDivider} />
            <View style={s.cardStat}>
              <Text style={[s.cardStatValue, { color: palette.gold }]}>
                {formatMoneyCompact(selected.raisingVolume)}
              </Text>
              <Text style={s.cardStatLabel}>Raising</Text>
            </View>
          </View>
          <View style={s.cardActions}>
            <Pressable
              style={s.cardCta}
              onPress={() => onShowOfferings(selected.id)}
              accessibilityRole="button"
            >
              <Text style={s.cardCtaText}>
                View {STARTUPS.filter((st) => st.university.id === selected.id).length || selected.activeDeals} Offering
                {selected.activeDeals === 1 ? '' : 's'}
              </Text>
            </Pressable>
            <FollowButton universityId={selected.id} />
          </View>
        </View>
      )}
    </View>
  );
}

function UniversityPin({ stat, selected }: { stat: UniversityStat; selected: boolean }) {
  const s = useThemedStyles(makeStyles);
  const diameter = 28 + stat.activeDeals * 6;
  return (
    <View style={s.pinWrap}>
      <View
        style={[
          s.pin,
          { width: diameter, height: diameter, borderRadius: diameter / 2 },
          selected && s.pinSelected,
        ]}
      >
        <Text style={[s.pinCount, selected && s.pinCountSelected]}>{stat.activeDeals}</Text>
      </View>
      <View style={s.pinLabel}>
        <Text style={s.pinLabelText}>{stat.shortName}</Text>
      </View>
    </View>
  );
}

function FollowButton({ universityId }: { universityId: string }) {
  const { isFollowing, toggleFollow } = useWatchlist();
  const s = useThemedStyles(makeStyles);
  const following = isFollowing(universityId);
  return (
    <Pressable
      style={[s.followBtn, following && s.followBtnActive]}
      onPress={() => toggleFollow(universityId)}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
    >
      <Text style={[s.followText, following && s.followTextActive]}>
        {following ? '★ Following' : '☆ Follow'}
      </Text>
    </Pressable>
  );
}

/** Muted institutional cartography (applies on Google-provider surfaces). */
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0D1E36' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5B6B7E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050C16' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050C16' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#22334A' }] },
];

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#ECEFF1' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5B6B7E' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C9D5DE' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#B7C3CC' }] },
];

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

    map: { flex: 1 },

    pinWrap: { alignItems: 'center' },
    pin: {
      backgroundColor: 'rgba(10,25,47,0.88)',
      borderWidth: 1.5,
      borderColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinSelected: { backgroundColor: c.gold },
    pinCount: { fontFamily: font.sans, fontSize: 12, fontWeight: '700', color: c.gold },
    pinCountSelected: { color: '#0A192F' },
    pinLabel: {
      marginTop: 3,
      backgroundColor: 'rgba(10,25,47,0.78)',
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    pinLabelText: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 0.8,
      color: '#F5F7FA',
      fontWeight: '600',
    },

    card: {
      position: 'absolute',
      left: space.md,
      right: space.md,
      bottom: space.xl,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    cardOverline: { ...T.overline, marginBottom: space.xs },
    cardTitle: { ...T.title, marginBottom: space.md },
    cardStats: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
    cardStat: { flex: 1 },
    cardStatDivider: {
      width: StyleSheet.hairlineWidth,
      height: 26,
      backgroundColor: c.hairline,
      marginRight: space.md,
    },
    cardStatValue: { ...T.financial, fontSize: 17, fontWeight: '600' },
    cardStatLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
    cardActions: { flexDirection: 'row', alignItems: 'center' },
    cardCta: {
      flex: 1,
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 11,
      marginRight: space.sm,
    },
    cardCtaText: {
      fontFamily: font.sans,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
      color: '#0A192F',
    },
    followBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      paddingVertical: 11,
      paddingHorizontal: space.md,
    },
    followBtnActive: { backgroundColor: c.surfaceGoldTint },
    followText: { fontFamily: font.sans, fontSize: 13, color: c.bronze, fontWeight: '600' },
    followTextActive: { color: c.bronze },
  });
};
