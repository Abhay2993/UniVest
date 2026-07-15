import React from 'react';
import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Startup } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useWatchlist } from '../state/WatchlistContext';

interface Props {
  startup: Startup;
  size?: number;
  /** Star color when not watched — defaults to the palette's faint ink. */
  inactiveColor?: string;
}

/**
 * Watchlist star. Watching an offering schedules its closing-soon alert
 * (48h before close); unwatching cancels it. Gold marks the active state.
 */
export function BookmarkButton({ startup, size = 18, inactiveColor }: Props) {
  const { palette } = useTheme();
  const { isWatched, toggleWatch } = useWatchlist();
  const watched = isWatched(startup.id);

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void toggleWatch(startup);
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: watched }}
      accessibilityLabel={
        watched ? `Remove ${startup.name} from watchlist` : `Add ${startup.name} to watchlist`
      }
    >
      <Text
        style={{
          fontSize: size,
          lineHeight: size + 3,
          color: watched ? palette.gold : (inactiveColor ?? palette.inkFaint),
        }}
      >
        {watched ? '★' : '☆'}
      </Text>
    </Pressable>
  );
}
