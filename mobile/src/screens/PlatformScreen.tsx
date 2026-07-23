import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';

interface Props {
  onClose: () => void;
}

/** The three rails a partner can rent instead of rebuilding. */
const RAILS: { name: string; endpoint: string; blurb: string }[] = [
  {
    name: 'SPV formation',
    endpoint: 'POST /platform/v1/spvs',
    blurb:
      'Spin up a compliant special-purpose vehicle on our rails — custody, cap table, and carry accounting included. One call, one clean entity.',
  },
  {
    name: 'Attestation verification',
    endpoint: 'POST /platform/v1/attestations/verify',
    blurb:
      "Verify a milestone's Ed25519 credential against the on-file attestor key. Rent the trust layer; prove a result without holding any keys.",
  },
  {
    name: 'Secondary rails',
    endpoint: 'GET /platform/v1/secondary/:id/book',
    blurb:
      'Render live secondary liquidity — best bid/ask and full depth from the batch-auction book — natively on your own surface.',
  },
];

const PARTNERS: { kind: string; label: string; why: string }[] = [
  { kind: 'Accelerators', label: 'accelerator', why: 'Offer demo-day investing without building a broker-dealer.' },
  { kind: 'Platforms', label: 'platform', why: 'Add deep-tech deals to an existing investing app in a week.' },
  { kind: 'Universities', label: 'university', why: 'Let a TTO run its own branded raise on shared infrastructure.' },
  { kind: 'Syndicates', label: 'syndicate', why: 'Form a per-deal SPV programmatically for each allocation.' },
];

const CODE_SAMPLE = `curl https://api.univest.co/api/v1/platform/v1/spvs \\
  -H "Authorization: Bearer sk_test_univ..." \\
  -d companyName="Lumen Photonics" \\
  -d targetAmount=1500000 \\
  -d currency=USD \\
  -d externalRef="cohort-24-photonics"`;

/**
 * Embedded infrastructure — "Stripe-for-spinout-equity". Positions UniVest as
 * the picks-and-shovels layer beneath the whole category: SPV formation,
 * attestation verification, and secondary rails, offered to accelerators,
 * other platforms, and universities as an API. Becoming the layer (not just the
 * app) is the distribution moat. The real API lives at backend/api/src/platform.
 */
export function PlatformScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close platform">
          <Text style={s.back}>← Tools</Text>
        </Pressable>
        <Text style={s.title}>Embedded Infrastructure</Text>
        <Text style={s.subtitle}>
          Stripe-for-spinout-equity — rent UniVest's SPV, attestation, and secondary rails as an
          API. Become the layer beneath the category, not just an app on top of it.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* API key card — the developer's entry point */}
        <View style={s.keyCard}>
          <Text style={s.keyOverline}>YOUR TEST API KEY</Text>
          <View style={s.keyRow}>
            <Text style={s.keyValue}>{revealed ? 'sk_test_univest_demo' : 'sk_test_univ' + '•'.repeat(12)}</Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setRevealed((r) => !r);
              }}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={s.keyReveal}>{revealed ? 'Hide' : 'Reveal'}</Text>
            </Pressable>
          </View>
          <Text style={s.keyHint}>
            Never stored in plaintext — the server keeps only its SHA-256 digest and authenticates
            by hashing the presented key, exactly like a Stripe restricted key.
          </Text>
        </View>

        {/* The three rails */}
        <View style={s.card}>
          <Text style={s.overline}>The rails</Text>
          {RAILS.map((r) => (
            <View key={r.name} style={s.rail}>
              <View style={s.railHead}>
                <Text style={s.railName}>{r.name}</Text>
              </View>
              <View style={s.endpointChip}>
                <Text style={s.endpointText}>{r.endpoint}</Text>
              </View>
              <Text style={s.railBlurb}>{r.blurb}</Text>
            </View>
          ))}
        </View>

        {/* Code sample */}
        <View style={s.card}>
          <Text style={s.overline}>Form an SPV in one call</Text>
          <View style={s.codeBlock}>
            <Text style={s.code}>{CODE_SAMPLE}</Text>
          </View>
          <Text style={s.body}>
            Idempotent on <Text style={s.mono}>externalRef</Text> — retries return the same SPV
            rather than forming a duplicate.
          </Text>
        </View>

        {/* Who plugs in */}
        <View style={s.card}>
          <Text style={s.overline}>Who plugs in</Text>
          {PARTNERS.map((p) => (
            <View key={p.kind} style={s.partnerRow}>
              <Text style={s.partnerKind}>{p.kind}</Text>
              <Text style={s.partnerWhy}>{p.why}</Text>
            </View>
          ))}
        </View>

        {/* The moat */}
        <View style={s.card}>
          <Text style={s.overline}>The moat</Text>
          <Text style={s.body}>
            Every accelerator, platform, and university that forms deals on UniVest's rails makes
            the category's infrastructure ours to own. The picks-and-shovels layer compounds:
            competitors must rebuild SPV formation, cryptographic attestation, and secondary
            liquidity from scratch — or build on top of us.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.navy,
      paddingTop: space.xxl + space.sm,
      paddingHorizontal: space.lg,
      paddingBottom: space.lg,
    },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginBottom: space.md },
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 34, color: c.onNavy },
    subtitle: { fontFamily: font.sans, fontSize: 12, lineHeight: 18, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },

    keyCard: {
      backgroundColor: c.navy,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.gold,
      padding: space.lg,
      marginBottom: space.md,
    },
    keyOverline: { fontFamily: font.sans, fontSize: 9, letterSpacing: 2, color: c.gold },
    keyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: space.sm,
    },
    keyValue: { fontFamily: font.mono, fontSize: 14, color: '#F5F7FA', flexShrink: 1 },
    keyReveal: { fontFamily: font.sans, fontSize: 12, fontWeight: '700', color: c.gold, marginLeft: space.md },
    keyHint: { fontFamily: font.sans, fontSize: 11, lineHeight: 16, color: 'rgba(245,247,250,0.6)', marginTop: space.sm },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.md,
    },
    overline: { ...T.overline, marginBottom: space.sm },
    body: { ...T.body, fontSize: 13, lineHeight: 21, color: c.inkMuted },
    mono: { fontFamily: font.mono, fontSize: 12, color: c.ink },

    rail: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
      marginTop: space.md,
    },
    railHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    railName: { fontFamily: font.serif, fontSize: 16, color: c.ink },
    endpointChip: {
      alignSelf: 'flex-start',
      backgroundColor: c.navy,
      borderRadius: radius.sm,
      paddingVertical: 3,
      paddingHorizontal: 8,
      marginTop: space.xs,
    },
    endpointText: { fontFamily: font.mono, fontSize: 11, color: c.gold },
    railBlurb: { ...T.body, fontSize: 12.5, lineHeight: 19, color: c.inkMuted, marginTop: space.xs },

    codeBlock: {
      backgroundColor: c.navy,
      borderRadius: radius.sm,
      padding: space.md,
      marginBottom: space.sm,
    },
    code: { fontFamily: font.mono, fontSize: 11, lineHeight: 17, color: '#E8ECF1' },

    partnerRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.sm,
      marginTop: space.sm,
    },
    partnerKind: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', color: c.ink },
    partnerWhy: { ...T.body, fontSize: 12.5, lineHeight: 18, color: c.inkMuted, marginTop: 1 },
  });
};
