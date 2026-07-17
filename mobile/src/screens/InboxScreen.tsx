import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityKind } from '../types';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';
import { useInbox } from '../state/InboxContext';

const KIND_LABEL: Record<ActivityKind, string> = {
  milestone_attested: 'ATTESTATION',
  auction_cleared: 'LIQUIDITY',
  tax_document: 'TAX',
  closing_soon: 'CLOSING',
  distribution: 'DISTRIBUTION',
  science_signal: 'SCIENCE',
};

interface Props {
  onClose: () => void;
}

/** The activity inbox — the persistent record behind every push alert. */
export function InboxScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { items, isRead, markAllRead, unreadCount } = useInbox();

  // Opening the inbox reads it.
  useEffect(() => {
    if (unreadCount > 0) {
      const t = setTimeout(markAllRead, 800);
      return () => clearTimeout(t);
    }
  }, [unreadCount, markAllRead]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close inbox">
          <Text style={s.back}>← Discovery</Text>
        </Pressable>
        <Text style={s.title}>Activity</Text>
        <Text style={s.subtitle}>
          Attestations, clearings, documents, and deadlines across your portfolio
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {items.map((item, i) => {
          const unread = !isRead(item.id);
          return (
            <View key={item.id} style={[s.item, i === items.length - 1 && s.itemLast]}>
              <View style={s.itemHeader}>
                <View style={s.kindChip}>
                  <Text style={s.kindText}>{KIND_LABEL[item.kind]}</Text>
                </View>
                {unread && <View style={s.unreadDot} />}
                <Text style={s.date}>
                  {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[s.itemTitle, unread && s.itemTitleUnread]}>{item.title}</Text>
              <Text style={s.itemBody}>{item.body}</Text>
            </View>
          );
        })}
        <Text style={s.footer}>
          Delivered by the Notification Service — every push alert lands here permanently.
        </Text>
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
    subtitle: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted, marginTop: space.xs },

    content: { padding: space.md, paddingBottom: space.xxl },
    item: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.sm,
    },
    itemLast: { marginBottom: space.md },
    itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
    kindChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: space.sm,
    },
    kindText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 1.1, fontWeight: '700', color: c.inkMuted },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.gold, marginRight: space.sm },
    date: { fontFamily: font.sans, fontSize: 11, color: c.inkFaint, marginLeft: 'auto' },
    itemTitle: { ...T.body, fontSize: 15, marginBottom: 3 },
    itemTitleUnread: { fontWeight: '700' },
    itemBody: { ...T.body, fontSize: 13, lineHeight: 20, color: c.inkMuted },
    footer: { ...T.caption, fontSize: 10, textAlign: 'center', marginTop: space.sm },
  });
};
