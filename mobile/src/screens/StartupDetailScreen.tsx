import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Startup } from '../types';
import { color, font, radius, space, type } from '../theme/tokens';
import { formatMoney, formatMoneyCompact, formatPct } from '../utils/format';
import { MilestoneTracker } from '../components/MilestoneTracker';
import { ProgressBar } from '../components/ProgressBar';
import { VerifiedBadge } from '../components/VerifiedBadge';

type PitchTab = 'plain' | 'commercial' | 'proof';

const PITCH_TABS: { key: PitchTab; label: string }[] = [
  { key: 'plain', label: 'Plain English' },
  { key: 'commercial', label: 'Commercialization' },
  { key: 'proof', label: 'The Lab Proof' },
];

interface Props {
  startup: Startup;
  onBack: () => void;
}

/**
 * Startup detail — AI Layman Pitch Deck (Module 2) above the interactive
 * Visual Milestone Tracker, closed by the gold invest CTA with haptic
 * confirmation on commit.
 */
export function StartupDetailScreen({ startup, onBack }: Props) {
  const [tab, setTab] = useState<PitchTab>('plain');
  const [committed, setCommitted] = useState(false);
  const progress = startup.raisedAmount / startup.targetAmount;

  const pitchText =
    tab === 'plain'
      ? startup.pitch.plainEnglish
      : tab === 'commercial'
        ? startup.pitch.commercialization
        : startup.pitch.labProof;

  const confirmInvestment = () => {
    // Haptic feedback on financial confirmation, per micro-interaction spec.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCommitted(true);
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to discovery feed">
            <Text style={styles.back}>← Discovery</Text>
          </Pressable>

          <Text style={styles.vertical}>{startup.vertical}</Text>
          <Text style={styles.name}>{startup.name}</Text>
          <Text style={styles.university}>
            {startup.university.name} · {startup.university.country}
          </Text>
          {startup.verified && (
            <View style={styles.badgeRow}>
              <VerifiedBadge />
            </View>
          )}
        </View>

        {/* Funding summary */}
        <View style={styles.card}>
          <Text style={type.overline}>Offering</Text>
          <View style={styles.raiseRow}>
            <Text style={styles.raised}>{formatMoney(startup.raisedAmount)}</Text>
            <Text style={styles.pct}>{formatPct(progress)} funded</Text>
          </View>
          <ProgressBar progress={progress} height={4} />
          <View style={styles.fundMetaRow}>
            <FundMeta label="Target" value={formatMoneyCompact(startup.targetAmount)} />
            <FundMeta label="Investors" value={startup.investorCount.toLocaleString('en-US')} />
            <FundMeta label="Min. Ticket" value={formatMoneyCompact(startup.minInvestment)} />
            <FundMeta label="Closes In" value={`${startup.daysLeft} days`} />
          </View>
          <Text style={styles.lead}>
            Anchored by <Text style={styles.leadName}>{startup.leadInvestor}</Text> · SPV structure —
            one line on the cap table
          </Text>
        </View>

        {/* AI Layman Pitch Deck */}
        <View style={styles.card}>
          <Text style={type.overline}>AI Research Briefing</Text>
          <View style={styles.tabRow}>
            {PITCH_TABS.map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.pitchText}>{pitchText}</Text>
          <Text style={styles.pitchDisclaimer}>
            Generated from the founding team's peer-reviewed publications. Not investment advice.
          </Text>
        </View>

        {/* Visual Milestone Tracker */}
        <View style={styles.trackerWrap}>
          <MilestoneTracker milestones={startup.milestones} />
        </View>
      </ScrollView>

      {/* Invest CTA — champagne gold, reserved for the primary action */}
      <View style={styles.ctaBar}>
        <Pressable
          onPress={confirmInvestment}
          disabled={committed}
          style={({ pressed }) => [
            styles.cta,
            pressed && styles.ctaPressed,
            committed && styles.ctaDone,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Invest in ${startup.name}, minimum ${formatMoney(startup.minInvestment)}`}
        >
          <Text style={[styles.ctaText, committed && styles.ctaTextDone]}>
            {committed
              ? '✓ Commitment Reserved'
              : `Invest — from ${formatMoney(startup.minInvestment)}`}
          </Text>
        </Pressable>
        <Text style={styles.ctaFootnote}>
          1.5% SPV admin fee applies · subject to your suitability limit
        </Text>
      </View>
    </View>
  );
}

function FundMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fundMeta}>
      <Text style={styles.fundMetaValue}>{value}</Text>
      <Text style={styles.fundMetaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  content: { paddingBottom: space.xl },

  hero: {
    backgroundColor: color.navy,
    paddingTop: space.xxl + space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    marginBottom: space.lg,
  },
  back: { fontFamily: font.sans, fontSize: 13, color: color.onNavyMuted, marginBottom: space.lg },
  vertical: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: color.gold,
    marginBottom: space.sm,
  },
  name: { fontFamily: font.serif, fontSize: 30, lineHeight: 37, color: color.onNavy },
  university: { fontFamily: font.sans, fontSize: 13, color: color.onNavyMuted, marginTop: space.xs },
  badgeRow: { flexDirection: 'row', marginTop: space.md },

  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    padding: space.lg,
    marginHorizontal: space.md,
    marginBottom: space.md,
  },
  raiseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  raised: {
    fontFamily: font.sans,
    fontSize: 24,
    fontWeight: '600',
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  pct: { ...type.financial, color: color.emerald, fontWeight: '600' },
  fundMetaRow: { flexDirection: 'row', marginTop: space.md },
  fundMeta: { flex: 1 },
  fundMetaValue: { ...type.financial, fontWeight: '600', fontSize: 13 },
  fundMetaLabel: {
    ...type.caption,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  lead: { ...type.caption, marginTop: space.md },
  leadName: { color: color.ink, fontWeight: '600' },

  tabRow: {
    flexDirection: 'row',
    marginTop: space.md,
    marginBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  tab: { paddingVertical: space.sm, marginRight: space.lg },
  tabActive: { borderBottomWidth: 2, borderBottomColor: color.bronze, marginBottom: -StyleSheet.hairlineWidth },
  tabText: { fontFamily: font.sans, fontSize: 12, color: color.inkMuted },
  tabTextActive: { color: color.ink, fontWeight: '600' },
  pitchText: { ...type.body, fontSize: 15, lineHeight: 24 },
  pitchDisclaimer: { ...type.caption, fontSize: 10, marginTop: space.md, color: color.inkFaint },

  trackerWrap: { marginHorizontal: space.md, marginBottom: space.md },

  ctaBar: {
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
  cta: {
    backgroundColor: color.gold,
    borderRadius: radius.sm,
    alignItems: 'center',
    paddingVertical: 14,
  },
  ctaPressed: { opacity: 0.9 },
  ctaDone: { backgroundColor: color.navy },
  ctaText: {
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: color.navy,
  },
  ctaTextDone: { color: color.gold },
  ctaFootnote: { ...type.caption, fontSize: 10, textAlign: 'center', marginTop: space.sm },
});
