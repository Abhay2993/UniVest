import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Startup } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import {
  ANNUAL_INVESTMENT_LIMIT,
  CONCENTRATION_WARNING_PCT,
  usePortfolio,
} from '../state/PortfolioContext';
import { useInvestorProfile } from '../state/InvestorProfileContext';
import { formatMoney } from '../utils/format';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const MAX_TICKET = 5_000;

type Stage = 'idle' | 'amount' | 'warning' | 'sign';

/**
 * The commitment flow, pinned under the detail scroll:
 *  idle → amount selection → (concentration nudge when a single position
 *  would exceed 40% of the annual limit) → subscription-agreement
 *  e-signature → reserved.
 * A reserved commitment shows the Reg CF cooling-off countdown with one-tap
 * cancellation until 48h before close — mirroring the database trigger.
 */
export function InvestPanel({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { getCommitment, commit, cancel, exposurePct } = usePortfolio();
  const { profile, requestOnboarding } = useInvestorProfile();
  const [stage, setStage] = useState<Stage>('idle');
  const [amount, setAmount] = useState(startup.minInvestment);
  const [signature, setSignature] = useState(profile.fullName ?? '');

  const commitment = getCommitment(startup.id);
  const verified = profile.kycStatus === 'approved';
  const annualLimit = profile.annualLimit ?? ANNUAL_INVESTMENT_LIMIT;

  const presets = [startup.minInvestment, 500, 1_000, 2_500, 5_000]
    .filter((v, i, arr) => v >= startup.minInvestment && v <= MAX_TICKET && arr.indexOf(v) === i)
    .sort((a, b) => a - b);

  const go = (next: Stage) => {
    LayoutAnimation.configureNext(QUIET_EASE);
    setStage(next);
  };

  const reserve = () => {
    if (exposurePct(startup.id, amount, annualLimit) >= CONCENTRATION_WARNING_PCT) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      go('warning');
      return;
    }
    go('sign');
  };

  const confirm = () => {
    // Haptic feedback on financial confirmation, per micro-interaction spec.
    // Production also records a suitability_acknowledgements row when the
    // concentration nudge was shown, and files the countersigned agreement
    // (Dropbox Sign) in the Document Vault.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    commit(startup, amount, signature.trim());
    go('idle');
  };

  const onCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    cancel(startup.id);
    go('idle');
  };

  if (commitment) {
    return (
      <CommitmentCard
        amount={commitment.amount}
        cancellableUntil={commitment.cancellableUntil}
        onCancel={onCancel}
      />
    );
  }

  if (stage === 'warning') {
    const pct = Math.round(exposurePct(startup.id, amount, annualLimit));
    return (
      <View style={s.bar}>
        <Text style={s.warnTitle}>A measured note on concentration</Text>
        <Text style={s.warnBody}>
          This commitment would place {pct}% of your {formatMoney(annualLimit)} annual
          allowance in a single {startup.vertical} position. Deep-tech timelines reward
          diversification across several offerings. You may proceed — consider whether this
          weighting reflects your intent.
        </Text>
        <View style={s.row}>
          <Pressable style={s.ghostBtn} onPress={() => go('amount')} accessibilityRole="button">
            <Text style={s.ghostBtnText}>Adjust Amount</Text>
          </Pressable>
          <Pressable style={s.cta} onPress={() => go('sign')} accessibilityRole="button">
            <Text style={s.ctaText}>Proceed — I Understand</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (stage === 'sign') {
    const fee = Math.round(amount * 1.5) / 100;
    const canSign = signature.trim().length >= 3;
    return (
      <View style={s.bar}>
        <View style={s.amountHeader}>
          <Text style={s.overline}>Subscription Agreement</Text>
          <Pressable onPress={() => go('amount')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to amount selection">
            <Text style={s.dismiss}>✕</Text>
          </Pressable>
        </View>
        <View style={s.termRow}>
          <Text style={s.termLabel}>Commitment</Text>
          <Text style={s.termValue}>{formatMoney(amount)}</Text>
        </View>
        <View style={s.termRow}>
          <Text style={s.termLabel}>SPV admin fee (1.5%)</Text>
          <Text style={s.termValue}>{formatMoney(fee)}</Text>
        </View>
        <View style={s.termRow}>
          <Text style={s.termLabel}>Issuer</Text>
          <Text style={s.termValue}>{startup.name} — via nominee SPV</Text>
        </View>
        <Text style={s.signDisclosure}>
          I acknowledge the risk of total loss, the illiquidity of these securities, and my
          cancellation right until 48 hours before close.
        </Text>
        <TextInput
          style={s.signInput}
          value={signature}
          onChangeText={setSignature}
          placeholder="Type your full legal name to sign"
          placeholderTextColor={s.signPlaceholder.color}
          autoCapitalize="words"
          accessibilityLabel="Type your full legal name to sign"
        />
        <Pressable
          style={[s.cta, !canSign && s.ctaDisabled]}
          disabled={!canSign}
          onPress={confirm}
          accessibilityRole="button"
        >
          <Text style={s.ctaText}>Sign & Reserve {formatMoney(amount)}</Text>
        </Pressable>
        <Text style={s.footnote}>
          E-signature executed via Dropbox Sign in production (ESIGN/UETA) · the countersigned
          agreement files to your Document Vault
        </Text>
      </View>
    );
  }

  if (stage === 'amount') {
    return (
      <View style={s.bar}>
        <View style={s.amountHeader}>
          <Text style={s.overline}>Commitment Amount</Text>
          <Pressable onPress={() => go('idle')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close amount selection">
            <Text style={s.dismiss}>✕</Text>
          </Pressable>
        </View>
        <View style={s.presetRow}>
          {presets.map((v) => (
            <Pressable
              key={v}
              onPress={() => setAmount(v)}
              style={[s.preset, amount === v && s.presetActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: amount === v }}
            >
              <Text style={[s.presetText, amount === v && s.presetTextActive]}>
                {formatMoney(v)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={s.cta} onPress={reserve} accessibilityRole="button">
          <Text style={s.ctaText}>Reserve {formatMoney(amount)}</Text>
        </Pressable>
        <Text style={s.footnote}>
          1.5% SPV admin fee · cancel any time until 48h before close (Reg CF)
        </Text>
      </View>
    );
  }

  if (!verified) {
    return (
      <View style={s.bar}>
        <Pressable
          onPress={requestOnboarding}
          style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel="Verify your identity to invest"
        >
          <Text style={s.ctaText}>Verify Identity to Invest</Text>
        </Pressable>
        <Text style={s.footnote}>
          Investing requires identity verification and the suitability quiz — about two minutes
        </Text>
      </View>
    );
  }

  return (
    <View style={s.bar}>
      <Pressable
        onPress={() => go('amount')}
        style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Invest in ${startup.name}, minimum ${formatMoney(startup.minInvestment)}`}
      >
        <Text style={s.ctaText}>Invest — from {formatMoney(startup.minInvestment)}</Text>
      </Pressable>
      <Text style={s.footnote}>
        1.5% SPV admin fee · cancel any time until 48h before close (Reg CF)
      </Text>
    </View>
  );
}

function CommitmentCard({
  amount,
  cancellableUntil,
  onCancel,
}: {
  amount: number;
  cancellableUntil: string;
  onCancel: () => void;
}) {
  const s = useThemedStyles(makeStyles);
  const remaining = useCountdown(cancellableUntil);

  return (
    <View style={s.bar}>
      <View style={s.commitRow}>
        <View style={s.commitLeft}>
          <Text style={s.overline}>Commitment Reserved</Text>
          <Text style={s.commitAmount}>{formatMoney(amount)}</Text>
        </View>
        {remaining ? (
          <View style={s.commitRight}>
            <Text style={s.countdown}>{remaining}</Text>
            <Text style={s.countdownLabel}>left to cancel</Text>
          </View>
        ) : (
          <View style={s.commitRight}>
            <Text style={s.windowClosed}>Window closed</Text>
            <Text style={s.countdownLabel}>funds transfer at close</Text>
          </View>
        )}
      </View>
      {remaining && (
        <Pressable style={s.cancelBtn} onPress={onCancel} accessibilityRole="button">
          <Text style={s.cancelBtnText}>Cancel Commitment</Text>
        </Pressable>
      )}
      <Text style={s.footnote}>
        Under Reg CF you may cancel until 48 hours before the round closes. Funds stay in escrow
        until then.
      </Text>
    </View>
  );
}

/** "12d 06h" / "31h 12m" until the instant, refreshed every 30s; null once past. */
function useCountdown(targetIso: string): string | null {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const ms = Date.parse(targetIso) - Date.now();
  if (ms <= 0) return null;
  const totalHours = Math.floor(ms / 3_600_000);
  if (totalHours >= 48) return `${Math.floor(totalHours / 24)}d ${String(totalHours % 24).padStart(2, '0')}h`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${totalHours}h ${String(mins).padStart(2, '0')}m`;
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    bar: {
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xl,
    },
    overline: { ...T.overline },
    row: { flexDirection: 'row', alignItems: 'center' },
    footnote: { ...T.caption, fontSize: 10, textAlign: 'center', marginTop: space.sm },

    cta: {
      flex: 1,
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 14,
    },
    ctaPressed: { opacity: 0.9 },
    ctaDisabled: { opacity: 0.35 },

    termRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingVertical: 5,
    },
    termLabel: { ...T.caption, fontSize: 12 },
    termValue: { ...T.financial, fontSize: 13, fontWeight: '600' },
    signDisclosure: {
      ...T.caption,
      fontSize: 11,
      lineHeight: 17,
      marginTop: space.sm,
      marginBottom: space.md,
      borderLeftWidth: 2,
      borderLeftColor: c.gold,
      paddingLeft: space.sm,
    },
    signInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      backgroundColor: c.background,
      color: c.ink,
      fontFamily: font.serif,
      fontSize: 16,
      paddingHorizontal: space.md,
      paddingVertical: 11,
      marginBottom: space.md,
    },
    signPlaceholder: { color: c.inkFaint },
    ctaText: {
      fontFamily: font.sans,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: '#0A192F',
    },

    amountHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space.md,
    },
    dismiss: { fontFamily: font.sans, fontSize: 14, color: c.inkFaint },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md },
    preset: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: 8,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    presetActive: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    presetText: { ...T.financial, fontSize: 13, color: c.inkMuted },
    presetTextActive: { color: c.bronze, fontWeight: '600' },

    warnTitle: { fontFamily: font.serif, fontSize: 16, color: c.ink, marginBottom: space.sm },
    warnBody: { ...T.body, fontSize: 13, lineHeight: 20, color: c.inkMuted, marginBottom: space.md },
    ghostBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingVertical: 13,
      paddingHorizontal: space.md,
      marginRight: space.sm,
    },
    ghostBtnText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.inkMuted },

    commitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: space.md,
    },
    commitLeft: {},
    commitRight: { alignItems: 'flex-end' },
    commitAmount: {
      fontFamily: font.sans,
      fontSize: 22,
      fontWeight: '600',
      color: c.ink,
      marginTop: 2,
      ...tabularNums,
    },
    countdown: {
      fontFamily: font.sans,
      fontSize: 16,
      fontWeight: '600',
      color: c.emerald,
      ...tabularNums,
    },
    windowClosed: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.amber },
    countdownLabel: { ...T.caption, fontSize: 10 },
    cancelBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.danger,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 12,
    },
    cancelBtnText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.danger },
  });
};
