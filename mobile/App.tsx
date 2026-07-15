import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Startup } from './src/types';
import { color } from './src/theme/tokens';
import { DiscoveryFeedScreen } from './src/screens/DiscoveryFeedScreen';
import { StartupDetailScreen } from './src/screens/StartupDetailScreen';

/**
 * Root of the UniVest demo app. Deliberately dependency-light: a single
 * piece of navigation state moves between the Global Discovery Feed and a
 * startup's detail view (pitch + Visual Milestone Tracker). Swap for
 * react-navigation once the full route map lands.
 */
export default function App() {
  const [selected, setSelected] = useState<Startup | null>(null);

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor={color.navy} />
      {selected ? (
        <StartupDetailScreen startup={selected} onBack={() => setSelected(null)} />
      ) : (
        <DiscoveryFeedScreen onSelectStartup={setSelected} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
});
