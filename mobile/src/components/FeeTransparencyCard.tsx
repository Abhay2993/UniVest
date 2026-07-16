import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { usePortfolio } from '../state/PortfolioContext';
import { formatMoney } from '../utils/format';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const ADMIN_FEE_PCT = 1.5;
const SUCCESS_FEE_PCT = 6;
const CARRY_PCT = 15;
const EXIT_MULTIPLES = [2, 3, 5];

/**
 * Fee transparency — the full math of what UniVest earns on this investment,
 * shown before anyone asks. Uses the investor's actual commitment when one
 * exists; a representative $1,000 ticket otherwise.
 */
export function FeeTransparencyCard({ startupId }: { startupId: string }) {
  const s = useThemedStyles(makeStyles);
  const { getCommitment } = usePortfolio();
  const [expanded, setExpanded] = useState(false);

  const commitment = getCommitment(startupId);
  const amount = commitment?.amount ?? 1_000;
  const adminFee = Math.round(amount * ADMIN_FEE_PCT) / 100;

  return (
    <View style={s.card}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(QUIET_EASE);
          setExpanded(!expanded);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={s.headerRow}>
          <View>
            <Text style={s.overline}>Fee Transparency</Text>
            <Text style={s.title}>What UniVest earns on this deal</Text>
          </View>
          <Text style={s.chevron}>{expanded ? '−' : '+'}</Text>
        </View>
      </Pressable>

      {expanded && (
        <>
          <Text style={s.basis}>
            {commitment
              ? `Based on your ${formatMoney(amount)} commitment`
              : `Illustrated on a ${formatMoney(amount)} ticket`}
          </Text>

          <FeeRow
            label={`SPV admin fee — ${ADMIN_FEE_PCT}%, you pay once`}
            value={formatMoney(adminFee)}
          />
          <FeeRow
            label={`Success fee — ${SUCCESS_FEE_PCT}% of the raise, paid by the startup at close`}
            value="$0 to you"
          />
          <FeeRow
            label={`Carry — ${CARRY_PCT}% of your profit, only at exit`}
            value="see below"
          />

          <Text style={s.tableTitle}>IF THE COMPANY EXITS AT…</Text>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.colMultiple]}>Exit</Text>
            <Text style={[s.th, s.colNum]}>Gross</Text>
            <Text style={[s.th, s.colNum]}>Carry</Text>
            <Text style={[s.th, s.colNum]}>Net to you</Text>
          </View>
          {EXIT_MULTIPLES.map((m) => {
            const gross = amount * m;
            const profit = amount * (m - 1);
            const carry = Math.round(profit * CARRY_PCT) / 100;
            const net = gross - carry;
            return (
              <View key={m} style={s.tr}>
                <Text style={[s.td, s.colMultiple]}>{m}x</Text>
                <Text style={[s.td, s.colNum]}>{formatMoney(gross)}</Text>
                <Text style={[s.td, s.colNum, s.tdMuted]}>− {formatMoney(carry)}</Text>
                <Text style={[s.td, s.colNum, s.tdStrong]}>{formatMoney(net)}</Text>
              </View>
            );
          })}
          <Text style={s.footnote}>
            Carry never touches your returned capital — a 1x exit pays zero carry. If the company
            fails, UniVest earns nothing beyond the admin fee.
          </Text>
        </>
      )}
    </View>
  );

  function FeeRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={s.feeRow}>
        <Text style={s.feeLabel}>{label}</Text>
        <Text style={s.feeValue}>{value}</Text>
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    overline: { ...T.overline },
    title: { fontFamily: font.serif, fontSize: 16, color: c.ink, marginTop: 2 },
    chevron: { fontFamily: font.serif, fontSize: 22, color: c.bronze },
    basis: { ...T.caption, fontSize: 11, marginTop: space.sm, marginBottom: space.sm },

    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.sm,
    },
    feeLabel: { ...T.body, fontSize: 12, lineHeight: 18, flex: 1, paddingRight: space.md, color: c.inkMuted },
    feeValue: { ...T.financial, fontSize: 13, fontWeight: '600' },

    tableTitle: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      color: c.inkMuted,
      marginTop: space.md,
      marginBottom: space.sm,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairline,
      paddingBottom: 4,
    },
    th: { fontFamily: font.sans, fontSize: 10, letterSpacing: 0.4, color: c.inkFaint, textTransform: 'uppercase' },
    tr: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairline,
      paddingVertical: 7,
    },
    td: { ...T.financial, fontSize: 12 },
    tdMuted: { color: c.inkMuted },
    tdStrong: { fontWeight: '700', color: c.emerald },
    colMultiple: { width: 44 },
    colNum: { flex: 1, textAlign: 'right' as const, ...tabularNums },
    footnote: { ...T.caption, fontSize: 10, lineHeight: 15, marginTop: space.md },
  });
};
