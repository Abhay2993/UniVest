import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { INCOME_BANDS, NET_WORTH_BANDS, PASS_SCORE, QUIZ_QUESTIONS } from '../data/quiz';
import { useInvestorProfile } from '../state/InvestorProfileContext';
import { useSettings } from '../state/SettingsContext';
import { regimeForCountry, resolveRegime } from '../utils/compliance';
import { font, Palette, radius, space, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { computeInvestmentLimit } from '../utils/finance';
import { formatMoney } from '../utils/format';
import { ProgressBar } from '../components/ProgressBar';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

const COUNTRIES = ['USA', 'GBR', 'DEU', 'CAN', 'SGP', 'AUS'] as const;

type Step = 'welcome' | 'identity' | 'verifying' | 'quiz' | 'financials' | 'result';

/**
 * The front door: welcome → identity verification (Persona/Stripe Identity
 * hosted flow in production; simulated here) → suitability quiz →
 * income/net-worth bands → the computed Reg CF annual limit. Completing the
 * flow unlocks investing; skipping leaves the app in browse-only guest mode.
 */
export function OnboardingFlow() {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const { skipOnboarding, completeOnboarding } = useInvestorProfile();
  const { setJurisdiction } = useSettings();

  const [step, setStep] = useState<Step>('welcome');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<string>('USA');

  // Quiz state
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  // Financial bands
  const [incomeBand, setIncomeBand] = useState<number | null>(null);
  const [netWorthBand, setNetWorthBand] = useState<number | null>(null);

  const go = (next: Step) => {
    LayoutAnimation.configureNext(QUIET_EASE);
    setStep(next);
  };

  useEffect(() => {
    if (step !== 'verifying') return;
    // Production: poll the Persona inquiry until the signed webhook lands.
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      go('quiz');
    }, 1_800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const question = QUIZ_QUESTIONS[questionIndex];

  const answer = (index: number) => {
    if (picked !== null) return;
    setPicked(index);
    if (index === question.correctIndex) {
      setScore((cur) => cur + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  const nextQuestion = () => {
    LayoutAnimation.configureNext(QUIET_EASE);
    setPicked(null);
    if (questionIndex + 1 < QUIZ_QUESTIONS.length) {
      setQuestionIndex(questionIndex + 1);
    } else if (score >= PASS_SCORE) {
      go('financials');
    } else {
      // Teach-and-retake, never a dead end.
      setScore(0);
      setQuestionIndex(0);
      go('quiz');
    }
  };

  const quizFinishedFailing =
    questionIndex + 1 === QUIZ_QUESTIONS.length && picked !== null && score < PASS_SCORE;

  const annualLimit =
    incomeBand !== null && netWorthBand !== null
      ? computeInvestmentLimit(INCOME_BANDS[incomeBand].value, NET_WORTH_BANDS[netWorthBand].value)
      : null;

  const finish = () => {
    if (annualLimit === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Residence drives the regulatory regime (and default currency).
    setJurisdiction(regimeForCountry(country));
    completeOnboarding({
      fullName: fullName.trim() || 'UniVest Investor',
      country,
      quizScore: score,
      annualLimit,
    });
  };

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.brand}>UNIVEST</Text>

        {step === 'welcome' && (
          <>
            <Text style={s.title}>Own the future{'\n'}the labs are building.</Text>
            <Text style={s.lede}>
              Equity in deep-tech spinouts from the world's leading research universities — from
              $100, inside a structure built for trust: verified milestones, one clean SPV, and a
              regulated secondary market.
            </Text>
            <View style={s.welcomeSteps}>
              <WelcomeStep n="01" label="Verify your identity" />
              <WelcomeStep n="02" label="Show us you know the risks" />
              <WelcomeStep n="03" label="Receive your annual investment limit" />
            </View>
            <Pressable style={s.cta} onPress={() => go('identity')} accessibilityRole="button">
              <Text style={s.ctaText}>Begin Verification</Text>
            </Pressable>
            <Pressable style={s.skip} onPress={skipOnboarding} accessibilityRole="button">
              <Text style={s.skipText}>Browse offerings first</Text>
            </Pressable>
          </>
        )}

        {step === 'identity' && (
          <>
            <Text style={s.stepLabel}>STEP 1 OF 3 — IDENTITY</Text>
            <Text style={s.title}>Who is investing?</Text>
            <Text style={s.lede}>
              Verification is performed by our identity partner. UniVest never stores your
              documents — only the verified outcome.
            </Text>
            <Text style={s.fieldLabel}>LEGAL NAME</Text>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="As it appears on your ID"
              placeholderTextColor={palette.onNavyMuted}
              autoCapitalize="words"
              accessibilityLabel="Legal name"
            />
            <Text style={s.fieldLabel}>COUNTRY OF RESIDENCE</Text>
            <View style={s.bandRow}>
              {COUNTRIES.map((cc) => (
                <Pressable
                  key={cc}
                  style={[s.band, country === cc && s.bandActive]}
                  onPress={() => setCountry(cc)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: country === cc }}
                >
                  <Text style={[s.bandText, country === cc && s.bandTextActive]}>{cc}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[s.cta, fullName.trim().length < 3 && s.ctaDisabled]}
              disabled={fullName.trim().length < 3}
              onPress={() => go('verifying')}
              accessibilityRole="button"
            >
              <Text style={s.ctaText}>Verify with ID + Liveness Check</Text>
            </Pressable>
            <Text style={s.footnote}>Powered by Persona · AML watchlist screening included</Text>
          </>
        )}

        {step === 'verifying' && (
          <View style={s.verifying}>
            <ActivityIndicator size="large" color={palette.gold} />
            <Text style={s.verifyingText}>Verifying identity…</Text>
            <Text style={s.footnote}>Document check · liveness · watchlist screening</Text>
          </View>
        )}

        {step === 'quiz' && (
          <>
            <Text style={s.stepLabel}>
              STEP 2 OF 3 — SUITABILITY · {questionIndex + 1}/{QUIZ_QUESTIONS.length}
            </Text>
            <ProgressBar
              progress={(questionIndex + (picked !== null ? 1 : 0)) / QUIZ_QUESTIONS.length}
              height={3}
              fillColor={palette.gold}
              trackColor="rgba(255,255,255,0.14)"
            />
            <Text style={s.question}>{question.prompt}</Text>
            {question.options.map((option, i) => {
              const isPicked = picked === i;
              const isCorrect = picked !== null && i === question.correctIndex;
              return (
                <Pressable
                  key={option}
                  style={[s.option, isCorrect && s.optionCorrect, isPicked && !isCorrect && s.optionWrong]}
                  onPress={() => answer(i)}
                  disabled={picked !== null}
                  accessibilityRole="button"
                >
                  <Text style={s.optionText}>{option}</Text>
                </Pressable>
              );
            })}
            {picked !== null && (
              <>
                <Text style={s.explanation}>{question.explanation}</Text>
                <Pressable style={s.cta} onPress={nextQuestion} accessibilityRole="button">
                  <Text style={s.ctaText}>
                    {quizFinishedFailing
                      ? 'Review & Retake'
                      : questionIndex + 1 === QUIZ_QUESTIONS.length
                        ? 'See Results'
                        : 'Continue'}
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {step === 'financials' && (
          <>
            <Text style={s.stepLabel}>STEP 3 OF 3 — YOUR LIMIT</Text>
            <Text style={s.title}>Set your annual limit</Text>
            <Text style={s.lede}>
              Reg CF caps what retail investors may commit per year, based on income and net
              worth. Self-reported; bands are enough.
            </Text>
            <Text style={s.fieldLabel}>ANNUAL INCOME</Text>
            <View style={s.bandRow}>
              {INCOME_BANDS.map((band, i) => (
                <Pressable
                  key={band.label}
                  style={[s.band, incomeBand === i && s.bandActive]}
                  onPress={() => setIncomeBand(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: incomeBand === i }}
                >
                  <Text style={[s.bandText, incomeBand === i && s.bandTextActive]}>{band.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.fieldLabel}>NET WORTH (EXCL. PRIMARY RESIDENCE)</Text>
            <View style={s.bandRow}>
              {NET_WORTH_BANDS.map((band, i) => (
                <Pressable
                  key={band.label}
                  style={[s.band, netWorthBand === i && s.bandActive]}
                  onPress={() => setNetWorthBand(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: netWorthBand === i }}
                >
                  <Text style={[s.bandText, netWorthBand === i && s.bandTextActive]}>{band.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[s.cta, annualLimit === null && s.ctaDisabled]}
              disabled={annualLimit === null}
              onPress={() => go('result')}
              accessibilityRole="button"
            >
              <Text style={s.ctaText}>Compute My Limit</Text>
            </Pressable>
          </>
        )}

        {step === 'result' && annualLimit !== null && (
          <>
            <Text style={s.stepLabel}>INVESTOR PROFILE</Text>
            <Text style={s.title}>Welcome, {fullName.trim().split(' ')[0] || 'Investor'}.</Text>
            <View style={s.limitCard}>
              <Text style={s.limitValue}>{formatMoney(annualLimit)}</Text>
              <Text style={s.limitLabel}>ANNUAL INVESTMENT LIMIT · REG CF</Text>
            </View>
            <ResultRow label="Identity" value="Verified ✦" />
            <ResultRow label="Suitability quiz" value={`${score}/${QUIZ_QUESTIONS.length} — passed`} />
            <ResultRow label="Residence" value={country} />
            <ResultRow
              label="Regime"
              value={`${resolveRegime(regimeForCountry(country)).framework} (${resolveRegime(regimeForCountry(country)).regulator})`}
            />
            <Text style={s.footnote}>
              Your limit refreshes on a rolling 12-month basis and gates every commitment,
              auto-invest allocation, and auction bid.
            </Text>
            <Pressable style={s.cta} onPress={finish} accessibilityRole="button">
              <Text style={s.ctaText}>Enter UniVest</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );

  function WelcomeStep({ n, label }: { n: string; label: string }) {
    return (
      <View style={s.welcomeStep}>
        <Text style={s.welcomeStepN}>{n}</Text>
        <Text style={s.welcomeStepLabel}>{label}</Text>
      </View>
    );
  }

  function ResultRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={s.resultRow}>
        <Text style={s.resultLabel}>{label}</Text>
        <Text style={s.resultValue}>{value}</Text>
      </View>
    );
  }
}

const makeStyles = (c: Palette) => {
  const T = typeStyles(c);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.navy },
    content: {
      paddingHorizontal: space.lg,
      paddingTop: space.xxl + space.md,
      paddingBottom: space.xxl,
    },
    brand: { fontFamily: font.sans, fontSize: 11, letterSpacing: 4, color: c.gold, marginBottom: space.xl },

    title: { fontFamily: font.serif, fontSize: 30, lineHeight: 40, color: c.onNavy, marginBottom: space.md },
    lede: {
      fontFamily: font.sans,
      fontSize: 14,
      lineHeight: 22,
      color: c.onNavyMuted,
      marginBottom: space.lg,
    },
    stepLabel: {
      fontFamily: font.sans,
      fontSize: 10,
      letterSpacing: 1.6,
      color: c.gold,
      marginBottom: space.md,
    },

    welcomeSteps: { marginBottom: space.xl },
    welcomeStep: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairlineOnNavy,
      paddingVertical: space.md,
    },
    welcomeStepN: { fontFamily: font.serif, fontSize: 16, color: c.bronze, width: 40 },
    welcomeStepLabel: { fontFamily: font.sans, fontSize: 14, color: c.onNavy },

    cta: {
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 15,
      marginTop: space.lg,
    },
    ctaDisabled: { opacity: 0.35 },
    ctaText: { fontFamily: font.sans, fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: '#0A192F' },
    skip: { alignItems: 'center', marginTop: space.md, padding: space.sm },
    skipText: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted },
    footnote: {
      fontFamily: font.sans,
      fontSize: 11,
      color: c.onNavyMuted,
      textAlign: 'center',
      marginTop: space.md,
    },

    fieldLabel: {
      fontFamily: font.sans,
      fontSize: 10,
      letterSpacing: 1.2,
      color: c.onNavyMuted,
      marginTop: space.md,
      marginBottom: space.sm,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairlineOnNavy,
      borderRadius: radius.sm,
      backgroundColor: 'rgba(255,255,255,0.06)',
      color: c.onNavy,
      fontFamily: font.sans,
      fontSize: 15,
      paddingHorizontal: space.md,
      paddingVertical: 12,
    },
    bandRow: { flexDirection: 'row', flexWrap: 'wrap' },
    band: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairlineOnNavy,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: 9,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    bandActive: { borderColor: c.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
    bandText: { fontFamily: font.sans, fontSize: 12, color: c.onNavyMuted },
    bandTextActive: { color: c.gold, fontWeight: '600' },

    verifying: { alignItems: 'center', paddingVertical: space.xxl * 2 },
    verifyingText: { fontFamily: font.serif, fontSize: 20, color: c.onNavy, marginTop: space.lg },

    question: {
      fontFamily: font.serif,
      fontSize: 21,
      lineHeight: 29,
      color: c.onNavy,
      marginTop: space.lg,
      marginBottom: space.md,
    },
    option: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairlineOnNavy,
      borderRadius: radius.sm,
      padding: space.md,
      marginBottom: space.sm,
    },
    optionCorrect: { borderColor: c.emerald, backgroundColor: 'rgba(47,169,124,0.12)' },
    optionWrong: { borderColor: c.danger, backgroundColor: 'rgba(192,91,91,0.10)' },
    optionText: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: c.onNavy },
    explanation: {
      fontFamily: font.sans,
      fontSize: 13,
      lineHeight: 20,
      color: c.onNavyMuted,
      marginTop: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: c.gold,
      paddingLeft: space.md,
    },

    limitCard: {
      borderWidth: 1,
      borderColor: c.gold,
      borderRadius: radius.md,
      alignItems: 'center',
      paddingVertical: space.lg,
      marginBottom: space.lg,
    },
    limitValue: { fontFamily: font.serif, fontSize: 40, color: c.gold },
    limitLabel: {
      fontFamily: font.sans,
      fontSize: 10,
      letterSpacing: 1.6,
      color: c.onNavyMuted,
      marginTop: space.xs,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairlineOnNavy,
      paddingVertical: space.md,
    },
    resultLabel: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted },
    resultValue: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.onNavy },
  });
};
