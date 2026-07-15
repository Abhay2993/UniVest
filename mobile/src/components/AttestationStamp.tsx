import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MilestoneAttestation } from '../types';
import { font, Palette, radius, space } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { formatDate } from '../utils/format';

/**
 * Verification stamp for an attested milestone: who signed, in what capacity,
 * when, and with which registered Ed25519 key. Signature verification happens
 * server-side against the attestor key registry; the stamp surfaces its result.
 */
export function AttestationStamp({ attestation }: { attestation: MilestoneAttestation }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.stamp}>
      <Text style={s.kind}>
        ✦ {attestation.role === 'tto' ? 'TTO ATTESTATION' : 'INDEPENDENT REVIEW'}
      </Text>
      <Text style={s.verifier}>
        {attestation.verifierName} — {attestation.verifierOrg}
      </Text>
      <Text style={s.meta}>
        Signed {formatDate(attestation.signedAt)} · Ed25519 key {attestation.keyFingerprint}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    stamp: {
      marginTop: space.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.gold,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      backgroundColor: c.surfaceGoldTint,
    },
    kind: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      fontWeight: '700',
      color: c.bronze,
      marginBottom: 2,
    },
    verifier: { fontFamily: font.sans, fontSize: 12, fontWeight: '600', color: c.ink },
    meta: { fontFamily: font.sans, fontSize: 10, color: c.inkMuted, marginTop: 1 },
  });
