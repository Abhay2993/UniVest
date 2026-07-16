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
import { ACADEMY_MODULES, AcademyModule } from '../data/academy';
import { useEducation } from '../state/EducationContext';
import { useInvestorProfile } from '../state/InvestorProfileContext';
import { ANNUAL_INVESTMENT_LIMIT } from '../state/PortfolioContext';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoney } from '../utils/format';
import { ProgressBar } from '../components/ProgressBar';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

interface Props {
  onClose: () => void;
}

/**
 * UniVest Academy — investor education that pays: each completed module
 * unlocks another 10% of the statutory Reg CF limit (60% → 100%).
 */
export function AcademyScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const { profile } = useInvestorProfile();
  const { isCompleted, completeModule, unlockFactor, effectiveLimit, completedIds } = useEducation();

  const [openModule, setOpenModule] = useState<AcademyModule | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const statutory = profile.annualLimit ?? ANNUAL_INVESTMENT_LIMIT;

  const openLesson = (m: AcademyModule) => {
    LayoutAnimation.configureNext(QUIET_EASE);
    setOpenModule(m);
    setLessonIndex(0);
    setPicked(null);
  };

  const finishCheck = (index: number) => {
    if (!openModule || picked !== null) return;
    setPicked(index);
    if (index === openModule.check.correctIndex) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      completeModule(openModule.id);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  if (openModule) {
    const onCheck = lessonIndex >= openModule.lessons.length;
    const answeredCorrectly = picked === openModule.check.correctIndex;
    return (
      <View style={s.screen}>
        <View style={s.header}>
          <Pressable
            onPress={() => setOpenModule(null)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to academy"
          >
            <Text style={s.back}>← Academy</Text>
          </Pressable>
          <Text style={s.title}>{openModule.title}</Text>
          <Text style={s.subtitle}>
            {onCheck ? 'Knowledge check' : `Lesson ${lessonIndex + 1} of ${openModule.lessons.length}`} ·{' '}
            {openModule.minutes} min module
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {!onCheck ? (
            <View style={s.card}>
              <Text style={s.lessonText}>{openModule.lessons[lessonIndex]}</Text>
              <Pressable
                style={s.cta}
                onPress={() => {
                  LayoutAnimation.configureNext(QUIET_EASE);
                  setLessonIndex(lessonIndex + 1);
                }}
                accessibilityRole="button"
              >
                <Text style={s.ctaText}>
                  {lessonIndex + 1 < openModule.lessons.length ? 'Continue' : 'Take the Check'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.checkPrompt}>{openModule.check.prompt}</Text>
              {openModule.check.options.map((option, i) => {
                const isCorrect = picked !== null && i === openModule.check.correctIndex;
                const isWrongPick = picked === i && !isCorrect;
                return (
                  <Pressable
                    key={option}
                    style={[s.option, isCorrect && s.optionCorrect, isWrongPick && s.optionWrong]}
                    onPress={() => finishCheck(i)}
                    disabled={picked !== null}
                    accessibilityRole="button"
                  >
                    <Text style={s.optionText}>{option}</Text>
                  </Pressable>
                );
              })}
              {picked !== null && (
                <>
                  <Text style={s.checkResult}>
                    {answeredCorrectly
                      ? `Module complete — another 10% of your limit is unlocked. You can now commit up to ${formatMoney(effectiveLimit(statutory))} per year.`
                      : 'Not quite — revisit the lessons and try again.'}
                  </Text>
                  <Pressable
                    style={s.cta}
                    onPress={() => {
                      if (answeredCorrectly) {
                        setOpenModule(null);
                      } else {
                        LayoutAnimation.configureNext(QUIET_EASE);
                        setLessonIndex(0);
                        setPicked(null);
                      }
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={s.ctaText}>{answeredCorrectly ? 'Back to Academy' : 'Review Lessons'}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close academy">
          <Text style={s.back}>← Tools</Text>
        </Pressable>
        <Text style={s.title}>UniVest Academy</Text>
        <Text style={s.subtitle}>
          Four short modules. Each one completed unlocks more of your annual limit.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.overline}>Limit Unlocked</Text>
          <View style={s.unlockRow}>
            <Text style={s.unlockValue}>{formatMoney(effectiveLimit(statutory))}</Text>
            <Text style={s.unlockPct}>{Math.round(unlockFactor * 100)}%</Text>
          </View>
          <ProgressBar progress={unlockFactor} height={4} fillColor={palette.gold} />
          <Text style={s.unlockHint}>
            of your {formatMoney(statutory)} statutory Reg CF limit ·{' '}
            {completedIds.length}/{ACADEMY_MODULES.length} modules complete
          </Text>
        </View>

        {ACADEMY_MODULES.map((m) => {
          const done = isCompleted(m.id);
          return (
            <Pressable
              key={m.id}
              style={s.moduleRow}
              onPress={() => openLesson(m)}
              accessibilityRole="button"
              accessibilityLabel={`${m.title}, ${done ? 'completed' : 'not completed'}`}
            >
              <View style={[s.moduleMark, done && s.moduleMarkDone]}>
                <Text style={[s.moduleMarkText, done && s.moduleMarkTextDone]}>
                  {done ? '✓' : '+10%'}
                </Text>
              </View>
              <View style={s.moduleBody}>
                <Text style={s.moduleTitle}>{m.title}</Text>
                <Text style={s.moduleMeta}>
                  {m.lessons.length} lessons · {m.minutes} min · {done ? 'Completed' : 'Unlocks 10%'}
                </Text>
              </View>
              <Text style={s.moduleArrow}>→</Text>
            </Pressable>
          );
        })}
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
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.md,
    },
    overline: { ...T.overline },
    unlockRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: space.sm,
      marginBottom: space.sm,
    },
    unlockValue: { fontFamily: font.serif, fontSize: 26, color: c.ink },
    unlockPct: { fontFamily: font.serif, fontSize: 20, color: c.bronze },
    unlockHint: { ...T.caption, fontSize: 11, marginTop: space.sm },

    moduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.md,
      marginBottom: space.sm,
    },
    moduleMark: {
      minWidth: 44,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 6,
      marginRight: space.md,
    },
    moduleMarkDone: { backgroundColor: c.emerald, borderColor: c.emerald },
    moduleMarkText: { fontFamily: font.sans, fontSize: 11, fontWeight: '700', color: c.bronze },
    moduleMarkTextDone: { color: '#FFFFFF' },
    moduleBody: { flex: 1 },
    moduleTitle: { fontFamily: font.serif, fontSize: 15, color: c.ink },
    moduleMeta: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1 },
    moduleArrow: { fontFamily: font.serif, fontSize: 17, color: c.inkFaint },

    lessonText: { ...T.body, fontSize: 15, lineHeight: 25 },
    checkPrompt: { fontFamily: font.serif, fontSize: 19, lineHeight: 27, color: c.ink, marginBottom: space.md },
    option: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      padding: space.md,
      marginBottom: space.sm,
    },
    optionCorrect: { borderColor: c.emerald, backgroundColor: 'rgba(47,169,124,0.10)' },
    optionWrong: { borderColor: c.danger, backgroundColor: 'rgba(192,91,91,0.08)' },
    optionText: { ...T.body, fontSize: 14 },
    checkResult: {
      ...T.body,
      fontSize: 13,
      lineHeight: 20,
      color: c.inkMuted,
      marginTop: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: c.gold,
      paddingLeft: space.md,
    },

    cta: {
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 13,
      marginTop: space.lg,
    },
    ctaText: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', letterSpacing: 0.3, color: '#0A192F' },
  });
};
