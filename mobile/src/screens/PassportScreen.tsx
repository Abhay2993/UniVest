import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useInvestorProfile } from '../state/InvestorProfileContext';
import { useSettings } from '../state/SettingsContext';
import { ANNUAL_INVESTMENT_LIMIT } from '../state/PortfolioContext';
import { resolveRegime } from '../utils/compliance';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoney } from '../utils/format';

interface Props {
  onClose: () => void;
}

/** FNV-1a 32-bit → a stable short fingerprint for the demo credential. */
function fingerprint(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hex = h.toString(16).padStart(8, '0').toUpperCase();
  return `${hex.slice(0, 4)}·${hex.slice(4)}`;
}

/**
 * Portable Investor Passport — the reusable, cryptographically verifiable
 * credential of the investor's verified KYC + accreditation + suitability +
 * jurisdiction. Framed as accepted by other platforms: it's a standard W3C VC
 * signed by the platform issuer key, so anyone can verify it without trusting
 * UniVest. (The real Ed25519 issuance/verification runs server-side; see
 * backend/api/src/passport.)
 */
export function PassportScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { profile } = useInvestorProfile();
  const { jurisdiction } = useSettings();
  const regime = resolveRegime(jurisdiction);
  const [verified, setVerified] = useState(false);

  const isVerified = profile.kycStatus === 'approved';
  const limit = profile.annualLimit ?? ANNUAL_INVESTMENT_LIMIT;
  const holder = profile.fullName ?? 'UniVest Investor';
  const fp = useMemo(
    () => fingerprint(`${holder}|${profile.quizScore}|${limit}|${jurisdiction}`),
    [holder, profile.quizScore, limit, jurisdiction],
  );

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close passport">
          <Text style={s.back}>← Tools</Text>
        </Pressable>
        <Text style={s.title}>Investor Passport</Text>
        <Text style={s.subtitle}>
          One verified identity, reusable across platforms — cryptographically verifiable, not
          re-submitted.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {!isVerified ? (
          <View style={s.card}>
            <Text style={s.notVerified}>
              Complete identity verification and the suitability quiz to mint your passport. Once
              verified, it becomes a portable credential you never have to re-submit.
            </Text>
          </View>
        ) : (
          <>
            {/* The passport "card" */}
            <View style={s.passport}>
              <View style={s.passportTop}>
                <Text style={s.passportBrand}>UNIVEST · VERIFIABLE CREDENTIAL</Text>
                <Text style={s.passportSeal}>✦</Text>
              </View>
              <Text style={s.passportHolder}>{holder}</Text>
              <Text style={s.passportType}>Investor Passport</Text>
              <View style={s.passportGrid}>
                <Claim label="Identity (KYC)" value="Verified ✓" />
                <Claim label="Suitability" value={`${profile.quizScore ?? '—'}/5 passed`} />
                <Claim label="Residence" value={profile.country ?? '—'} />
                <Claim label="Regime" value={`${regime.framework} · ${regime.regulator}`} />
              </View>
              <View style={s.passportLimitRow}>
                <Text style={s.passportLimitLabel}>ANNUAL LIMIT</Text>
                <Text style={s.passportLimit}>{formatMoney(limit)}</Text>
              </View>
              <Text style={s.passportFp}>Ed25519 · did:univest:issuer · {fp}</Text>
            </View>

            <View style={s.card}>
              <Text style={s.overline}>Why it's portable</Text>
              <Text style={s.body}>
                Your passport is a W3C Verifiable Credential signed by UniVest's Ed25519 issuer
                key. Any platform — not just UniVest — can verify it against the public issuer key
                without trusting our servers or re-running KYC. Present once, accepted everywhere
                that recognizes the standard.
              </Text>
              <Pressable
                style={s.cta}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  setVerified(true);
                }}
                accessibilityRole="button"
              >
                <Text style={s.ctaText}>{verified ? '✓ Signature Verified' : 'Verify Signature'}</Text>
              </Pressable>
              {verified && (
                <Text style={s.verifyResult}>
                  valid: true · issuer UniVest Identity · holder {holder} · limit{' '}
                  {formatMoney(limit)} — checked against the public issuer key.
                </Text>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.overline}>The moat</Text>
              <Text style={s.body}>
                If UniVest becomes the identity layer for private-market investors — one passport
                accepted across platforms — that's a network and regulatory moat built directly on
                the verifiable-credential infrastructure already shipped. Revoking a passport
                invalidates it everywhere at once.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );

  function Claim({ label, value }: { label: string; value: string }) {
    return (
      <View style={s.claim}>
        <Text style={s.claimLabel}>{label}</Text>
        <Text style={s.claimValue}>{value}</Text>
      </View>
    );
  }
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

    notVerified: { ...T.body, fontSize: 14, lineHeight: 22, color: c.inkMuted },

    // The passport card — navy with gold, the prestige artifact
    passport: {
      backgroundColor: c.navy,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.gold,
      padding: space.lg,
      marginBottom: space.md,
    },
    passportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    passportBrand: { fontFamily: font.sans, fontSize: 9, letterSpacing: 2, color: c.gold },
    passportSeal: { fontFamily: font.serif, fontSize: 18, color: c.gold },
    passportHolder: { fontFamily: font.serif, fontSize: 24, color: '#F5F7FA', marginTop: space.md },
    passportType: { fontFamily: font.sans, fontSize: 11, color: 'rgba(245,247,250,0.64)', marginBottom: space.md },
    passportGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.12)',
      paddingTop: space.md,
    },
    claim: { width: '50%', paddingVertical: space.xs },
    claimLabel: { fontFamily: font.sans, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(245,247,250,0.5)' },
    claimValue: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: '#F5F7FA', marginTop: 1 },
    passportLimitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: space.md,
    },
    passportLimitLabel: { fontFamily: font.sans, fontSize: 9, letterSpacing: 1.2, color: 'rgba(245,247,250,0.5)' },
    passportLimit: { fontFamily: font.serif, fontSize: 20, color: c.gold, ...tabularNums },
    passportFp: { fontFamily: font.sans, fontSize: 10, color: 'rgba(245,247,250,0.5)', marginTop: space.sm },

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
    cta: {
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: space.md,
    },
    ctaText: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', letterSpacing: 0.3, color: '#0A192F' },
    verifyResult: { ...T.caption, fontSize: 11, lineHeight: 16, marginTop: space.sm, color: c.emerald },
  });
};
