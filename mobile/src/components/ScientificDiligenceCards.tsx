import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FTO_PATENTS, REPLICATION_STUDIES, TALENT_MOVES } from '../data/diligence';
import {
  ftoAssessment,
  Patent,
  replicationSummary,
  ReplicationStatus,
  ReplicationStudy,
  talentSignal,
  TalentMove,
} from '../utils/diligence';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatDate, formatMoney } from '../utils/format';
import { ProgressBar } from './ProgressBar';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

// ---------------------------------------------------------------------------
// 1) Independent replication marketplace
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<ReplicationStatus, string> = {
  available: 'OPEN TO REPLICATE',
  commissioned: 'COMMISSIONED',
  in_progress: 'IN PROGRESS',
  replicated: 'REPLICATED ✓',
  inconclusive: 'INCONCLUSIVE',
};

export function ReplicationCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [commissioned, setCommissioned] = useState<Set<string>>(new Set());
  const studies = REPLICATION_STUDIES[startup.id] ?? [];
  const summary = useMemo(() => replicationSummary(studies), [studies]);

  if (studies.length === 0) return null;

  const statusColor = (st: ReplicationStatus, id: string) => {
    if (commissioned.has(id)) return palette.bronze;
    return st === 'replicated'
      ? palette.emerald
      : st === 'available'
        ? palette.bronze
        : palette.projection;
  };

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.overline}>Independent Replication</Text>
        {summary.verifiedByReplication && (
          <View style={s.verifiedChip}>
            <Text style={s.verifiedChipText}>✓✓ VERIFIED BY REPLICATION</Text>
          </View>
        )}
      </View>
      <Text style={s.hint}>
        Beyond attestation: third-party labs reproduce a result for a fee. {summary.replicated} of{' '}
        {summary.total} reproduced. The strongest trust signal in science.
      </Text>

      {studies.map((study) => {
        const isCommissioned = commissioned.has(study.id);
        const effStatus: ReplicationStatus = isCommissioned ? 'commissioned' : study.status;
        return (
          <View key={study.id} style={s.repRow}>
            <View style={s.repHeader}>
              <Text style={s.repMilestone}>{study.milestoneTitle}</Text>
              <Text style={[s.repStatus, { color: statusColor(study.status, study.id) }]}>
                {isCommissioned ? 'COMMISSIONED ✓' : STATUS_LABEL[effStatus]}
              </Text>
            </View>
            <Text style={s.repLab}>{study.labName}</Text>
            {study.result ? <Text style={s.repResult}>{study.result}</Text> : null}
            {study.completedDate ? (
              <Text style={s.repMeta}>Completed {formatDate(study.completedDate)}</Text>
            ) : null}
            {study.status === 'available' && !isCommissioned && (
              <Pressable
                style={s.repCta}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  LayoutAnimation.configureNext(QUIET_EASE);
                  setCommissioned((prev) => new Set(prev).add(study.id));
                }}
                accessibilityRole="button"
              >
                <Text style={s.repCtaText}>Commission replication · {formatMoney(study.fee)}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      <Text style={s.footnote}>
        Replication fees are pooled from interested investors. A reproduced result is a far
        stronger signal than a single lab's claim.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2) Freedom-to-operate (patent landscape)
// ---------------------------------------------------------------------------
const RELATION_META: Record<Patent['relation'], { label: string; tone: 'good' | 'bad' | 'warn' | 'neutral' }> = {
  owned: { label: 'OWNED', tone: 'good' },
  licensed: { label: 'LICENSED', tone: 'good' },
  blocking: { label: 'BLOCKING', tone: 'bad' },
  adjacent: { label: 'ADJACENT', tone: 'warn' },
};

export function FTOCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const patents = FTO_PATENTS[startup.id] ?? [];
  const fto = useMemo(() => ftoAssessment(patents), [patents]);

  if (patents.length === 0) return null;

  const bandColor =
    fto.band === 'Clear' ? palette.emerald : fto.band === 'Moderate' ? palette.amber : palette.danger;
  const toneColor = (tone: string) =>
    tone === 'good' ? palette.emerald : tone === 'bad' ? palette.danger : tone === 'warn' ? palette.amber : palette.inkMuted;

  return (
    <View style={s.card}>
      <Text style={s.overline}>Freedom-to-Operate</Text>
      <Text style={s.hint}>
        Auto-generated patent-landscape clearance — the institutional diligence retail never gets.
      </Text>

      <View style={s.ftoHeadline}>
        <View>
          <Text style={[s.ftoScore, { color: bandColor }]}>{fto.clearanceScore}</Text>
          <Text style={s.ftoScoreLabel}>CLEARANCE · {fto.band.toUpperCase()}</Text>
        </View>
        <View style={s.ftoCounts}>
          <FtoCount label="Owned/licensed" value={fto.owned} s={s} />
          <FtoCount label="Blocking" value={fto.blocking} danger={fto.blocking > 0} s={s} />
          <FtoCount label="Adjacent" value={fto.adjacent} s={s} />
        </View>
      </View>
      <ProgressBar progress={fto.clearanceScore / 100} height={4} fillColor={bandColor} />

      <View style={s.patentList}>
        {patents.map((p) => (
          <View key={p.id} style={s.patentRow}>
            <View style={[s.relChip, { borderColor: toneColor(RELATION_META[p.relation].tone) }]}>
              <Text style={[s.relText, { color: toneColor(RELATION_META[p.relation].tone) }]}>
                {RELATION_META[p.relation].label}
              </Text>
            </View>
            <View style={s.patentBody}>
              <Text style={s.patentTitle}>{p.title}</Text>
              <Text style={s.patentMeta}>
                {p.assignee} · {p.jurisdiction}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={s.footnote}>
        Modeled landscape for context, not legal advice. Production generates this from patent-data
        providers with a design-around analysis on each blocking family.
      </Text>
    </View>
  );
}

function FtoCount({
  label,
  value,
  danger,
  s,
}: {
  label: string;
  value: number;
  danger?: boolean;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.ftoCount}>
      <Text style={[s.ftoCountValue, danger && s.ftoCountDanger]}>{value}</Text>
      <Text style={s.ftoCountLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3) Talent flow
// ---------------------------------------------------------------------------
const PEDIGREE_LABEL: Record<TalentMove['pedigree'], string> = {
  star: 'STAR HIRE',
  senior: 'SENIOR',
  notable: 'NOTABLE',
};

export function TalentFlowCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const moves = TALENT_MOVES[startup.id] ?? [];
  const signal = useMemo(() => talentSignal(moves), [moves]);

  if (moves.length === 0) return null;

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.overline}>Talent Flow</Text>
        <Text style={s.talentSignal}>Signal {signal.strength}/100</Text>
      </View>
      <Text style={s.hint}>
        Who's joining — a leading quality indicator. {signal.stars} star hire
        {signal.stars === 1 ? '' : 's'} in the last two quarters.
      </Text>
      <ProgressBar progress={signal.strength / 100} height={3} fillColor={palette.gold} />

      <View style={s.talentList}>
        {moves.map((m) => (
          <View key={m.id} style={s.talentRow}>
            <View style={[s.pedigreeChip, m.pedigree === 'star' && s.pedigreeStar]}>
              <Text style={[s.pedigreeText, m.pedigree === 'star' && s.pedigreeTextStar]}>
                {PEDIGREE_LABEL[m.pedigree]}
              </Text>
            </View>
            <View style={s.talentBody}>
              <Text style={s.talentName}>
                {m.name} · <Text style={s.talentRole}>{m.role}</Text>
              </Text>
              <Text style={s.talentMeta}>
                {m.fromOrg} · joined {formatDate(m.joinedDate)}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={s.footnote}>
        Aggregated from public professional data. Star researchers vote with their careers — a
        signal retail investors never see.
      </Text>
    </View>
  );
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    overline: { ...T.overline },
    hint: { ...T.caption, fontSize: 11, lineHeight: 16, marginTop: space.xs, marginBottom: space.md },
    footnote: { ...T.caption, fontSize: 10, lineHeight: 15, marginTop: space.md },

    // Replication
    verifiedChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.emerald,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    verifiedChipText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 0.8, fontWeight: '700', color: c.emerald },
    repRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline, paddingVertical: space.md },
    repHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    repMilestone: { ...T.body, fontWeight: '600', fontSize: 13, flex: 1, paddingRight: space.sm },
    repStatus: { fontFamily: font.sans, fontSize: 9, letterSpacing: 0.6, fontWeight: '700' },
    repLab: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted, marginTop: 2 },
    repResult: { ...T.body, fontSize: 12, lineHeight: 18, color: c.inkMuted, marginTop: 4, fontStyle: 'italic' },
    repMeta: { fontFamily: font.sans, fontSize: 10, color: c.inkFaint, marginTop: 3 },
    repCta: {
      alignSelf: 'flex-start',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 6,
      marginTop: space.sm,
    },
    repCtaText: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', color: c.bronze },

    // FTO
    ftoHeadline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.sm },
    ftoScore: { fontFamily: font.serif, fontSize: 30 },
    ftoScoreLabel: { ...T.caption, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
    ftoCounts: { flexDirection: 'row' },
    ftoCount: { alignItems: 'flex-end', marginLeft: space.md },
    ftoCountValue: { ...T.financial, fontSize: 16, fontWeight: '600', ...tabularNums },
    ftoCountDanger: { color: c.danger },
    ftoCountLabel: { fontFamily: font.sans, fontSize: 8, letterSpacing: 0.4, textTransform: 'uppercase', color: c.inkFaint, marginTop: 1 },
    patentList: { marginTop: space.md },
    patentRow: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline, paddingVertical: space.sm },
    relChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 2, marginRight: space.sm, marginTop: 1 },
    relText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 0.8, fontWeight: '700' },
    patentBody: { flex: 1 },
    patentTitle: { ...T.body, fontSize: 13, fontWeight: '600' },
    patentMeta: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1 },

    // Talent
    talentSignal: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', color: c.bronze },
    talentList: { marginTop: space.md },
    talentRow: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline, paddingVertical: space.sm },
    pedigreeChip: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 2, marginRight: space.sm, marginTop: 1 },
    pedigreeStar: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    pedigreeText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 0.8, fontWeight: '700', color: c.inkFaint },
    pedigreeTextStar: { color: c.bronze },
    talentBody: { flex: 1 },
    talentName: { ...T.body, fontSize: 13, fontWeight: '600' },
    talentRole: { fontWeight: '400', color: c.inkMuted },
    talentMeta: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1 },
  });
};
