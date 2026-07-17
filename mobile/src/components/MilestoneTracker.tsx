import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Milestone, Startup } from '../types';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatDate } from '../utils/format';
import { milestoneSlipProbability } from '../utils/quant';
import { AttestationStamp } from './AttestationStamp';
import { ProgressBar } from './ProgressBar';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QUIET_EASE = LayoutAnimation.create(
  260,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

interface Props {
  milestones: Milestone[];
  /** When provided, forward milestones show their predicted slip risk. */
  startup?: Startup;
}

/**
 * The Visual Milestone Tracker ("Lab Progress Bar").
 * Translates a dense scientific timeline into a single completion metric
 * plus an expandable, tappable milestone ledger. Completed milestones with
 * founder micro-video updates surface a review chip.
 */
export function MilestoneTracker({ milestones, startup }: Props) {
  const { palette } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [expandedId, setExpandedId] = useState<string | null>(
    milestones.find((m) => m.status === 'in_progress')?.id ?? null,
  );

  const completion = useMemo(() => {
    if (milestones.length === 0) return 0;
    const score = milestones.reduce(
      (acc, m) => acc + (m.status === 'completed' ? 1 : m.status === 'in_progress' ? 0.5 : 0),
      0,
    );
    return score / milestones.length;
  }, [milestones]);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(QUIET_EASE);
    setExpandedId((cur) => (cur === id ? null : id));
  };

  return (
    <View style={s.container}>
      <Text style={s.overline}>Lab Progress</Text>
      <View style={s.summaryRow}>
        <Text style={s.summaryTitle}>Research → Revenue</Text>
        <Text style={s.summaryPct}>{Math.round(completion * 100)}%</Text>
      </View>
      <ProgressBar progress={completion} height={4} fillColor={palette.gold} />
      <Text style={s.summaryHint}>
        {milestones.filter((m) => m.attestation).length} of {milestones.length} milestones
        independently attested — cryptographically signed by the university TTO or a third-party
        reviewer
      </Text>

      <View style={s.timeline}>
        {milestones.map((m, i) => (
          <MilestoneRow
            key={m.id}
            milestone={m}
            slipRisk={
              startup && m.status !== 'completed' ? milestoneSlipProbability(startup, m) : null
            }
            isLast={i === milestones.length - 1}
            expanded={expandedId === m.id}
            onPress={() => toggle(m.id)}
          />
        ))}
      </View>
    </View>
  );
}

function MilestoneRow({
  milestone,
  slipRisk,
  isLast,
  expanded,
  onPress,
}: {
  milestone: Milestone;
  slipRisk: number | null;
  isLast: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  const s = useThemedStyles(makeStyles);
  const done = milestone.status === 'completed';
  const active = milestone.status === 'in_progress';

  return (
    <Pressable
      onPress={onPress}
      style={s.row}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`Milestone: ${milestone.title}, ${milestone.status.replace('_', ' ')}`}
    >
      <View style={s.rail}>
        <Node status={milestone.status} />
        {!isLast && <View style={[s.connector, done && s.connectorDone]} />}
      </View>

      <View style={[s.rowBody, !isLast && s.rowBodySpacing]}>
        <View style={s.rowHeader}>
          <Text style={[s.rowTitle, !done && !active && s.rowTitleMuted]}>
            {milestone.title}
            {milestone.attestation ? <Text style={s.attestMark}> ✦</Text> : null}
          </Text>
          <Text style={s.rowDate}>{formatDate(milestone.date)}</Text>
        </View>
        <Text style={s.rowStatus}>
          {done ? (milestone.attestation ? 'Completed · Attested' : 'Completed') : active ? 'In progress' : 'Projected'}
        </Text>

        {expanded && (
          <View style={s.detail}>
            <Text style={s.detailText}>{milestone.description}</Text>
            {slipRisk !== null && (
              <Text style={[s.slipText, slipRisk >= 0.5 && s.slipTextHigh]}>
                Slip risk {Math.round(slipRisk * 100)}% — modeled from sector base rate, sequence
                depth, and this team's execution pace
              </Text>
            )}
            {milestone.attestation && <AttestationStamp attestation={milestone.attestation} />}
            {done && milestone.hasVideoUpdate && (
              <View style={s.videoChip}>
                <Text style={s.videoChipGlyph}>▶</Text>
                <Text style={s.videoChipText}>FOUNDER LAB UPDATE · 90s</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Timeline node: solid emerald square (done), pulsing gold (active), hollow (projected). */
function Node({ status }: { status: Milestone['status'] }) {
  const s = useThemedStyles(makeStyles);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'in_progress') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  if (status === 'completed') {
    return (
      <View style={[s.node, s.nodeDone]}>
        <Text style={s.nodeTick}>✓</Text>
      </View>
    );
  }
  if (status === 'in_progress') {
    return <Animated.View style={[s.node, s.nodeActive, { opacity: pulse }]} />;
  }
  return <View style={[s.node, s.nodeUpcoming]} />;
}

const NODE = 18;

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
    },
    overline: { ...T.overline },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: space.sm,
      marginBottom: space.sm,
    },
    summaryTitle: { ...T.heading },
    summaryPct: { fontFamily: font.serif, fontSize: 24, color: c.bronze },
    summaryHint: { ...T.caption, marginTop: space.sm, marginBottom: space.lg },

    timeline: { marginTop: space.xs },
    row: { flexDirection: 'row' },
    rail: { width: NODE, alignItems: 'center' },
    connector: {
      flex: 1,
      width: StyleSheet.hairlineWidth * 2,
      backgroundColor: c.hairline,
      marginVertical: 3,
    },
    connectorDone: { backgroundColor: c.emerald },

    node: {
      width: NODE,
      height: NODE,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeDone: { backgroundColor: c.emerald },
    nodeTick: { color: c.surface, fontSize: 10, fontWeight: '700' },
    nodeActive: { backgroundColor: c.gold },
    nodeUpcoming: {
      borderWidth: 1,
      borderColor: c.inkFaint,
      backgroundColor: c.surface,
    },

    rowBody: { flex: 1, marginLeft: space.md },
    rowBodySpacing: { paddingBottom: space.lg },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    rowTitle: { ...T.body, fontWeight: '600', flex: 1, paddingRight: space.sm },
    rowTitleMuted: { color: c.inkFaint, fontWeight: '400' },
    attestMark: { color: c.gold, fontSize: 12 },
    rowDate: { ...T.financial, fontSize: 12, color: c.inkMuted },
    rowStatus: { ...T.caption, fontSize: 11, marginTop: 1 },

    detail: {
      marginTop: space.sm,
      paddingLeft: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: c.surfaceMuted,
    },
    detailText: { ...T.body, color: c.inkMuted, fontSize: 13, lineHeight: 19 },
    slipText: {
      fontFamily: font.sans,
      fontSize: 11,
      lineHeight: 16,
      color: c.inkFaint,
      marginTop: space.sm,
    },
    slipTextHigh: { color: c.amber, fontWeight: '600' },
    videoChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: space.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 4,
    },
    videoChipGlyph: { color: c.bronze, fontSize: 8, marginRight: 6 },
    videoChipText: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.1,
      color: c.bronze,
      fontWeight: '600',
    },
  });
};
