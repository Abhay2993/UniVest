import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { PortfolioPosition } from '../types';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import {
  AlertItem,
  AlertKind,
  ALERT_CATEGORIES,
  AlertPrefs,
  buildAlerts,
  DEFAULT_ALERT_PREFS,
} from '../utils/alerts';

const PREFS_KEY = 'univest.alertprefs.v1';
const QUIET = LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity);

const KIND_LABEL: Record<AlertKind, string> = {
  attestation: 'Attest',
  escrow: 'Escrow',
  governance: 'Vote',
  secondary: 'Trade',
  closing: 'Closing',
};

/**
 * Alerts — a material-event feed scoped to the investor's holdings, filtered by
 * per-category preferences. Mirrors the backend `GET /alerts/feed` +
 * `PUT /alerts/preferences`.
 */
export function AlertsCard({ positions }: { positions: PortfolioPosition[] }) {
  const s = useThemedStyles(makeStyles);
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_ALERT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Partial<AlertPrefs>;
        setPrefs((cur) => ({ ...cur, ...stored }));
      })
      .catch(() => {});
  }, []);

  const toggle = (k: AlertKind) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(QUIET);
    setPrefs((cur) => {
      const next = { ...cur, [k]: !cur[k] };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const items = buildAlerts(positions, prefs);

  return (
    <View style={s.card}>
      <Text style={s.overline}>Alerts</Text>
      <Text style={s.hint}>
        Material events on your holdings — attestations, escrow releases, and governance votes. Tap
        a category to mute it.
      </Text>

      <View style={s.chipRow}>
        {ALERT_CATEGORIES.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => toggle(key)}
            style={[s.chip, prefs[key] ? s.chipOn : s.chipOff]}
            accessibilityRole="switch"
            accessibilityState={{ checked: prefs[key] }}
          >
            <Text style={[s.chipText, prefs[key] ? s.chipTextOn : s.chipTextOff]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {items.length === 0 ? (
        <Text style={s.empty}>No alerts in the enabled categories.</Text>
      ) : (
        items.map((it, i) => <AlertRow key={`${it.kind}-${i}`} item={it} last={i === items.length - 1} />)
      )}
    </View>
  );

  function AlertRow({ item, last }: { item: AlertItem; last: boolean }) {
    return (
      <View style={[s.alert, last && s.alertLast]}>
        <View style={s.kindTag}>
          <Text style={s.kindTagText}>{KIND_LABEL[item.kind]}</Text>
        </View>
        <View style={s.alertMain}>
          <Text style={s.alertTitle}>{item.title}</Text>
          <Text style={s.alertDetail}>{item.detail}</Text>
        </View>
      </View>
    );
  }
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
    hint: { ...T.caption, marginTop: space.sm, marginBottom: space.md },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm as number, marginBottom: space.md },
    chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 5 },
    chipOn: { backgroundColor: c.navy, borderColor: c.navy },
    chipOff: { backgroundColor: c.background, borderColor: c.hairline },
    chipText: { fontFamily: font.sans, fontSize: 11, fontWeight: '600' },
    chipTextOn: { color: '#F5F7FA' },
    chipTextOff: { color: c.inkMuted },

    empty: { ...T.caption },
    alert: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.sm,
      paddingBottom: space.sm,
    },
    alertLast: { paddingBottom: 0 },
    kindTag: {
      backgroundColor: c.surfaceGoldTint,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: space.sm,
      marginTop: 1,
    },
    kindTagText: { fontFamily: font.sans, fontSize: 9, fontWeight: '700', color: c.bronze, letterSpacing: 0.3, textTransform: 'uppercase' },
    alertMain: { flex: 1 },
    alertTitle: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.ink },
    alertDetail: { ...T.caption, marginTop: 1 },
  });
};
