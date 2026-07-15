import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, Palette, radius } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';

/** Champagne-gold TTO verification mark — one of the few sanctioned uses of gold. */
export function VerifiedBadge() {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.badge}>
      <Text style={s.tick}>✦</Text>
      <Text style={s.label}>TTO VERIFIED</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.gold,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tick: { color: c.gold, fontSize: 9, marginRight: 4 },
    label: {
      color: c.bronze,
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      fontWeight: '600',
    },
  });
