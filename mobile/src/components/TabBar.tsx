import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, Palette, space } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';

export type Tab = 'discover' | 'portfolio' | 'markets' | 'tools';

const TABS: { key: Tab; label: string }[] = [
  { key: 'discover', label: 'DISCOVER' },
  { key: 'portfolio', label: 'PORTFOLIO' },
  { key: 'markets', label: 'MARKETS' },
  { key: 'tools', label: 'TOOLS' },
];

/** Text-only bottom tab bar — letterspaced small caps, gold active indicator. */
export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.bar}>
      {TABS.map(({ key, label }) => (
        <Pressable
          key={key}
          style={s.item}
          onPress={() => onChange(key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === key }}
        >
          <View style={[s.indicator, active === key && s.indicatorActive]} />
          <Text style={[s.label, active === key && s.labelActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingBottom: space.lg,
    },
    item: { flex: 1, alignItems: 'center' },
    indicator: {
      height: 2,
      alignSelf: 'stretch',
      backgroundColor: 'transparent',
      marginBottom: space.sm + 2,
    },
    indicatorActive: { backgroundColor: c.gold },
    label: {
      fontFamily: font.sans,
      fontSize: 10,
      letterSpacing: 1.4,
      color: c.inkFaint,
    },
    labelActive: { color: c.gold, fontWeight: '600' },
  });
