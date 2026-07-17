import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SCIENCE_SIGNALS } from '../data/mock';
import { ScienceSignal, Startup } from '../types';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatDate } from '../utils/format';

/**
 * AI science-monitoring agent — watches arXiv, PubMed, USPTO, and conference
 * proceedings for results relevant to this company and classifies each
 * signal's stance toward the investment thesis. Demo shows curated examples;
 * production runs the agent server-side (Claude API relevance scoring) and
 * pushes new signals into the activity inbox.
 */
export function ScienceMonitorCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const signals = useMemo(
    () =>
      SCIENCE_SIGNALS.filter((sig) => sig.startupId === startup.id).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [startup.id],
  );

  if (signals.length === 0) return null;

  return (
    <View style={s.card}>
      <Text style={s.overline}>Science Monitor</Text>
      <Text style={s.hint}>
        The agent watches arXiv, PubMed, and USPTO for results touching this company's science —
        supportive or not, you see it.
      </Text>
      {signals.map((sig) => (
        <SignalRow key={sig.id} signal={sig} />
      ))}
    </View>
  );
}

function SignalRow({ signal }: { signal: ScienceSignal }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const stanceColor =
    signal.stance === 'supportive'
      ? palette.emerald
      : signal.stance === 'competitive'
        ? palette.danger
        : palette.inkMuted;

  return (
    <View style={s.row}>
      <View style={s.rowHeader}>
        <View style={[s.stanceChip, { borderColor: stanceColor }]}>
          <Text style={[s.stanceText, { color: stanceColor }]}>{signal.stance.toUpperCase()}</Text>
        </View>
        <Text style={s.source}>
          {signal.source} · {formatDate(signal.date)}
        </Text>
      </View>
      <Text style={s.signalTitle}>{signal.title}</Text>
      <Text style={s.summary}>{signal.summary}</Text>
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
    overline: { ...T.overline },
    hint: { ...T.caption, fontSize: 11, marginTop: space.xs, marginBottom: space.sm },
    row: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
    },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    stanceChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    stanceText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 1.1, fontWeight: '700' },
    source: { fontFamily: font.sans, fontSize: 11, color: c.inkFaint },
    signalTitle: { ...T.body, fontWeight: '600', fontSize: 14, marginBottom: 3 },
    summary: { ...T.body, fontSize: 13, lineHeight: 20, color: c.inkMuted },
  });
};
