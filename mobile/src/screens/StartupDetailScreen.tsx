import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoneyCompact, formatPct, formatMoney } from '../utils/format';
import { BookmarkButton } from '../components/BookmarkButton';
import { CopilotCard } from '../components/CopilotCard';
import { FeeTransparencyCard } from '../components/FeeTransparencyCard';
import { InvestPanel } from '../components/InvestPanel';
import { MilestoneTracker } from '../components/MilestoneTracker';
import { ProgressBar } from '../components/ProgressBar';
import { QASection } from '../components/QASection';
import { ScienceRiskCard } from '../components/ScienceRiskCard';
import { ValuationDistribution } from '../components/ValuationDistribution';
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
 * Startup detail — AI Layman Pitch Deck (Module 2), the attested Visual
 * Milestone Tracker, and the Community Diligence Q&A, closed by the
 * commitment flow (amount → concentration nudge → cooling-off countdown).
 */
export function StartupDetailScreen({ startup, onBack }: Props) {
  const { palette } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<PitchTab>('plain');
  const progress = startup.raisedAmount / startup.targetAmount;

  const pitchText =
    tab === 'plain'
      ? startup.pitch.plainEnglish
      : tab === 'commercial'
        ? startup.pitch.commercialization
        : startup.pitch.labProof;

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

        {/* Diligence Copilot — grounded Q&A over the data room */}
        <View style={s.trackerWrap}>
          <CopilotCard startup={startup} />
        </View>

        {/* Probabilistic milestone-tree valuation */}
        <View style={s.trackerWrap}>
          <ValuationDistribution startup={startup} />
        </View>

        {/* Science risk & technology readiness */}
        <View style={s.trackerWrap}>
          <ScienceRiskCard startup={startup} />
        </View>

        {/* Visual Milestone Tracker */}
        <View style={s.trackerWrap}>
          <MilestoneTracker milestones={startup.milestones} />
        </View>

        {/* Community Diligence Q&A */}
        <View style={s.trackerWrap}>
          <QASection startupName={startup.name} questions={startup.questions} />
        </View>

        {/* Fee transparency — every stream, with the exit math */}
        <View style={s.trackerWrap}>
          <FeeTransparencyCard startupId={startup.id} />
        </View>
      </ScrollView>

      {/* Commitment flow — gold CTA, concentration nudge, cooling-off countdown */}
      <InvestPanel startup={startup} />
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
  });
};
