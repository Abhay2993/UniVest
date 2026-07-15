import React, { useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Startup } from '../types';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { answerFromDataRoom, CopilotAnswer, SUGGESTED_QUESTIONS } from '../services/copilot';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

interface Exchange {
  id: string;
  question: string;
  answer: CopilotAnswer;
}

/**
 * Diligence Copilot — ask the data room. Every answer cites its source
 * documents; ungrounded questions are declined and routed to Community
 * Diligence instead of speculated on.
 */
export function CopilotCard({ startup }: { startup: Startup }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState('');

  const ask = (question: string) => {
    const q = question.trim();
    if (q.length < 5) return;
    LayoutAnimation.configureNext(QUIET_EASE);
    setExchanges((cur) => [
      ...cur,
      { id: `x-${Date.now()}`, question: q, answer: answerFromDataRoom(startup, q) },
    ]);
    setDraft('');
  };

  return (
    <View style={s.card}>
      <Text style={s.overline}>Diligence Copilot</Text>
      <Text style={s.hint}>
        Ask the data room — {startup.dataRoom.length} indexed documents. Answers cite their
        sources; nothing is invented beyond them.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <Pressable key={q} style={s.chip} onPress={() => ask(q)} accessibilityRole="button">
            <Text style={s.chipText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {exchanges.map((x) => (
        <View key={x.id} style={s.exchange}>
          <Text style={s.youLabel}>YOU</Text>
          <Text style={s.question}>{x.question}</Text>
          <Text style={s.copilotLabel}>COPILOT</Text>
          <Text style={s.answer}>{x.answer.text}</Text>
          {x.answer.citations.length > 0 && (
            <View style={s.citationRow}>
              {x.answer.citations.map((cit) => (
                <View key={cit.docTitle + cit.section} style={s.citation}>
                  <Text style={s.citationText}>
                    {cit.docTitle} · {cit.section}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      <View style={s.askRow}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about the data room…"
          placeholderTextColor={palette.inkFaint}
          maxLength={200}
          onSubmitEditing={() => ask(draft)}
          returnKeyType="send"
          accessibilityLabel="Ask the diligence copilot"
        />
        <Pressable
          onPress={() => ask(draft)}
          disabled={draft.trim().length < 5}
          style={[s.askBtn, draft.trim().length < 5 && s.askBtnDisabled]}
          accessibilityRole="button"
        >
          <Text style={s.askBtnText}>Ask</Text>
        </Pressable>
      </View>
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

    chipScroll: { marginBottom: space.md },
    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: 6,
      marginRight: space.sm,
      backgroundColor: c.background,
    },
    chipText: { fontFamily: font.sans, fontSize: 12, color: c.projection },

    exchange: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
      marginBottom: space.md,
    },
    youLabel: { ...T.overline, fontSize: 9, marginBottom: 2 },
    question: { ...T.body, fontWeight: '600', marginBottom: space.sm },
    copilotLabel: { ...T.overline, fontSize: 9, color: c.bronze, marginBottom: 2 },
    answer: { ...T.body, fontSize: 13, lineHeight: 20, color: c.inkMuted },
    citationRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
    citation: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      backgroundColor: c.surfaceGoldTint,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: space.sm,
      marginBottom: space.xs,
    },
    citationText: { fontFamily: font.sans, fontSize: 10, color: c.bronze },

    askRow: { flexDirection: 'row', alignItems: 'center' },
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
      paddingVertical: 9,
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
  });
};
