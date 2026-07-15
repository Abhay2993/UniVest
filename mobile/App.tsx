import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
} from '@expo-google-fonts/playfair-display';
import { Startup } from './src/types';
import { lightPalette } from './src/theme/tokens';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { WatchlistProvider } from './src/state/WatchlistContext';
import { DiscoveryFeedScreen } from './src/screens/DiscoveryFeedScreen';
import { StartupDetailScreen } from './src/screens/StartupDetailScreen';

/**
 * Root of the UniVest demo app. Deliberately dependency-light: a single
 * piece of navigation state moves between the Global Discovery Feed
 * (list + research map) and a startup's detail view (pitch + Visual
 * Milestone Tracker). Swap for react-navigation once the full route map
 * lands.
 */
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
  });

  // Hold on a quiet navy canvas for the beat it takes the serifs to load.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.splash} />;
  }

  return (
    <ThemeProvider>
      <WatchlistProvider>
        <Root />
      </WatchlistProvider>
    </ThemeProvider>
  );
}

function Root() {
  const { palette } = useTheme();
  const [selected, setSelected] = useState<Startup | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: palette.navy }]}>
      <StatusBar style="light" backgroundColor={palette.navy} />
      {selected ? (
        <StartupDetailScreen startup={selected} onBack={() => setSelected(null)} />
      ) : (
        <DiscoveryFeedScreen onSelectStartup={setSelected} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, backgroundColor: lightPalette.navy },
});
