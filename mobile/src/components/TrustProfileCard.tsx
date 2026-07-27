import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { founderReputation, ReputationBand } from '../utils/reputation';
import { FOUNDER_ENDORSEMENTS } from '../data/reputation';

const FOLLOW_KEY = 'univest.follows.v1';

const BAND_COLOR: Record<ReputationBand, keyof Palette> = {
  Exceptional: 'emerald',
  Strong: 'projection',
  Developing: 'bronze',
  Unproven: 'inkMuted',
};

/**
 * Founder trust profile — the reputation & social layer at the point of
 * decision. An on-platform track record (executed and independently attested
 * milestones, replications, endorsements) rolls into a 0–100 trust score; the
 * follow action subscribes the investor to the founder's activity feed. Mirrors
 * the backend `GET /reputation/profile/:kind/:id`.
 */
export function TrustProfileCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const rep = founderReputation(startup);
  const endorsements = FOUNDER_ENDORSEMENTS[startup.id] ?? [];
  const followerBase = Math.max(1, Math.round(startup.investorCount * 0.05));
  const bandColor = palette[BAND_COLOR[rep.band]] as string;

  const [following, setFollowing] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(FOLLOW_KEY)
      .then((raw) => {
        if (!raw) return;
        const ids = JSON.parse(raw) as string[];
        if (Array.isArray(ids)) setFollowing(ids.includes(startup.id));
      })
      .catch(() => {});
  }, [startup.id]);

  const toggleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFollowing((cur) => {
      const next = !cur;
      AsyncStorage.getItem(FOLLOW_KEY)
        .then((raw) => {
          const ids: string[] = raw ? JSON.parse(raw) : [];
          const set = new Set(Array.isArray(ids) ? ids : []);
          if (next) set.add(startup.id);
          else set.delete(startup.id);
          return AsyncStorage.setItem(FOLLOW_KEY, JSON.stringify([...set]));
        })
        .catch(() => {});
      return next;
    });
  };

  const followers = followerBase + (following ? 1 : 0);
  const c = rep.counts;
  const lastName = rep.name.split(' ').slice(-1)[0];

  return (
    <View style={s.card}>
      <Text style={s.overline}>Founder Track Record</Text>

      <View style={s.headRow}>
        <View style={s.headMain}>
          <Text style={s.name}>{rep.name}</Text>
          <Text style={s.sub}>
            {followers.toLocaleString()} followers · {endorsements.length} endorsement
            {endorsements.length === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={s.scoreBox}>
          <Text style={s.score}>{rep.score}</Text>
          <View style={[s.bandPill, { borderColor: bandColor }]}>
            <Text style={[s.bandText, { color: bandColor }]}>{rep.band}</Text>
          </View>
        </View>
      </View>

      <View style={s.chipRow}>
        <Stat label="executed" value={c.completed} />
        <Stat label="attested" value={c.attested} />
        <Stat label="replicated" value={c.replicated} />
        <Stat label="endorsed" value={c.endorsements} />
      </View>

      {endorsements.length > 0 && (
        <View style={s.endorseList}>
          {endorsements.map((e) => (
            <View key={e.endorserName} style={s.endorse}>
              <Text style={s.endorseHead}>
                {e.endorserName} · {e.endorserRole}
              </Text>
              <Text style={s.endorseNote}>“{e.note}”</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={toggleFollow}
        style={[s.followBtn, following && s.followBtnOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: following }}
        accessibilityLabel={following ? `Unfollow ${rep.name}` : `Follow ${rep.name}`}
      >
        <Text style={[s.followText, following && s.followTextOn]}>
          {following ? 'Following ✓' : 'Follow founder'}
        </Text>
      </Pressable>
      <Text style={s.footnote}>
        Follow to get {lastName}'s milestone, attestation, and replication activity in your feed.
      </Text>
    </View>
  );

  function Stat({ label, value }: { label: string; value: number }) {
    return (
      <View style={s.stat}>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    );
  }
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
    },
    overline: { ...T.overline, marginBottom: space.md },

    headRow: { flexDirection: 'row', alignItems: 'flex-start' },
    headMain: { flex: 1, marginRight: space.md },
    name: { fontFamily: font.serif, fontSize: 20, color: c.ink },
    sub: { ...T.caption, marginTop: 2, ...tabularNums },
    scoreBox: { alignItems: 'flex-end' },
    score: { fontFamily: font.serif, fontSize: 34, color: c.ink, lineHeight: 36, ...tabularNums },
    bandPill: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginTop: 4,
    },
    bandText: { fontFamily: font.sans, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

    chipRow: {
      flexDirection: 'row',
      marginTop: space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: font.serif, fontSize: 18, color: c.ink, ...tabularNums },
    statLabel: {
      fontFamily: font.sans,
      fontSize: 10,
      color: c.inkMuted,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    endorseList: { marginTop: space.md },
    endorse: {
      borderLeftWidth: 2,
      borderLeftColor: c.bronze,
      paddingLeft: space.sm,
      marginTop: space.sm,
    },
    endorseHead: { fontFamily: font.sans, fontSize: 11, fontWeight: '700', color: c.bronze },
    endorseNote: { ...T.body, fontSize: 13, color: c.inkMuted, marginTop: 1 },

    followBtn: {
      marginTop: space.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.navy,
      borderRadius: radius.sm,
      paddingVertical: 11,
      alignItems: 'center',
      backgroundColor: c.surface,
    },
    followBtnOn: { backgroundColor: c.navy },
    followText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.navy },
    followTextOn: { color: '#F5F7FA' },
    footnote: { ...T.caption, marginTop: space.sm },
  });
};
