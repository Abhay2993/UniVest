import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { currentTRL, scienceRiskScore, trlVelocity } from '../utils/quant';

const TRL_LABELS: Record<number, string> = {
  1: 'Basic principles',
  2: 'Concept formulated',
  3: 'Proof of concept',
  4: 'Validated in lab',
  5: 'Validated in environment',
  6: 'Prototype demonstrated',
  7: 'Operational prototype',
  8: 'System qualified',
  9: 'Proven in operation',
};

/**
 * Technology Readiness Level (NASA TRL 1–9) + a Science-Risk score — domain
 * quant a generic fintech app cannot compute. Pairs "proven progress" (TRL,
 * attestation) against "remaining science risk" (sector, TRL gap).
 */
export function ScienceRiskCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();

  const risk = useMemo(() => scienceRiskScore(startup), [startup]);
  const trl = risk.trl;
  const velocity = useMemo(() => trlVelocity(startup), [startup]);

  const bandColor =
    risk.band === 'Severe'
      ? palette.danger
      : risk.band === 'High'
        ? palette.amber
        : risk.band === 'Elevated'
          ? palette.bronze
          : palette.emerald;

  return (
    <View style={s.card}>
      <Text style={s.overline}>Science Risk & Readiness</Text>

      <View style={s.topRow}>
        <View style={s.trlBlock}>
          <Text style={s.trlValue}>
            TRL {trl}
            <Text style={s.trlOf}> / 9</Text>
          </Text>
          <Text style={s.trlLabel}>{TRL_LABELS[trl]}</Text>
        </View>
        <View style={s.riskBlock}>
          <Text style={[s.riskScore, { color: bandColor }]}>{risk.score}</Text>
          <Text style={[s.riskBand, { color: bandColor }]}>{risk.band.toUpperCase()} RISK</Text>
        </View>
      </View>

      {/* TRL ladder */}
      <View style={s.ladder}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => (
          <View
            key={level}
            style={[
              s.rung,
              level <= trl && s.rungFilled,
              level === trl && { backgroundColor: palette.gold },
            ]}
          />
        ))}
      </View>

      <View style={s.metaRow}>
        <Meta label="TRL velocity" value={`${velocity.toFixed(1)}/yr`} s={s} />
        <Meta label="Attested progress" value={`${Math.round(risk.attestationRate * 100)}%`} s={s} />
        <Meta label="Sector prior" value={`${Math.round(risk.sectorRisk * 100)}`} s={s} />
      </View>

      <Text style={s.footnote}>
        Higher score = more remaining science risk. Independent attestation lowers it; a large TRL
        gap in a hard sector raises it. Framework: NASA Technology Readiness Levels.
      </Text>
    </View>
  );
}

function Meta({ label, value, s }: { label: string; value: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.meta}>
      <Text style={s.metaValue}>{value}</Text>
      <Text style={s.metaLabel}>{label}</Text>
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
    overline: { ...T.overline, marginBottom: space.md },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    trlBlock: { flex: 1 },
    trlValue: { fontFamily: font.serif, fontSize: 24, color: c.ink },
    trlOf: { fontFamily: font.serif, fontSize: 16, color: c.inkFaint },
    trlLabel: { ...T.caption, fontSize: 11, marginTop: 1 },
    riskBlock: { alignItems: 'flex-end' },
    riskScore: { fontFamily: font.serif, fontSize: 28 },
    riskBand: { fontFamily: font.sans, fontSize: 9, letterSpacing: 1.2, fontWeight: '700', marginTop: 1 },

    ladder: { flexDirection: 'row', marginTop: space.md, marginBottom: space.md },
    rung: {
      flex: 1,
      height: 6,
      borderRadius: 1.5,
      backgroundColor: c.surfaceMuted,
      marginRight: 3,
    },
    rungFilled: { backgroundColor: c.emerald },

    metaRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
    },
    meta: { flex: 1 },
    metaValue: { ...T.financial, fontSize: 14, fontWeight: '600', ...tabularNums },
    metaLabel: { ...T.caption, fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },

    footnote: { ...T.caption, fontSize: 10, lineHeight: 15, marginTop: space.md },
  });
};
