import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { STARTUPS } from '../data/mock';
import {
  ANGEL_MIN_TICKET,
  DEFAULT_LEAD_CARRY,
  clampCarry,
  leadEconomics,
} from '../utils/angel';
import { formatMoney, formatMoneyCompact } from '../utils/format';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeContext';

interface Props {
  onClose: () => void;
}

const STORAGE_KEY = 'univest.angel.v1';
const COMMIT_PRESETS = [50_000, 100_000, 250_000, 500_000];
const TICKET_PRESETS = [5_000, 10_000, 25_000, 50_000];
const EXIT_MULTIPLES = [2, 3, 5];

interface AngelState {
  applied: boolean;
  accredited: boolean;
  thesis: string;
  committed: number;
}
const DEFAULT_STATE: AngelState = { applied: false, accredited: false, thesis: '', committed: 100_000 };

/** Deals shown as angel-only early access — the newest global spinouts. */
const EARLY_ACCESS = STARTUPS.filter((s) => ['s6', 's11', 's10'].includes(s.id));

/**
 * Angel investors — an accredited persona distinct from retail crowdfunding.
 * Angels self-certify accreditation, unlock early access to deals before they
 * open to the public, and can lead an SPV: commit capital and take carry on the
 * profit they help raise. The real API lives at backend/api/src/angel.
 */
export function AngelScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const [state, setState] = useState<AngelState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [ticket, setTicket] = useState(10_000);
  const [carry, setCarry] = useState(DEFAULT_LEAD_CARRY);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) }); })
      .finally(() => setHydrated(true));
  }, []);

  const persist = (next: AngelState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const active = state.applied && state.accredited;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close angels">
          <Text style={s.back}>← Tools</Text>
        </Pressable>
        <Text style={s.title}>Angel Investors</Text>
        <Text style={s.subtitle}>
          Early access before the public raise · lead an SPV · earn carry on what you help raise.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {!hydrated ? null : !active ? (
          <ApplyFlow state={state} onApply={persist} styles={s} />
        ) : (
          <>
            <StatusCard state={state} styles={s} />
            <Text style={s.sectionLabel}>EARLY-ACCESS DEAL FLOW</Text>
            {EARLY_ACCESS.map((d) => {
              const isOpen = leadId === d.id;
              const remaining = Math.max(0, d.targetAmount - d.raisedAmount);
              const econ = leadEconomics(ticket, remaining, carry, 3);
              return (
                <View key={d.id} style={s.deal}>
                  <View style={s.dealTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dealName}>{d.name}</Text>
                      <Text style={s.dealMeta}>{d.vertical} · {d.university.shortName} · {d.university.country}</Text>
                    </View>
                    <View style={s.preBadge}><Text style={s.preBadgeText}>PRE-PUBLIC</Text></View>
                  </View>
                  <Text style={s.dealTag}>{d.tagline}</Text>
                  <View style={s.dealStats}>
                    <Text style={s.dealStat}>Target {formatMoneyCompact(d.targetAmount)}</Text>
                    <Text style={s.dealStat}>Allocation open {formatMoneyCompact(remaining)}</Text>
                  </View>
                  <Pressable
                    style={[s.leadBtn, isOpen && s.leadBtnOpen]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setLeadId(isOpen ? null : d.id);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={[s.leadBtnText, isOpen && s.leadBtnTextOpen]}>
                      {isOpen ? 'Close' : 'Lead this deal →'}
                    </Text>
                  </Pressable>

                  {isOpen && (
                    <View style={s.leadPanel}>
                      <Text style={s.panelLabel}>YOUR TICKET</Text>
                      <View style={s.chipRow}>
                        {TICKET_PRESETS.map((v) => (
                          <Chip key={v} label={formatMoneyCompact(v)} active={ticket === v} onPress={() => setTicket(v)} styles={s} />
                        ))}
                      </View>
                      <Text style={s.panelLabel}>YOUR CARRY ON FOLLOWERS' PROFIT</Text>
                      <View style={s.stepper}>
                        <Stepper onPress={() => setCarry((c) => clampCarry(c - 5))} label="−" styles={s} />
                        <Text style={s.carryValue}>{carry}%</Text>
                        <Stepper onPress={() => setCarry((c) => clampCarry(c + 5))} label="+" styles={s} />
                        {ticket < ANGEL_MIN_TICKET && (
                          <Text style={s.minNote}>min {formatMoney(ANGEL_MIN_TICKET)}</Text>
                        )}
                      </View>

                      <Text style={s.panelLabel}>IF THIS DEAL EXITS AT…</Text>
                      <View style={s.previewHead}>
                        <Text style={[s.previewCell, s.previewHeadText, { flex: 0.6 }]}>Multiple</Text>
                        <Text style={[s.previewCell, s.previewHeadText]}>Your stake</Text>
                        <Text style={[s.previewCell, s.previewHeadText]}>Carry</Text>
                        <Text style={[s.previewCell, s.previewHeadText]}>Total to you</Text>
                      </View>
                      {EXIT_MULTIPLES.map((m) => {
                        const e = leadEconomics(ticket, remaining, carry, m);
                        return (
                          <View key={m} style={s.previewRow}>
                            <Text style={[s.previewCell, s.previewMult, { flex: 0.6 }]}>{m}×</Text>
                            <Text style={s.previewCell}>{formatMoneyCompact(e.ownReturn)}</Text>
                            <Text style={[s.previewCell, s.previewGold]}>{formatMoneyCompact(e.carryEarned)}</Text>
                            <Text style={[s.previewCell, s.previewTotal]}>{formatMoneyCompact(e.totalToLead)}</Text>
                          </View>
                        );
                      })}
                      <Text style={s.previewNote}>
                        Carry accrues on the {formatMoneyCompact(remaining)} you help raise. At 3× that's{' '}
                        {formatMoney(econ.carryEarned)} on top of your own {formatMoney(econ.ownReturn)}.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={s.card}>
              <Text style={s.overline}>The moat</Text>
              <Text style={s.body}>
                Angels bring better deals and deeper capital. Every lead position turns a
                crowdfunding audience into a two-sided marketplace — supply and demand — built on the
                accreditation and carry rails already in the platform.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ApplyFlow({
  state,
  onApply,
  styles: s,
}: {
  state: AngelState;
  onApply: (next: AngelState) => void;
  styles: any;
}) {
  const [accredited, setAccredited] = useState(state.accredited);
  const [committed, setCommitted] = useState(state.committed);
  const [thesis, setThesis] = useState(state.thesis);

  return (
    <>
      <View style={s.heroCard}>
        <Text style={s.heroOverline}>WHY GO ANGEL</Text>
        <Row styles={s} k="Early access" v="See deals before the public raise opens" />
        <Row styles={s} k="Lead an SPV" v="Set the allocation and terms of a round" />
        <Row styles={s} k="Earn carry" v="Take a share of the profit you help raise" />
        <Row styles={s} k="Office hours" v="Direct time with founders you back" />
      </View>

      <View style={s.card}>
        <Text style={s.overline}>Accreditation</Text>
        <Text style={s.body}>
          Angel access requires accredited standing. Self-certify below; production verifies against
          your KYC provider before activating.
        </Text>
        <Pressable
          style={s.certRow}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); setAccredited((a) => !a); }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accredited }}
        >
          <View style={[s.checkbox, accredited && s.checkboxOn]}>
            {accredited && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.certText}>I certify I am an accredited investor.</Text>
        </Pressable>
      </View>

      <View style={s.card}>
        <Text style={s.overline}>Capital you plan to deploy</Text>
        <View style={s.chipRow}>
          {COMMIT_PRESETS.map((v) => (
            <Chip key={v} label={formatMoneyCompact(v)} active={committed === v} onPress={() => setCommitted(v)} styles={s} />
          ))}
        </View>
        <Text style={[s.overline, { marginTop: space.md }]}>Your thesis (optional)</Text>
        <TextInput
          style={s.input}
          value={thesis}
          onChangeText={setThesis}
          placeholder="e.g. Deep-tech with attested lab milestones"
          placeholderTextColor="#8B97A6"
          multiline
          accessibilityLabel="Investment thesis"
        />
      </View>

      <Pressable
        style={s.cta}
        onPress={() => {
          Haptics.notificationAsync(
            accredited ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
          ).catch(() => {});
          onApply({ applied: true, accredited, committed, thesis });
        }}
        accessibilityRole="button"
      >
        <Text style={s.ctaText}>{accredited ? 'Activate angel access' : 'Apply (pending verification)'}</Text>
      </Pressable>
      {state.applied && !state.accredited && !accredited && (
        <Text style={s.pendingNote}>
          Your application is pending accreditation. Certify above to activate early access and
          lead positions.
        </Text>
      )}
    </>
  );
}

function StatusCard({ state, styles: s }: { state: AngelState; styles: any }) {
  return (
    <View style={s.statusCard}>
      <View style={s.statusTop}>
        <Text style={s.statusBrand}>UNIVEST · ANGEL</Text>
        <View style={s.accBadge}><Text style={s.accBadgeText}>ACCREDITED ✓</Text></View>
      </View>
      <Text style={s.statusCommit}>{formatMoney(state.committed)}</Text>
      <Text style={s.statusCommitLabel}>COMMITTED CAPITAL</Text>
      {!!state.thesis && <Text style={s.statusThesis}>“{state.thesis}”</Text>}
    </View>
  );
}

function Row({ k, v, styles: s }: { k: string; v: string; styles: any }) {
  return (
    <View style={s.row}>
      <Text style={s.rowK}>{k}</Text>
      <Text style={s.rowV}>{v}</Text>
    </View>
  );
}

function Chip({ label, active, onPress, styles: s }: { label: string; active: boolean; onPress: () => void; styles: any }) {
  return (
    <Pressable style={[s.chip, active && s.chipActive]} onPress={onPress} accessibilityRole="button">
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, onPress, styles: s }: { label: string; onPress: () => void; styles: any }) {
  return (
    <Pressable style={s.stepBtn} onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }} accessibilityRole="button" accessibilityLabel={label === '+' ? 'Increase carry' : 'Decrease carry'}>
      <Text style={s.stepBtnText}>{label}</Text>
    </Pressable>
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
    sectionLabel: { fontFamily: font.sans, fontSize: 10, letterSpacing: 1.4, color: c.inkFaint, marginTop: space.sm, marginBottom: space.sm },

    heroCard: {
      backgroundColor: c.navy, borderRadius: radius.lg, borderWidth: 1, borderColor: c.gold,
      padding: space.lg, marginBottom: space.md,
    },
    heroOverline: { fontFamily: font.sans, fontSize: 9, letterSpacing: 2, color: c.gold, marginBottom: space.sm },
    row: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
    rowK: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', color: '#F5F7FA', width: 108 },
    rowV: { fontFamily: font.sans, fontSize: 13, color: 'rgba(245,247,250,0.72)', flex: 1 },

    card: {
      backgroundColor: c.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline, padding: space.lg, marginBottom: space.md,
    },
    overline: { ...T.overline, marginBottom: space.sm },
    body: { ...T.body, fontSize: 13, lineHeight: 21, color: c.inkMuted },

    certRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
    checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: c.gold, alignItems: 'center', justifyContent: 'center', marginRight: space.sm },
    checkboxOn: { backgroundColor: c.gold },
    checkmark: { color: '#0A192F', fontSize: 14, fontWeight: '800' },
    certText: { ...T.body, fontSize: 13, color: c.ink, flex: 1 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, backgroundColor: c.surfaceMuted },
    chipActive: { backgroundColor: c.navy, borderColor: c.navy },
    chipText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.inkMuted },
    chipTextActive: { color: c.gold },

    input: {
      marginTop: space.sm, minHeight: 60, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline, backgroundColor: c.surfaceMuted, padding: space.md,
      fontFamily: font.sans, fontSize: 13, color: c.ink, textAlignVertical: 'top',
    },

    cta: { backgroundColor: c.gold, borderRadius: radius.sm, alignItems: 'center', paddingVertical: 14, marginBottom: space.sm },
    ctaText: { fontFamily: font.sans, fontSize: 14, fontWeight: '700', letterSpacing: 0.3, color: '#0A192F' },
    pendingNote: { ...T.caption, fontSize: 12, lineHeight: 17, color: c.inkMuted, marginBottom: space.md },

    // Status card
    statusCard: { backgroundColor: c.navy, borderRadius: radius.lg, borderWidth: 1, borderColor: c.gold, padding: space.lg, marginBottom: space.md },
    statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBrand: { fontFamily: font.sans, fontSize: 9, letterSpacing: 2, color: c.gold },
    accBadge: { borderWidth: 1, borderColor: c.gold, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 7 },
    accBadgeText: { fontFamily: font.sans, fontSize: 9, letterSpacing: 0.6, fontWeight: '700', color: c.gold },
    statusCommit: { fontFamily: font.serif, fontSize: 30, color: '#F5F7FA', marginTop: space.md, ...tabularNums },
    statusCommitLabel: { fontFamily: font.sans, fontSize: 9, letterSpacing: 1.2, color: 'rgba(245,247,250,0.5)' },
    statusThesis: { fontFamily: font.serif, fontSize: 14, fontStyle: 'italic', color: 'rgba(245,247,250,0.8)', marginTop: space.md },

    // Deal cards
    deal: { backgroundColor: c.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, padding: space.lg, marginBottom: space.md },
    dealTop: { flexDirection: 'row', alignItems: 'flex-start' },
    dealName: { fontFamily: font.serif, fontSize: 18, color: c.ink },
    dealMeta: { fontFamily: font.sans, fontSize: 11, color: c.inkFaint, marginTop: 2 },
    preBadge: { backgroundColor: c.gold, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 7 },
    preBadgeText: { fontFamily: font.sans, fontSize: 9, letterSpacing: 0.8, fontWeight: '800', color: '#0A192F' },
    dealTag: { ...T.body, fontSize: 13, color: c.inkMuted, marginTop: space.sm },
    dealStats: { flexDirection: 'row', gap: space.lg, marginTop: space.sm },
    dealStat: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    leadBtn: { marginTop: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: c.gold, alignItems: 'center', paddingVertical: 10 },
    leadBtnOpen: { backgroundColor: 'transparent', borderColor: c.hairline },
    leadBtnText: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', color: c.gold },
    leadBtnTextOpen: { color: c.inkFaint },

    leadPanel: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline },
    panelLabel: { fontFamily: font.sans, fontSize: 10, letterSpacing: 1, color: c.inkFaint, marginBottom: space.sm, marginTop: space.sm },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    stepBtn: { width: 40, height: 36, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceMuted },
    stepBtnText: { fontFamily: font.sans, fontSize: 20, color: c.ink },
    carryValue: { fontFamily: font.serif, fontSize: 22, color: c.gold, minWidth: 60, textAlign: 'center', ...tabularNums },
    minNote: { fontFamily: font.sans, fontSize: 11, color: c.danger },

    previewHead: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hairline },
    previewHeadText: { fontFamily: font.sans, fontSize: 9, letterSpacing: 0.5, color: c.inkFaint, textTransform: 'uppercase' },
    previewRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hairline },
    previewCell: { flex: 1, fontFamily: font.sans, fontSize: 13, color: c.inkMuted, textAlign: 'right', ...tabularNums },
    previewMult: { fontFamily: font.serif, color: c.ink, textAlign: 'left' },
    previewGold: { color: c.bronze, fontWeight: '600' },
    previewTotal: { color: c.ink, fontWeight: '700' },
    previewNote: { ...T.caption, fontSize: 11, lineHeight: 16, color: c.inkMuted, marginTop: space.sm },
  });
};
