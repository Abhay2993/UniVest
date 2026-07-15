import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { font, Palette, space, tabularNums } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export interface ChartPoint {
  /** ISO date. */
  date: string;
  value: number;
}

interface Props {
  points: ChartPoint[];
  height?: number;
  formatValue: (v: number) => string;
  /** Series color; defaults to the palette's validated emerald. */
  color?: string;
}

const PAD_TOP = 10;
const PAD_BOTTOM = 18;
const PAD_X = 4;

/**
 * Thin single-series line chart per the dataviz spec: 2px line, recessive
 * hairline grid, direct label on the latest value (ink, never series color),
 * tap-to-inspect any point. Single series → the surrounding title names it,
 * no legend.
 */
export function LineChart({ points, height = 140, formatValue, color }: Props) {
  const { palette } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const stroke = color ?? palette.emerald;

  const geometry = useMemo(() => {
    if (points.length < 2 || width === 0) return null;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const innerH = height - PAD_TOP - PAD_BOTTOM;
    const innerW = width - PAD_X * 2;
    const xy = points.map((p, i) => ({
      x: PAD_X + (i / (points.length - 1)) * innerW,
      y: PAD_TOP + (1 - (p.value - min) / range) * innerH,
    }));
    return { xy, min, max };
  }, [points, width, height]);

  const onTouch = (e: GestureResponderEvent) => {
    if (!geometry) return;
    const x = e.nativeEvent.locationX;
    let nearest = 0;
    let best = Infinity;
    geometry.xy.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setSelected((cur) => (cur === nearest ? null : nearest));
  };

  const last = points[points.length - 1];
  const inspecting = selected !== null ? points[selected] : null;

  return (
    <View>
      <Pressable onPress={onTouch} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {geometry && (
          <Svg width={width} height={height}>
            {/* Recessive grid: three hairlines */}
            {[0.0, 0.5, 1.0].map((f) => {
              const y = PAD_TOP + f * (height - PAD_TOP - PAD_BOTTOM);
              return (
                <Line
                  key={f}
                  x1={PAD_X}
                  x2={width - PAD_X}
                  y1={y}
                  y2={y}
                  stroke={palette.hairline}
                  strokeWidth={StyleSheet.hairlineWidth * 2}
                />
              );
            })}
            <Polyline
              points={geometry.xy.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Latest-value marker */}
            <Circle
              cx={geometry.xy[geometry.xy.length - 1].x}
              cy={geometry.xy[geometry.xy.length - 1].y}
              r={3.5}
              fill={stroke}
            />
            {selected !== null && (
              <Circle
                cx={geometry.xy[selected].x}
                cy={geometry.xy[selected].y}
                r={5}
                fill="none"
                stroke={stroke}
                strokeWidth={1.5}
              />
            )}
          </Svg>
        )}
      </Pressable>

      <View style={s.footer}>
        <Text style={s.axisLabel}>{shortDate(points[0].date)}</Text>
        <Text style={s.inspect}>
          {inspecting
            ? `${shortDate(inspecting.date)} · ${formatValue(inspecting.value)}`
            : `Latest · ${formatValue(last.value)}`}
        </Text>
        <Text style={s.axisLabel}>{shortDate(last.date)}</Text>
      </View>
    </View>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: space.xs,
    },
    axisLabel: { fontFamily: font.sans, fontSize: 10, color: c.inkFaint },
    inspect: {
      fontFamily: font.sans,
      fontSize: 11,
      fontWeight: '600',
      color: c.ink,
      ...tabularNums,
    },
  });
