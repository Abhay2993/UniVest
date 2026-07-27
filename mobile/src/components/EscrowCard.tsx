import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoneyCompact } from '../utils/format';
import {
  EscrowTranche,
  scheduleFromMilestones,
  summarizeEscrow,
  TrancheStatus,
} from '../utils/escrow';

const PILL_LABEL: Record<TrancheStatus, string> = {
  released: 'Released',
  held: 'In escrow',
  refunded: 'Refunded',
};

/**
 * Milestone Escrow — the deal's raised capital is released in tranches, each
 * gated on an independently *attested* milestone. Released capital is at work
 * with the company; held capital is protected in escrow until its milestone is
 * verified. Mirrors the backend `GET /escrow/:campaignId` schedule.
 */
export function EscrowCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const tranches = scheduleFromMilestones(startup.milestones, startup.targetAmount);
  if (tranches.length === 0) return null;
  const summary = summarizeEscrow(tranches, startup.targetAmount);
  const refundedPct = Math.max(100 - summary.releasedPct - summary.heldPct, 0);

  return (
    <View style={s.card}>
      <Text style={s.overline}>Milestone Escrow</Text>
      <Text style={s.hint}>
        Capital is released in tranches, each gated on an independently attested milestone. Funds
        stay protected in escrow until the science is verified.
      </Text>

      {/* Released (at work) vs protected (in escrow) */}
      <View style={s.bar}>
        {summary.releasedPct > 0 && <View style={[s.barReleased, { flex: summary.releasedPct }]} />}
        {refundedPct > 0 && <View style={[s.barRefunded, { flex: refundedPct }]} />}
        {summary.heldPct > 0 && <View style={[s.barHeld, { flex: summary.heldPct }]} />}
      </View>
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: palette.bronze }]} />
          <Text style={s.legendText}>
            {formatMoneyCompact(summary.releasedAmount)} released · {summary.releasedPct}%
          </Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: palette.emerald }]} />
          <Text style={s.legendText}>
            {formatMoneyCompact(summary.heldAmount)} protected · {summary.deRiskedPct}%
          </Text>
        </View>
      </View>

      <View style={s.trancheList}>
        {tranches.map((t) => (
          <TrancheRow key={t.position} t={t} />
        ))}
      </View>

      <Text style={s.footnote}>
        {summary.deRiskedPct}% of the {formatMoneyCompact(summary.escrowTotal)} envelope is still
        protected in escrow, released only as each milestone is attested.
      </Text>
    </View>
  );

  function TrancheRow({ t }: { t: EscrowTranche }) {
    const pillStyle =
      t.status === 'released' ? s.pillReleased : t.status === 'refunded' ? s.pillRefunded : s.pillHeld;
    const pillText =
      t.status === 'released'
        ? s.pillTextReleased
        : t.status === 'refunded'
          ? s.pillTextRefunded
          : s.pillTextHeld;
    return (
      <View style={s.tranche}>
        <View style={[s.trancheDot, t.status === 'released' && s.trancheDotReleased]} />
        <View style={s.trancheMain}>
          <Text style={s.trancheLabel} numberOfLines={1}>
            {t.label}
          </Text>
          <Text style={s.trancheMeta}>
            {t.releasePct}% · {formatMoneyCompact(t.amount)}
            {t.attested
              ? ' · attested ✓'
              : t.status === 'held'
                ? ' · awaiting attestation'
                : ''}
          </Text>
        </View>
        <View style={[s.pill, pillStyle]}>
          <Text style={[s.pillTextBase, pillText]}>{PILL_LABEL[t.status]}</Text>
        </View>
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
    overline: { ...T.overline },
    hint: { ...T.caption, marginTop: space.sm, marginBottom: space.md },

    bar: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      backgroundColor: c.surfaceMuted,
    },
    barReleased: { backgroundColor: c.bronze },
    barHeld: { backgroundColor: c.emerald },
    barRefunded: { backgroundColor: c.danger },

    legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm, marginBottom: space.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: space.lg },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    legendText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted, ...tabularNums },

    trancheList: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.sm,
    },
    tranche: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
    trancheDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.inkFaint,
      marginRight: space.sm,
    },
    trancheDotReleased: { backgroundColor: c.bronze, borderColor: c.bronze },
    trancheMain: { flex: 1, marginRight: space.sm },
    trancheLabel: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.ink },
    trancheMeta: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1, ...tabularNums },

    pill: {
      borderRadius: radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: StyleSheet.hairlineWidth,
    },
    pillReleased: { backgroundColor: c.surfaceGoldTint, borderColor: c.bronze },
    pillHeld: { backgroundColor: c.background, borderColor: c.hairline },
    pillRefunded: { backgroundColor: c.background, borderColor: c.danger },
    pillTextBase: { fontFamily: font.sans, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
    pillTextReleased: { color: c.bronze },
    pillTextHeld: { color: c.inkMuted },
    pillTextRefunded: { color: c.danger },

    footnote: { ...T.caption, marginTop: space.md },
  });
};
