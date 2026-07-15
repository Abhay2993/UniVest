import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoney, formatMoneyCompact, formatPct } from '../utils/format';
import { BookmarkButton } from '../components/BookmarkButton';
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
  const { palette } = useTheme();
  const s = useThemedStyles(makeStyles);
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
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroTopRow}>
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to discovery feed">
              <Text style={s.back}>← Discovery</Text>
            </Pressable>
            <BookmarkButton startup={startup} size={20} inactiveColor={palette.onNavyMuted} />
          </View>

          <Text style={s.vertical}>{startup.vertical}</Text>
          <Text style={s.name}>{startup.name}</Text>
          <Text style={s.university}>
            {startup.university.name} · {startup.university.country}
          </Text>
          {startup.verified && (
            <View style={s.badgeRow}>
              <VerifiedBadge />
            </View>
          )}
        </View>

        {/* Funding summary */}
        <View style={s.card}>
          <Text style={s.overline}>Offering</Text>
          <View style={s.raiseRow}>
            <Text style={s.raised}>{formatMoney(startup.raisedAmount)}</Text>
            <Text style={s.pct}>{formatPct(progress)} funded</Text>
          </View>
          <ProgressBar progress={progress} height={4} />
          <View style={s.fundMetaRow}>
            <FundMeta label="Target" value={formatMoneyCompact(startup.targetAmount)} />
            <FundMeta label="Investors" value={startup.investorCount.toLocaleString('en-US')} />
            <FundMeta label="Min. Ticket" value={formatMoneyCompact(startup.minInvestment)} />
            <FundMeta label="Closes In" value={`${startup.daysLeft} days`} />
          </View>
          <Text style={s.lead}>
            Anchored by <Text style={s.leadName}>{startup.leadInvestor}</Text> · SPV structure —
            one line on the cap table
          </Text>
        </View>

        {/* AI Layman Pitch Deck */}
        <View style={s.card}>
          <Text style={s.overline}>AI Research Briefing</Text>
          <View style={s.tabRow}>
            {PITCH_TABS.map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[s.tab, tab === key && s.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
              >
                <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.pitchText}>{pitchText}</Text>
          <Text style={s.pitchDisclaimer}>
            Generated from the founding team's peer-reviewed publications. Not investment advice.
          </Text>
        </View>

        {/* Visual Milestone Tracker */}
        <View style={s.trackerWrap}>
          <MilestoneTracker milestones={startup.milestones} />
        </View>
      </ScrollView>

      {/* Invest CTA — champagne gold, reserved for the primary action */}
      <View style={s.ctaBar}>
        <Pressable
          onPress={confirmInvestment}
          disabled={committed}
          style={({ pressed }) => [s.cta, pressed && s.ctaPressed, committed && s.ctaDone]}
          accessibilityRole="button"
          accessibilityLabel={`Invest in ${startup.name}, minimum ${formatMoney(startup.minInvestment)}`}
        >
          <Text style={[s.ctaText, committed && s.ctaTextDone]}>
            {committed
              ? '✓ Commitment Reserved'
              : `Invest — from ${formatMoney(startup.minInvestment)}`}
          </Text>
        </Pressable>
        <Text style={s.ctaFootnote}>
          1.5% SPV admin fee applies · subject to your suitability limit
        </Text>
      </View>
    </View>
  );

  function FundMeta({ label, value }: { label: string; value: string }) {
    return (
      <View style={s.fundMeta}>
        <Text style={s.fundMetaValue}>{value}</Text>
        <Text style={s.fundMetaLabel}>{label}</Text>
      </View>
    );
  }
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: space.xl },

    hero: {
      backgroundColor: c.navy,
      paddingTop: space.xxl + space.sm,
      paddingHorizontal: space.lg,
      paddingBottom: space.xl,
      marginBottom: space.lg,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space.lg,
    },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted },
    vertical: {
      fontFamily: font.sans,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: c.gold,
      marginBottom: space.sm,
    },
    name: { fontFamily: font.serif, fontSize: 30, lineHeight: 40, color: c.onNavy },
    university: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginTop: space.xs },
    badgeRow: { flexDirection: 'row', marginTop: space.md },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginHorizontal: space.md,
      marginBottom: space.md,
    },
    overline: { ...T.overline },
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
      color: c.ink,
      ...tabularNums,
    },
    pct: { ...T.financial, color: c.emerald, fontWeight: '600' },
    fundMetaRow: { flexDirection: 'row', marginTop: space.md },
    fundMeta: { flex: 1 },
    fundMetaValue: { ...T.financial, fontWeight: '600', fontSize: 13 },
    fundMetaLabel: {
      ...T.caption,
      fontSize: 9,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: 1,
    },
    lead: { ...T.caption, marginTop: space.md },
    leadName: { color: c.ink, fontWeight: '600' },

    tabRow: {
      flexDirection: 'row',
      marginTop: space.md,
      marginBottom: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairline,
    },
    tab: { paddingVertical: space.sm, marginRight: space.lg },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: c.bronze,
      marginBottom: -StyleSheet.hairlineWidth,
    },
    tabText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    tabTextActive: { color: c.ink, fontWeight: '600' },
    pitchText: { ...T.body, fontSize: 15, lineHeight: 24 },
    pitchDisclaimer: { ...T.caption, fontSize: 10, marginTop: space.md, color: c.inkFaint },

    trackerWrap: { marginHorizontal: space.md, marginBottom: space.md },

    ctaBar: {
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xl,
    },
    cta: {
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 14,
    },
    ctaPressed: { opacity: 0.9 },
    ctaDone: { backgroundColor: c.navy },
    ctaText: {
      fontFamily: font.sans,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: '#0A192F',
    },
    ctaTextDone: { color: c.gold },
    ctaFootnote: { ...T.caption, fontSize: 10, textAlign: 'center', marginTop: space.sm },
  });
};
