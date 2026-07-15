import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Startup } from '../types';
import { Palette, radius, space, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { formatMoneyCompact, formatPct } from '../utils/format';
import { BookmarkButton } from './BookmarkButton';
import { ProgressBar } from './ProgressBar';
import { VerifiedBadge } from './VerifiedBadge';

const CLOSING_SOON_DAYS = 7;

interface Props {
  startup: Startup;
  onPress: (startup: Startup) => void;
}

export function StartupCard({ startup, onPress }: Props) {
  const s = useThemedStyles(makeStyles);
  const progress = startup.raisedAmount / startup.targetAmount;
  const closingSoon = startup.daysLeft <= CLOSING_SOON_DAYS;

  return (
    <Pressable
      onPress={() => onPress(startup)}
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${startup.name}, ${startup.vertical} spinout from ${startup.university.name}`}
    >
      <View style={s.topRow}>
        <Text style={s.vertical}>{startup.vertical}</Text>
        <View style={s.topRight}>
          {startup.verified && <VerifiedBadge />}
          <View style={s.bookmark}>
            <BookmarkButton startup={startup} />
          </View>
        </View>
      </View>

      <Text style={s.name}>{startup.name}</Text>
      <Text style={s.university}>
        {startup.university.name} · {startup.university.country}
      </Text>
      <Text style={s.tagline} numberOfLines={2}>
        {startup.tagline}
      </Text>

      <View style={s.divider} />

      <View style={s.raiseRow}>
        <Text style={s.raised}>
          {formatMoneyCompact(startup.raisedAmount)}
          <Text style={s.raisedOf}>  of {formatMoneyCompact(startup.targetAmount)}</Text>
        </Text>
        <Text style={s.pct}>{formatPct(progress)}</Text>
      </View>
      <ProgressBar progress={progress} />

      <View style={s.metaRow}>
        <Meta label="Investors" value={startup.investorCount.toLocaleString('en-US')} />
        <Meta label="Min. Ticket" value={formatMoneyCompact(startup.minInvestment)} />
        <Meta label="Closes In" value={`${startup.daysLeft}d`} urgent={closingSoon} />
      </View>

      <Text style={s.lead}>
        Anchored by <Text style={s.leadName}>{startup.leadInvestor}</Text>
      </Text>
    </Pressable>
  );

  function Meta({ label, value, urgent }: { label: string; value: string; urgent?: boolean }) {
    return (
      <View style={s.meta}>
        <Text style={[s.metaValue, urgent && s.metaValueUrgent]}>{value}</Text>
        <Text style={s.metaLabel}>{label}</Text>
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
      marginHorizontal: space.md,
      marginBottom: space.md,
    },
    cardPressed: { opacity: 0.92 },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space.sm,
    },
    topRight: { flexDirection: 'row', alignItems: 'center' },
    bookmark: { marginLeft: space.md },
    vertical: { ...T.overline, color: c.projection },
    name: { ...T.title, marginBottom: 2 },
    university: { ...T.caption, marginBottom: space.sm },
    tagline: { ...T.body, color: c.inkMuted, marginBottom: space.md },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.hairline,
      marginBottom: space.md,
    },
    raiseRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: space.sm,
    },
    raised: { ...T.financial, fontSize: 17, fontWeight: '600' },
    raisedOf: { ...T.financial, fontSize: 13, color: c.inkMuted, fontWeight: '400' },
    pct: { ...T.financial, fontSize: 13, color: c.emerald, fontWeight: '600' },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: space.md,
      marginBottom: space.sm,
    },
    meta: { flex: 1 },
    metaValue: { ...T.financial, fontWeight: '600' },
    metaValueUrgent: { color: c.amber },
    metaLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
    lead: { ...T.caption, marginTop: space.xs },
    leadName: { color: c.ink, fontWeight: '600' },
  });
};
