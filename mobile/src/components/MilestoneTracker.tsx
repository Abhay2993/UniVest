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
import { Milestone } from '../types';
import { color, font, radius, space, type } from '../theme/tokens';
import { formatDate } from '../utils/format';
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
}

/**
 * The Visual Milestone Tracker ("Lab Progress Bar").
 * Translates a dense scientific timeline into a single completion metric
 * plus an expandable, tappable milestone ledger. Completed milestones with
 * founder micro-video updates surface a review chip.
 */
export function MilestoneTracker({ milestones }: Props) {
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
    <View style={styles.container}>
      <Text style={type.overline}>Lab Progress</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryTitle}>Research → Revenue</Text>
        <Text style={styles.summaryPct}>{Math.round(completion * 100)}%</Text>
      </View>
      <ProgressBar progress={completion} height={4} fillColor={color.gold} trackColor={color.surfaceMuted} />
      <Text style={styles.summaryHint}>
        {milestones.filter((m) => m.status === 'completed').length} of {milestones.length} milestones
        independently verified
      </Text>

      <View style={styles.timeline}>
        {milestones.map((m, i) => (
          <MilestoneRow
            key={m.id}
            milestone={m}
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
  isLast,
  expanded,
  onPress,
}: {
  milestone: Milestone;
  isLast: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  const done = milestone.status === 'completed';
  const active = milestone.status === 'in_progress';

  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`Milestone: ${milestone.title}, ${milestone.status.replace('_', ' ')}`}
    >
      <View style={styles.rail}>
        <Node status={milestone.status} />
        {!isLast && <View style={[styles.connector, done && styles.connectorDone]} />}
      </View>

      <View style={[styles.rowBody, !isLast && styles.rowBodySpacing]}>
        <View style={styles.rowHeader}>
          <Text style={[styles.rowTitle, !done && !active && styles.rowTitleMuted]}>
            {milestone.title}
          </Text>
          <Text style={styles.rowDate}>{formatDate(milestone.date)}</Text>
        </View>
        <Text style={styles.rowStatus}>
          {done ? 'Completed' : active ? 'In progress' : 'Projected'}
        </Text>

        {expanded && (
          <View style={styles.detail}>
            <Text style={styles.detailText}>{milestone.description}</Text>
            {done && milestone.hasVideoUpdate && (
              <View style={styles.videoChip}>
                <Text style={styles.videoChipGlyph}>▶</Text>
                <Text style={styles.videoChipText}>FOUNDER LAB UPDATE · 90s</Text>
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
      <View style={[styles.node, styles.nodeDone]}>
        <Text style={styles.nodeTick}>✓</Text>
      </View>
    );
  }
  if (status === 'in_progress') {
    return <Animated.View style={[styles.node, styles.nodeActive, { opacity: pulse }]} />;
  }
  return <View style={[styles.node, styles.nodeUpcoming]} />;
}

const NODE = 18;

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    padding: space.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  summaryTitle: { ...type.heading },
  summaryPct: { fontFamily: font.serif, fontSize: 24, color: color.bronze },
  summaryHint: { ...type.caption, marginTop: space.sm, marginBottom: space.lg },

  timeline: { marginTop: space.xs },
  row: { flexDirection: 'row' },
  rail: { width: NODE, alignItems: 'center' },
  connector: {
    flex: 1,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: color.hairline,
    marginVertical: 3,
  },
  connectorDone: { backgroundColor: color.emerald },

  node: {
    width: NODE,
    height: NODE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: { backgroundColor: color.emerald },
  nodeTick: { color: color.surface, fontSize: 10, fontWeight: '700' },
  nodeActive: { backgroundColor: color.gold },
  nodeUpcoming: {
    borderWidth: 1,
    borderColor: color.inkFaint,
    backgroundColor: color.surface,
  },

  rowBody: { flex: 1, marginLeft: space.md },
  rowBodySpacing: { paddingBottom: space.lg },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowTitle: { ...type.body, fontWeight: '600', flex: 1, paddingRight: space.sm },
  rowTitleMuted: { color: color.inkFaint, fontWeight: '400' },
  rowDate: { ...type.financial, fontSize: 12, color: color.inkMuted },
  rowStatus: { ...type.caption, fontSize: 11, marginTop: 1 },

  detail: {
    marginTop: space.sm,
    paddingLeft: space.sm,
    borderLeftWidth: 2,
    borderLeftColor: color.surfaceMuted,
  },
  detailText: { ...type.body, color: color.inkMuted, fontSize: 13, lineHeight: 19 },
  videoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.bronze,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  videoChipGlyph: { color: color.bronze, fontSize: 8, marginRight: 6 },
  videoChipText: {
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.1,
    color: color.bronze,
    fontWeight: '600',
  },
});
