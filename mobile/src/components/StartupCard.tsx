import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Startup } from '../types';
import { color, radius, space, type } from '../theme/tokens';
import { formatMoneyCompact, formatPct } from '../utils/format';
import { ProgressBar } from './ProgressBar';
import { VerifiedBadge } from './VerifiedBadge';

interface Props {
  startup: Startup;
  onPress: (startup: Startup) => void;
}

export function StartupCard({ startup, onPress }: Props) {
  const progress = startup.raisedAmount / startup.targetAmount;

  return (
    <Pressable
      onPress={() => onPress(startup)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${startup.name}, ${startup.vertical} spinout from ${startup.university.name}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.vertical}>{startup.vertical}</Text>
        {startup.verified && <VerifiedBadge />}
      </View>

      <Text style={styles.name}>{startup.name}</Text>
      <Text style={styles.university}>
        {startup.university.name} · {startup.university.country}
      </Text>
      <Text style={styles.tagline} numberOfLines={2}>
        {startup.tagline}
      </Text>

      <View style={styles.divider} />

      <View style={styles.raiseRow}>
        <Text style={styles.raised}>
          {formatMoneyCompact(startup.raisedAmount)}
          <Text style={styles.raisedOf}>  of {formatMoneyCompact(startup.targetAmount)}</Text>
        </Text>
        <Text style={styles.pct}>{formatPct(progress)}</Text>
      </View>
      <ProgressBar progress={progress} />

      <View style={styles.metaRow}>
        <Meta label="Investors" value={startup.investorCount.toLocaleString('en-US')} />
        <Meta label="Min. Ticket" value={formatMoneyCompact(startup.minInvestment)} />
        <Meta label="Closes In" value={`${startup.daysLeft}d`} />
      </View>

      <Text style={styles.lead}>
        Anchored by <Text style={styles.leadName}>{startup.leadInvestor}</Text>
      </Text>
    </Pressable>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
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
  vertical: { ...type.overline, color: color.projection },
  name: { ...type.title, marginBottom: 2 },
  university: { ...type.caption, marginBottom: space.sm },
  tagline: { ...type.body, color: color.inkMuted, marginBottom: space.md },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.hairline,
    marginBottom: space.md,
  },
  raiseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: space.sm,
  },
  raised: { ...type.financial, fontSize: 17, fontWeight: '600' },
  raisedOf: { ...type.financial, fontSize: 13, color: color.inkMuted, fontWeight: '400' },
  pct: { ...type.financial, fontSize: 13, color: color.emerald, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.md,
    marginBottom: space.sm,
  },
  meta: { flex: 1 },
  metaValue: { ...type.financial, fontWeight: '600' },
  metaLabel: { ...type.caption, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  lead: { ...type.caption, marginTop: space.xs },
  leadName: { color: color.ink, fontWeight: '600' },
});
