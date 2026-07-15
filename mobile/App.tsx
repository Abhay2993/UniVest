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
import { InboxProvider } from './src/state/InboxContext';
import { InvestorProfileProvider, useInvestorProfile } from './src/state/InvestorProfileContext';
import { PortfolioProvider } from './src/state/PortfolioContext';
import { WatchlistProvider } from './src/state/WatchlistContext';
import { Tab, TabBar } from './src/components/TabBar';
import { DiscoveryFeedScreen } from './src/screens/DiscoveryFeedScreen';
import { MarketsScreen } from './src/screens/MarketsScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { StartupDetailScreen } from './src/screens/StartupDetailScreen';
import { ToolsScreen } from './src/screens/ToolsScreen';

/**
 * Root of the UniVest demo app: four text-tab sections (Discover, Portfolio,
 * Markets, Tools) with a startup detail view layered over any of them.
 * Deliberately dependency-light; swap for react-navigation once the full
 * route map lands.
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
      <InvestorProfileProvider>
        <WatchlistProvider>
          <PortfolioProvider>
            <InboxProvider>
              <Root />
            </InboxProvider>
          </PortfolioProvider>
        </WatchlistProvider>
      </InvestorProfileProvider>
    </ThemeProvider>
  );
}

function Root() {
  const { palette } = useTheme();
  const { onboardingVisible } = useInvestorProfile();
  const [tab, setTab] = useState<Tab>('discover');
  const [selected, setSelected] = useState<Startup | null>(null);

  if (onboardingVisible) {
    return (
      <View style={[styles.root, { backgroundColor: palette.navy }]}>
        <StatusBar style="light" backgroundColor={palette.navy} />
        <OnboardingFlow />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.navy }]}>
      <StatusBar style="light" backgroundColor={palette.navy} />
      {selected ? (
        <StartupDetailScreen startup={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <View style={styles.body}>
            {tab === 'discover' && <DiscoveryFeedScreen onSelectStartup={setSelected} />}
            {tab === 'portfolio' && <PortfolioScreen onSelectStartup={setSelected} />}
            {tab === 'markets' && <MarketsScreen />}
            {tab === 'tools' && <ToolsScreen />}
          </View>
          <TabBar active={tab} onChange={setTab} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  splash: { flex: 1, backgroundColor: lightPalette.navy },
});
