import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { valuationForStartup } from '../utils/quant';

const BIN_WIDTH = 0.5; // in multiples of invested capital
const CAP = 5; // last bin is "5x+"
const BINS = CAP / BIN_WIDTH + 1;

/**
 * Probabilistic milestone-tree valuation — the honest way to value a science
 * bet. A Monte Carlo over the remaining milestones produces a distribution of
 * outcomes (as a multiple on invested capital), not a false-precision point
 * estimate. Most mass sits near zero (total loss), with a long upside tail.
 */
export function ValuationDistribution({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [width, setWidth] = React.useState(0);

  // Seeded so the figure is stable across re-renders (deterministic per deal).
  // slipAware: forward probabilities are dampened by the milestone-slip model.
  const stats = useMemo(
    () => valuationForStartup(startup, { iterations: 5000, slipAware: true }, hashSeed(startup.id)),
    [startup],
  );

  const bins = useMemo(() => {
    const counts = new Array(BINS).fill(0);
    for (const v of stats.samples) {
      const idx = Math.min(Math.floor(v / BIN_WIDTH), BINS - 1);
      counts[idx] += 1;
    }
    return counts;
  }, [stats]);

  const height = 96;
  const maxCount = Math.max(...bins, 1);
  const barGap = 2;
  const barW = width > 0 ? (width - barGap * (BINS - 1)) / BINS : 0;
  const p50X = width > 0 ? Math.min(stats.p50 / (CAP + BIN_WIDTH), 1) * width : 0;

  return (
    <View style={s.card}>
      <Text style={s.overline}>Probabilistic Valuation</Text>
      <Text style={s.hint}>
        Monte Carlo over the remaining milestones · {stats.samples.length.toLocaleString('en-US')}{' '}
        simulations · outcome as a multiple on invested capital
      </Text>

      <View style={s.headline}>
        <View>
          <Text style={s.expectedValue}>{stats.expected.toFixed(2)}×</Text>
          <Text style={s.expectedLabel}>Expected (mean)</Text>
        </View>
        <View style={s.lossBlock}>
          <Text style={s.lossValue}>{Math.round(stats.pTotalLoss * 100)}%</Text>
          <Text style={s.expectedLabel}>Probability of total loss</Text>
        </View>
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ marginTop: space.md }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {bins.map((count, i) => {
              const h = (count / maxCount) * (height - 4);
              return (
                <Rect
                  key={i}
                  x={i * (barW + barGap)}
                  y={height - h}
                  width={barW}
                  height={h}
                  rx={1.5}
                  fill={palette.emerald}
                  opacity={0.9}
                />
              );
            })}
            {/* Median marker */}
            <Line x1={p50X} x2={p50X} y1={0} y2={height} stroke={palette.gold} strokeWidth={1.5} />
          </Svg>
        )}
        <View style={s.axisRow}>
          <Text style={s.axisLabel}>0×</Text>
          <Text style={s.axisLabel}>total loss ↔ upside tail</Text>
          <Text style={s.axisLabel}>{CAP}×+</Text>
        </View>
      </View>

      <View style={s.bandRow}>
        <Band label="P10 (downside)" value={`${stats.p10.toFixed(2)}×`} s={s} />
        <Band label="P50 (median)" value={`${stats.p50.toFixed(2)}×`} gold s={s} />
        <Band label="P90 (upside)" value={`${stats.p90.toFixed(2)}×`} s={s} />
      </View>

      <Text style={s.footnote}>
        Modeled, not guaranteed. Each unhit milestone carries a completion probability (raised by
        independent attestation, dampened by its predicted slip risk) and a valuation step-up on
        success; a miss returns residual value. Not investment advice.
      </Text>
    </View>
  );
}

function Band({
  label,
  value,
  gold,
  s,
}: {
  label: string;
  value: string;
  gold?: boolean;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.band}>
      <Text style={[s.bandValue, gold && s.bandValueGold]}>{value}</Text>
      <Text style={s.bandLabel}>{label}</Text>
    </View>
  );
}

// Small deterministic hash so each deal's figure is stable but distinct.
function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
    hint: { ...T.caption, fontSize: 11, marginTop: space.xs, marginBottom: space.md },

    headline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    expectedValue: { fontFamily: font.serif, fontSize: 30, color: c.emerald },
    expectedLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 },
    lossBlock: { alignItems: 'flex-end' },
    lossValue: { fontFamily: font.serif, fontSize: 26, color: c.amber },

    axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
    axisLabel: { fontFamily: font.sans, fontSize: 9, color: c.inkFaint },

    bandRow: {
      flexDirection: 'row',
      marginTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
    },
    band: { flex: 1 },
    bandValue: { ...T.financial, fontSize: 15, fontWeight: '600' },
    bandValueGold: { color: c.bronze },
    bandLabel: { ...T.caption, fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },

    footnote: { ...T.caption, fontSize: 10, lineHeight: 15, marginTop: space.md },
  });
};
