import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius } from '../theme/tokens';

/** Champagne-gold TTO verification mark — one of the few sanctioned uses of gold. */
export function VerifiedBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.tick}>✦</Text>
      <Text style={styles.label}>TTO VERIFIED</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tick: { color: color.gold, fontSize: 9, marginRight: 4 },
  label: {
    color: color.bronze,
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
});
