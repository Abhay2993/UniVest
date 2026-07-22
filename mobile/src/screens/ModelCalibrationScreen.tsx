import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { RESOLVED_DEALS, RESOLVED_PREDICTIONS } from '../data/outcomes';
import { ModelName, summaryForModel } from '../utils/calibration';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

interface Props {
  onClose: () => void;
}

const MODELS: { key: ModelName; label: string; eventLabel: string }[] = [
  { key: 'slip', label: 'Milestone-slip model', eventLabel: 'milestone landed late' },
  { key: 'valuation', label: 'Valuation model', eventLabel: 'value event occurred' },
];

/**
 * "Our Models, Scored" — the transparency face of the data flywheel. Plots the
 * reliability curve (predicted vs realized) against the perfect-calibration
 * diagonal, with Brier score, ECE, and sample size. The more outcomes resolve,
 * the tighter this gets — a moat that compounds and that we can prove.
 */
export function ModelCalibrationScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [model, setModel] = useState<ModelName>('slip');
  const [size, setSize] = useState(0);

  const summary = useMemo(() => summaryForModel(RESOLVED_PREDICTIONS, model), [model]);
  const active = MODELS.find((m) => m.key === model)!;

  // Reliability plot geometry (square).
  const pad = 24;
  const plot = size - pad * 2;
  const toX = (p: number) => pad + p * plot;
  const toY = (p: number) => pad + (1 - p) * plot;
  const nonEmpty = summary.curve.filter((b) => b.count > 0);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to discovery feed">
          <Text style={s.back}>← Discovery</Text>
        </Pressable>
        <Text style={s.title}>Our Models, Scored</Text>
        <Text style={s.subtitle}>
          Every prediction is checked against what actually happened. Calibration published, not
          claimed.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.headlineCard}>
          <Text style={s.headlineText}>
            Across <Text style={s.headlineStrong}>{RESOLVED_DEALS} realized deals</Text> and{' '}
            <Text style={s.headlineStrong}>
              {RESOLVED_PREDICTIONS.length.toLocaleString('en-US')} resolved predictions
            </Text>
            , our probabilities have matched realized outcomes to within{' '}
            <Text style={s.headlineStrong}>{(summary.ece * 100).toFixed(1)} percentage points</Text>{' '}
            on average.
          </Text>
        </View>

        <View style={s.toggleRow}>
          {MODELS.map((m) => (
            <Pressable
              key={m.key}
              style={[s.toggle, model === m.key && s.toggleActive]}
              onPress={() => setModel(m.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: model === m.key }}
            >
              <Text style={[s.toggleText, model === m.key && s.toggleTextActive]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.overline}>Reliability Curve</Text>
          <Text style={s.hint}>
            Each dot: a probability band. On the diagonal = predictions match reality. Point size =
            sample count. Positive event: "{active.eventLabel}".
          </Text>
          <View style={s.plotWrap} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
            {size > 0 && (
              <Svg width={size} height={size}>
                {/* Frame */}
                <Line x1={pad} y1={pad} x2={pad} y2={size - pad} stroke={palette.hairline} strokeWidth={1} />
                <Line x1={pad} y1={size - pad} x2={size - pad} y2={size - pad} stroke={palette.hairline} strokeWidth={1} />
                {/* Perfect-calibration diagonal */}
                <Line
                  x1={toX(0)}
                  y1={toY(0)}
                  x2={toX(1)}
                  y2={toY(1)}
                  stroke={palette.inkFaint}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                {/* Model reliability line */}
                {nonEmpty.map((b, i) => {
                  const next = nonEmpty[i + 1];
                  if (!next) return null;
                  return (
                    <Line
                      key={`seg-${i}`}
                      x1={toX(b.meanPredicted)}
                      y1={toY(b.observedFreq)}
                      x2={toX(next.meanPredicted)}
                      y2={toY(next.observedFreq)}
                      stroke={palette.emerald}
                      strokeWidth={2}
                    />
                  );
                })}
                {nonEmpty.map((b, i) => (
                  <Circle
                    key={`pt-${i}`}
                    cx={toX(b.meanPredicted)}
                    cy={toY(b.observedFreq)}
                    r={Math.max(3, Math.min(9, Math.sqrt(b.count)))}
                    fill={palette.emerald}
                    opacity={0.85}
                  />
                ))}
              </Svg>
            )}
            <View style={s.axisLabels}>
              <Text style={s.axisLabel}>Predicted probability →</Text>
              <Text style={s.axisLabelY}>↑ Observed frequency</Text>
            </View>
          </View>

          <View style={s.statRow}>
            <Stat label="Brier score" value={summary.brier.toFixed(3)} sub="lower is better · 0.25 = coin flip" s={s} />
            <Stat label="Calibration error" value={`${(summary.ece * 100).toFixed(1)}%`} sub="avg predicted−observed gap" s={s} />
            <Stat label="Resolved" value={summary.sampleSize.toLocaleString('en-US')} sub="predictions scored" s={s} />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.overline}>Why this is a moat</Text>
          <Text style={s.moatText}>
            Calibration only improves as outcomes resolve on the platform. A new entrant starts with
            zero deep-tech outcome data and cannot buy this history — the models get sharper every
            quarter, and we can prove it. Production scores live predictions from the model-
            prediction ledger; this view reflects the resolved set to date.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({
  label,
  value,
  sub,
  s,
}: {
  label: string;
  value: string;
  sub: string;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.navy,
      paddingTop: space.xxl + space.sm,
      paddingHorizontal: space.lg,
      paddingBottom: space.lg,
    },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginBottom: space.md },
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 34, color: c.onNavy },
    subtitle: { fontFamily: font.sans, fontSize: 12, lineHeight: 18, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },
    headlineCard: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.gold,
      padding: space.lg,
      marginBottom: space.md,
    },
    headlineText: { fontFamily: font.serif, fontSize: 17, lineHeight: 26, color: c.ink },
    headlineStrong: { color: c.bronze },

    toggleRow: { flexDirection: 'row', marginBottom: space.md },
    toggle: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingVertical: 9,
      alignItems: 'center',
      marginRight: space.sm,
    },
    toggleActive: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    toggleText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    toggleTextActive: { color: c.bronze, fontWeight: '600' },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.md,
    },
    overline: { ...T.overline },
    hint: { ...T.caption, fontSize: 11, lineHeight: 16, marginTop: space.xs, marginBottom: space.sm },
    plotWrap: { width: '100%', aspectRatio: 1, marginTop: space.sm },
    axisLabels: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    axisLabel: { fontFamily: font.sans, fontSize: 9, color: c.inkFaint, textAlign: 'center' },
    axisLabelY: {
      fontFamily: font.sans,
      fontSize: 9,
      color: c.inkFaint,
      position: 'absolute',
      left: 0,
      bottom: 20,
    },

    statRow: {
      flexDirection: 'row',
      marginTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
    },
    stat: { flex: 1, paddingRight: space.sm },
    statValue: { ...T.financial, fontSize: 18, fontWeight: '600', ...tabularNums },
    statLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },
    statSub: { fontFamily: font.sans, fontSize: 9, color: c.inkFaint, marginTop: 2 },

    moatText: { ...T.body, fontSize: 13, lineHeight: 21, color: c.inkMuted, marginTop: space.sm },
  });
};
