import React, { useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { QAQuestion, QARole } from '../types';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatDate } from '../utils/format';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const ROLE_LABEL: Record<QARole, string> = {
  founder: 'FOUNDER',
  tto: 'TTO',
  investor: 'INVESTOR',
};

interface Props {
  startupName: string;
  questions: QAQuestion[];
}

/**
 * Community Diligence — the public Q&A channel Reg CF expects on every deal.
 * Founder and TTO answers carry role badges; new questions post to the thread
 * (demo: local state; production routes through deal_questions with
 * moderation).
 */
export function QASection({ startupName, questions: initialQuestions }: Props) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [questions, setQuestions] = useState<QAQuestion[]>(initialQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(initialQuestions[0]?.id ?? null);
  const [draft, setDraft] = useState('');

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(QUIET_EASE);
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const submit = () => {
    const body = draft.trim();
    if (body.length < 10) return;
    const question: QAQuestion = {
      id: `local-${Date.now()}`,
      authorName: 'You',
      role: 'investor',
      body,
      date: new Date().toISOString().slice(0, 10),
      upvotes: 0,
      answers: [],
    };
    LayoutAnimation.configureNext(QUIET_EASE);
    setQuestions((cur) => [question, ...cur]);
    setDraft('');
  };

  return (
    <View style={s.card}>
      <Text style={s.overline}>Community Diligence</Text>
      <Text style={s.hint}>
        Public questions answered by the {startupName} team. Founder and TTO responses are
        badged; the thread is part of the offering record.
      </Text>

      <View style={s.askRow}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask a technical question…"
          placeholderTextColor={palette.inkFaint}
          multiline
          maxLength={400}
          accessibilityLabel="Ask a technical question"
        />
        <Pressable
          onPress={submit}
          disabled={draft.trim().length < 10}
          style={[s.askBtn, draft.trim().length < 10 && s.askBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Submit question"
        >
          <Text style={s.askBtnText}>Ask</Text>
        </Pressable>
      </View>

      {questions.map((q, i) => {
        const expanded = expandedId === q.id;
        return (
          <Pressable
            key={q.id}
            onPress={() => toggle(q.id)}
            style={[s.question, i === questions.length - 1 && s.questionLast]}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
          >
            <View style={s.qHeader}>
              <RoleBadge role={q.role} />
              <Text style={s.qAuthor}>{q.authorName}</Text>
              <Text style={s.qMeta}>
                {formatDate(q.date)}{q.upvotes > 0 ? `  ·  ▲ ${q.upvotes}` : ''}
              </Text>
            </View>
            <Text style={s.qBody}>{q.body}</Text>

            {expanded &&
              (q.answers.length > 0 ? (
                q.answers.map((a) => (
                  <View key={a.id} style={s.answer}>
                    <View style={s.qHeader}>
                      <RoleBadge role={a.role} />
                      <Text style={s.qAuthor}>{a.authorName}</Text>
                      <Text style={s.qMeta}>{formatDate(a.date)}</Text>
                    </View>
                    <Text style={s.aBody}>{a.body}</Text>
                  </View>
                ))
              ) : (
                <Text style={s.awaiting}>Awaiting response from the team.</Text>
              ))}
          </Pressable>
        );
      })}
    </View>
  );
}

function RoleBadge({ role }: { role: QARole }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={[s.badge, role === 'founder' && s.badgeFounder, role === 'tto' && s.badgeTto]}>
      <Text
        style={[s.badgeText, role === 'founder' && s.badgeTextFounder, role === 'tto' && s.badgeTextTto]}
      >
        {ROLE_LABEL[role]}
      </Text>
    </View>
  );
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

    askRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.lg },
    input: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      backgroundColor: c.background,
      color: c.ink,
      fontFamily: font.sans,
      fontSize: 13,
      paddingHorizontal: space.sm,
      paddingVertical: 8,
      minHeight: 40,
      maxHeight: 96,
      marginRight: space.sm,
    },
    askBtn: {
      backgroundColor: c.navy,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: 11,
    },
    askBtnDisabled: { opacity: 0.4 },
    askBtnText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: '#F5F7FA' },

    question: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
    },
    questionLast: { paddingBottom: 0 },
    qHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    qAuthor: { fontFamily: font.sans, fontSize: 12, fontWeight: '600', color: c.ink, marginRight: space.sm },
    qMeta: { fontFamily: font.sans, fontSize: 11, color: c.inkFaint },
    qBody: { ...T.body, fontSize: 14 },

    answer: {
      marginTop: space.md,
      marginLeft: space.sm,
      paddingLeft: space.md,
      borderLeftWidth: 2,
      borderLeftColor: c.surfaceMuted,
    },
    aBody: { ...T.body, fontSize: 13, lineHeight: 20, color: c.inkMuted },
    awaiting: { ...T.caption, marginTop: space.sm, fontStyle: 'italic' },

    badge: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: 5,
      paddingVertical: 1,
      marginRight: space.sm,
    },
    badgeFounder: { borderColor: c.gold },
    badgeTto: { borderColor: c.bronze, backgroundColor: c.surfaceGoldTint },
    badgeText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 1, fontWeight: '700', color: c.inkFaint },
    badgeTextFounder: { color: c.gold },
    badgeTextTto: { color: c.bronze },
  });
};
