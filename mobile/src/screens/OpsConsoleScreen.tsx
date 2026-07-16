import React, { useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const HIDE_REASONS = ['Off-topic', 'Solicitation', 'Personal data'] as const;

interface QueueItem {
  id: string;
  title: string;
  detail: string;
}

const CAMPAIGN_QUEUE: QueueItem[] = [
  {
    id: 'c1',
    title: 'Vasca Bio — Phase II raise',
    detail: 'USIT template · $3.2M target · 15% university equity · submitted by Oxford University Innovation, 2 days ago',
  },
];

const KYC_QUEUE: QueueItem[] = [
  { id: 'k1', title: 'D. Novak — document mismatch', detail: 'Persona flagged name transliteration (passport vs bank). Manual review required.' },
  { id: 'k2', title: 'S. Ibrahim — watchlist near-match', detail: '78% name similarity on sanctions list; date of birth does not match. Needs adjudication.' },
];

const MODERATION_QUEUE: QueueItem[] = [
  {
    id: 'm1',
    title: 'Question on Helion Dynamics — flagged by 3 users',
    detail: '"DM me for a guaranteed pre-IPO allocation of this stock…" — reads as solicitation.',
  },
];

type Resolution = 'approved' | 'returned' | 'hidden' | 'kept' | 'escalated';

interface Props {
  onClose: () => void;
}

/**
 * Platform Ops — the minimal admin console: campaign approvals, KYC
 * exceptions, and Q&A moderation. Hides preserve the audit trail
 * (deal_questions.hidden_at / hidden_reason); the API endpoints live at
 * /api/v1/admin/*.
 */
export function OpsConsoleScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [reasonFor, setReasonFor] = useState<string | null>(null);

  const resolve = (id: string, resolution: Resolution) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(QUIET_EASE);
    setResolutions((cur) => ({ ...cur, [id]: resolution }));
    setReasonFor(null);
  };

  const resolutionLabel: Record<Resolution, string> = {
    approved: '✓ Approved — now live',
    returned: 'Returned to TTO with notes',
    hidden: 'Hidden — audit trail preserved',
    kept: 'Kept visible',
    escalated: 'Escalated to compliance',
  };

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close ops console">
          <Text style={s.back}>← Tools</Text>
        </Pressable>
        <Text style={s.title}>Platform Ops</Text>
        <Text style={s.subtitle}>Campaign approvals · KYC exceptions · Q&A moderation</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Queue
          overline="Campaign Approvals"
          hint="TTO-submitted raises awaiting platform review before going live."
          items={CAMPAIGN_QUEUE}
          renderActions={(item) => (
            <>
              <ActionBtn label="Approve & Go Live" primary onPress={() => resolve(item.id, 'approved')} />
              <ActionBtn label="Return" onPress={() => resolve(item.id, 'returned')} />
            </>
          )}
        />

        <Queue
          overline="KYC Exceptions"
          hint="Identity checks the automated flow could not clear. Decisions are logged."
          items={KYC_QUEUE}
          renderActions={(item) => (
            <>
              <ActionBtn label="Approve" primary onPress={() => resolve(item.id, 'approved')} />
              <ActionBtn label="Escalate" onPress={() => resolve(item.id, 'escalated')} />
            </>
          )}
        />

        <Queue
          overline="Q&A Moderation"
          hint="Hiding preserves the record (hidden_at + reason) — nothing is deleted."
          items={MODERATION_QUEUE}
          renderActions={(item) =>
            reasonFor === item.id ? (
              <View style={s.reasonRow}>
                {HIDE_REASONS.map((reason) => (
                  <Pressable
                    key={reason}
                    style={s.reasonChip}
                    onPress={() => resolve(item.id, 'hidden')}
                    accessibilityRole="button"
                  >
                    <Text style={s.reasonText}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <ActionBtn label="Hide…" primary onPress={() => setReasonFor(item.id)} />
                <ActionBtn label="Keep" onPress={() => resolve(item.id, 'kept')} />
              </>
            )
          }
        />

        <Text style={s.footer}>
          Console actions call POST /api/v1/admin/* under an admin identity — Row-Level Security
          and the audit trail apply to administrators too.
        </Text>
      </ScrollView>
    </View>
  );

  function Queue({
    overline,
    hint,
    items,
    renderActions,
  }: {
    overline: string;
    hint: string;
    items: QueueItem[];
    renderActions: (item: QueueItem) => React.ReactNode;
  }) {
    return (
      <View style={s.card}>
        <Text style={s.overline}>{overline}</Text>
        <Text style={s.hint}>{hint}</Text>
        {items.map((item) => {
          const resolution = resolutions[item.id];
          return (
            <View key={item.id} style={s.item}>
              <Text style={s.itemTitle}>{item.title}</Text>
              <Text style={s.itemDetail}>{item.detail}</Text>
              {resolution ? (
                <Text style={s.resolved}>{resolutionLabel[resolution]}</Text>
              ) : (
                <View style={s.actions}>{renderActions(item)}</View>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  function ActionBtn({
    label,
    primary,
    onPress,
  }: {
    label: string;
    primary?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        style={[s.actionBtn, primary && s.actionBtnPrimary]}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text style={[s.actionText, primary && s.actionTextPrimary]}>{label}</Text>
      </Pressable>
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
    subtitle: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.md,
    },
    overline: { ...T.overline },
    hint: { ...T.caption, fontSize: 11, marginTop: space.xs, marginBottom: space.sm },
    item: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
    },
    itemTitle: { ...T.body, fontWeight: '600', fontSize: 14 },
    itemDetail: { ...T.body, fontSize: 12, lineHeight: 19, color: c.inkMuted, marginTop: 3 },
    actions: { flexDirection: 'row', marginTop: space.sm },
    actionBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: 8,
      marginRight: space.sm,
    },
    actionBtnPrimary: { backgroundColor: c.navy, borderColor: c.navy },
    actionText: { fontFamily: font.sans, fontSize: 12, fontWeight: '600', color: c.inkMuted },
    actionTextPrimary: { color: '#F5F7FA' },
    reasonRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
    reasonChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.danger,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 6,
      marginRight: space.sm,
      marginBottom: space.xs,
    },
    reasonText: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', color: c.danger },
    resolved: {
      fontFamily: font.sans,
      fontSize: 12,
      fontWeight: '600',
      color: c.emerald,
      marginTop: space.sm,
    },
    footer: { ...T.caption, fontSize: 10, textAlign: 'center', marginTop: space.xs },
  });
};
