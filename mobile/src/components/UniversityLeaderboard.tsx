import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STARTUPS, UNIVERSITIES } from '../data/mock';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { formatMoneyCompact } from '../utils/format';
import { ProgressBar } from './ProgressBar';

interface Row {
  id: string;
  shortName: string;
  country: string;
  capitalRaised: number;
  deals: number;
  /** Attested / completed milestones, 0..1. */
  attestationRate: number;
}

/**
 * University Leaderboard — ranked by capital raised through the platform,
 * with each institution's milestone attestation rate. Mirrors the
 * university_leaderboard database view.
 */
export function UniversityLeaderboard() {
  const s = useThemedStyles(makeStyles);

  const rows = useMemo<Row[]>(
    () =>
      UNIVERSITIES.map((u) => {
        const spinouts = STARTUPS.filter((st) => st.university.id === u.id);
        const milestones = spinouts.flatMap((st) => st.milestones);
        const completed = milestones.filter((m) => m.status === 'completed').length;
        const attested = milestones.filter((m) => m.attestation).length;
        return {
          id: u.id,
          shortName: u.shortName,
          country: u.country,
          capitalRaised: spinouts.reduce((sum, st) => sum + st.raisedAmount, 0),
          deals: spinouts.length,
          attestationRate: completed === 0 ? 0 : attested / completed,
        };
      })
        .sort((a, b) => b.capitalRaised - a.capitalRaised),
    [],
  );

  return (
    <View style={s.card}>
      <Text style={s.overline}>University Leaderboard</Text>
      <Text style={s.hint}>
        Ranked by capital raised on-platform · attestation rate = independently signed share of
        completed milestones
      </Text>
      {rows.map((row, i) => (
        <View key={row.id} style={[s.row, i === rows.length - 1 && s.rowLast]}>
          <Text style={s.rank}>{i + 1}</Text>
          <View style={s.body}>
            <View style={s.nameRow}>
              <Text style={s.name}>
                {row.shortName} <Text style={s.country}>· {row.country}</Text>
              </Text>
              <Text style={s.raised}>{formatMoneyCompact(row.capitalRaised)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.meta}>
                {row.deals} deal{row.deals === 1 ? '' : 's'} · {Math.round(row.attestationRate * 100)}%
                attested
              </Text>
            </View>
            <ProgressBar progress={row.attestationRate} height={2} />
          </View>
        </View>
      ))}
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
      marginHorizontal: space.md,
      marginBottom: space.md,
    },
    overline: { ...T.overline },
    hint: { ...T.caption, fontSize: 11, marginTop: space.xs, marginBottom: space.md },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
    },
    rowLast: { paddingBottom: 0 },
    rank: {
      fontFamily: font.serif,
      fontSize: 18,
      color: c.bronze,
      width: 28,
      marginTop: -2,
    },
    body: { flex: 1 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    name: { fontFamily: font.serif, fontSize: 15, color: c.ink },
    country: { fontFamily: font.sans, fontSize: 11, color: c.inkFaint },
    raised: { ...T.financial, fontSize: 14, fontWeight: '600', color: c.bronze, ...tabularNums },
    metaRow: { marginTop: 2, marginBottom: 6 },
    meta: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted },
  });
};
