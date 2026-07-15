import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { color } from '../theme/tokens';

interface Props {
  /** 0..1 */
  progress: number;
  height?: number;
  fillColor?: string;
  trackColor?: string;
}

/**
 * Thin, precise progress bar. Fills with a slow, whisper-quiet ease —
 * no bounce, no overshoot — per the premium micro-interaction guidelines.
 */
export function ProgressBar({
  progress,
  height = 3,
  fillColor = color.emerald,
  trackColor = color.surfaceMuted,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating width
    }).start();
  }, [progress, anim]);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: 1.5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 1.5 },
});
