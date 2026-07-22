import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { STARTUPS } from '../data/mock';
import { CONSORTIA, MIT_PORTFOLIO } from '../data/university';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { formatMoney, formatMoneyCompact } from '../utils/format';
import {
  consortiumTotalCommitted,
  portfolioByVertical,
  portfolioStats,
} from '../utils/tto';

const QUIET_EASE = LayoutAnimation.create(
  240,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

type Section = 'portfolio' | 'launch' | 'milestones' | 'attest' | 'consortia';

/** Demo signing identity — production keys live in the officer's secure enclave. */
const OFFICER = { name: 'K. Brennan', org: 'MIT Technology Licensing Office', keyId: '8F3A·22C1' };

interface Props {
  onClose: () => void;
}

/**
 * University Portal — the supply-side operating system. Five flows:
 *   Portfolio  — the TTO's whole spinout book (on- and off-platform), cap
 *                tables, and an LP/stakeholder report — the lock-in surface
 *   Launch     — click-and-agree standardized deal templates (USIT / US-BOLT)
 *   Updates    — milestone composer with micro-video attach
 *   Attest     — review evidence and sign milestones with the registered key
 *   Consortia  — cross-university co-sponsored vehicles
 */
export function TTOPortalScreen({ onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const [section, setSection] = useState<Section>('portfolio');

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close university portal">
          <Text style={s.back}>← Tools</Text>
        </Pressable>
        <Text style={s.title}>University OS</Text>
        <Text style={s.subtitle}>
          {OFFICER.name} · {OFFICER.org} · signing key {OFFICER.keyId}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.sectionTabs}
          contentContainerStyle={s.sectionTabsContent}
        >
          {(
            [
              ['portfolio', 'Portfolio'],
              ['launch', 'Launch'],
              ['milestones', 'Updates'],
              ['attest', 'Attest'],
              ['consortia', 'Consortia'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[s.sectionTab, section === key && s.sectionTabActive]}
              onPress={() => {
                LayoutAnimation.configureNext(QUIET_EASE);
                setSection(key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === key }}
            >
              <Text style={[s.sectionTabText, section === key && s.sectionTabTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {section === 'portfolio' && <PortfolioDesk />}
        {section === 'launch' && <LaunchWizard />}
        {section === 'milestones' && <MilestoneComposer />}
        {section === 'attest' && <AttestationDesk />}
        {section === 'consortia' && <ConsortiaDesk />}
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 0) Portfolio Desk — the whole spinout book + LP/stakeholder report
// ----------------------------------------------------------------------------
function PortfolioDesk() {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const stats = useMemo(() => portfolioStats(MIT_PORTFOLIO), []);
  const byVertical = useMemo(() => portfolioByVertical(MIT_PORTFOLIO), []);
  const [reportOut, setReportOut] = useState(false);

  return (
    <>
      <View style={s.card}>
        <Text style={s.overline}>Portfolio Overview</Text>
        <Text style={s.hint}>
          Every spinout the office holds a stake in — including {stats.offPlatform} tracked
          off-platform. Your whole book, one dashboard.
        </Text>
        <View style={s.statGrid}>
          <Stat label="Spinouts" value={String(stats.count)} sub={`${stats.onPlatform} on UniVest`} s={s} />
          <Stat label="University equity" value={formatMoneyCompact(stats.universityEquityValue)} sub="post-money value" gold s={s} />
          <Stat label="Portfolio value" value={formatMoneyCompact(stats.portfolioValue)} sub="aggregate post-money" s={s} />
          <Stat label="Avg progress" value={`${Math.round(stats.avgProgress * 100)}%`} sub="milestones complete" s={s} />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.overline}>LP / Stakeholder Report</Text>
        <Text style={s.hint}>
          Board- and LP-ready snapshot generated from the live portfolio.
        </Text>
        <View style={s.reportRow}>
          <Text style={s.reportLabel}>University equity value</Text>
          <Text style={s.reportValue}>{formatMoney(stats.universityEquityValue)}</Text>
        </View>
        <View style={s.reportRow}>
          <Text style={s.reportLabel}>Capital raised (all spinouts)</Text>
          <Text style={s.reportValue}>{formatMoney(stats.totalRaised)}</Text>
        </View>
        <View style={s.reportRow}>
          <Text style={s.reportLabel}>Milestones completed</Text>
          <Text style={s.reportValue}>{stats.milestonesCompleted}</Text>
        </View>
        <Text style={s.groupTitle}>EXPOSURE BY VERTICAL</Text>
        <View style={s.stackBar}>
          {byVertical.map((v, i) => (
            <View
              key={v.vertical}
              style={[
                s.segment,
                {
                  flex: Math.max(v.weight, 0.001),
                  backgroundColor: palette.chartCategorical[i % palette.chartCategorical.length],
                  marginLeft: i === 0 ? 0 : 2,
                },
              ]}
            />
          ))}
        </View>
        {byVertical.map((v, i) => (
          <View key={v.vertical} style={s.legendRow}>
            <View style={[s.swatch, { backgroundColor: palette.chartCategorical[i % palette.chartCategorical.length] }]} />
            <Text style={s.legendLabel}>{v.vertical}</Text>
            <Text style={s.legendValue}>{Math.round(v.weight * 100)}%</Text>
          </View>
        ))}
        <Pressable
          style={s.cta}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            LayoutAnimation.configureNext(QUIET_EASE);
            setReportOut(true);
          }}
          accessibilityRole="button"
        >
          <Text style={s.ctaText}>{reportOut ? '✓ Report Exported (PDF)' : 'Export Quarterly Report'}</Text>
        </Pressable>
      </View>

      <View style={s.card}>
        <Text style={s.overline}>Spinout Cap Tables</Text>
        {MIT_PORTFOLIO.map((h, i) => (
          <View key={h.id} style={[s.holding, i === MIT_PORTFOLIO.length - 1 && s.holdingLast]}>
            <View style={s.holdingHeader}>
              <View style={s.holdingLeft}>
                <Text style={s.holdingName}>{h.name}</Text>
                <Text style={s.holdingMeta}>
                  {h.vertical} · {h.stage}
                </Text>
              </View>
              <View style={[s.platformChip, h.onPlatform ? s.platformOn : s.platformOff]}>
                <Text style={[s.platformText, h.onPlatform ? s.platformTextOn : s.platformTextOff]}>
                  {h.onPlatform ? 'UNIVEST' : 'TRACKED'}
                </Text>
              </View>
            </View>
            {/* Cap-table bar: university stake highlighted in gold */}
            <View style={s.capBar}>
              {(
                [
                  ['founders', h.capTable.founders, palette.chartCategorical[0]],
                  ['university', h.capTable.university, palette.gold],
                  ['optionPool', h.capTable.optionPool, palette.chartCategorical[2]],
                  ['investors', h.capTable.investors, palette.chartCategorical[3]],
                ] as const
              ).map(([k, pct, color], j) => (
                <View
                  key={k}
                  style={[s.capSeg, { flex: Math.max(pct, 0.001), backgroundColor: color, marginLeft: j === 0 ? 0 : 2 }]}
                />
              ))}
            </View>
            <View style={s.holdingFooter}>
              <Text style={s.holdingUni}>University {h.capTable.university}%</Text>
              <Text style={s.holdingNext}>
                {h.milestonesCompleted}/{h.milestonesTotal} · next: {h.nextMilestone}
              </Text>
            </View>
          </View>
        ))}
        <Text style={s.footnote}>
          Off-platform spinouts are tracked here even though they didn't raise on UniVest — the
          office runs its whole portfolio from one place.
        </Text>
      </View>
    </>
  );
}

// ----------------------------------------------------------------------------
// Cross-university consortia
// ----------------------------------------------------------------------------
function ConsortiaDesk() {
  const s = useThemedStyles(makeStyles);
  const total = useMemo(() => consortiumTotalCommitted(CONSORTIA), []);
  const [proposed, setProposed] = useState(false);

  return (
    <>
      <View style={s.card}>
        <Text style={s.overline}>Cross-University Consortia</Text>
        <Text style={s.hint}>
          Themed vehicles co-sponsored by multiple universities — shared deal flow, standardized
          terms, pooled capital. {formatMoneyCompact(total)} committed across{' '}
          {CONSORTIA.length} vehicles.
        </Text>
      </View>

      {CONSORTIA.map((c) => (
        <View key={c.id} style={s.card}>
          <View style={s.consortiumHeader}>
            <Text style={s.consortiumName}>{c.name}</Text>
            {c.leadUniversity === OFFICER.org.split(' ')[0] || c.leadUniversity === 'MIT' ? (
              <View style={s.leadChip}>
                <Text style={s.leadText}>{c.leadUniversity === 'MIT' ? 'YOU LEAD' : 'LEAD'}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.consortiumThesis}>{c.thesis}</Text>
          <View style={s.memberRow}>
            {c.members.map((m) => (
              <View key={m} style={[s.memberChip, m === 'MIT' && s.memberChipYou]}>
                <Text style={[s.memberText, m === 'MIT' && s.memberTextYou]}>{m}</Text>
              </View>
            ))}
          </View>
          <View style={s.consortiumStats}>
            <View style={s.consortiumStat}>
              <Text style={s.consortiumStatValue}>{formatMoneyCompact(c.committedCapital)}</Text>
              <Text style={s.consortiumStatLabel}>Committed</Text>
            </View>
            <View style={s.consortiumStat}>
              <Text style={s.consortiumStatValue}>{c.deals}</Text>
              <Text style={s.consortiumStatLabel}>Deals</Text>
            </View>
            <View style={s.consortiumStat}>
              <Text style={s.consortiumStatValue}>{c.members.length}</Text>
              <Text style={s.consortiumStatLabel}>Universities</Text>
            </View>
          </View>
        </View>
      ))}

      <Pressable
        style={[s.card, s.proposeCard]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          LayoutAnimation.configureNext(QUIET_EASE);
          setProposed(true);
        }}
        accessibilityRole="button"
      >
        <Text style={s.proposeText}>
          {proposed ? '✓ Proposal drafted — invite co-sponsors' : '+ Propose a new consortium'}
        </Text>
      </Pressable>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  gold,
  s,
}: {
  label: string;
  value: string;
  sub: string;
  gold?: boolean;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.statCell}>
      <Text style={[s.statCellValue, gold && s.statCellValueGold]}>{value}</Text>
      <Text style={s.statCellLabel}>{label}</Text>
      <Text style={s.statCellSub}>{sub}</Text>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 1) Campaign Launch Wizard — click-and-agree standardized templates
// ----------------------------------------------------------------------------
const TEMPLATES = [
  {
    id: 'usit',
    name: 'USIT Guide',
    tagline: 'US university standard',
    terms: [
      'University equity capped at 10–25%, pre-cleared',
      'Exclusive license survives change of control',
      'No board seat; information rights only',
      'Anti-dilution: none (weighted-average on Series A)',
    ],
  },
  {
    id: 'us_bolt',
    name: 'US-BOLT',
    tagline: 'Bolt-on for quick spinouts',
    terms: [
      'Fixed 10% university equity, no negotiation',
      'Standard 1.5% royalty until $1M cumulative revenue',
      'Pre-agreed IP assignment schedule',
      '30-day launch guarantee from template acceptance',
    ],
  },
] as const;

const WIZARD_RAISES = [900_000, 1_800_000, 2_500_000, 3_200_000];
const WIZARD_EQUITY = [10, 15, 20, 25];

function LaunchWizard() {
  const s = useThemedStyles(makeStyles);
  const [template, setTemplate] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [raise, setRaise] = useState(1_800_000);
  const [equity, setEquity] = useState(15);
  const [submitted, setSubmitted] = useState(false);

  const chosen = TEMPLATES.find((t) => t.id === template);

  const submit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    LayoutAnimation.configureNext(QUIET_EASE);
    setSubmitted(true);
  };

  if (submitted && chosen) {
    return (
      <View style={s.card}>
        <Text style={s.successMark}>✦</Text>
        <Text style={s.cardTitle}>Submitted for platform review</Text>
        <Text style={s.hint}>
          {chosen.name} · raising {formatMoneyCompact(raise)} · {equity}% university equity. Legal
          review and SPV formation typically complete within 5 business days — no negotiation
          phase, that's the point.
        </Text>
        <Pressable
          style={s.ghostBtn}
          onPress={() => {
            LayoutAnimation.configureNext(QUIET_EASE);
            setSubmitted(false);
            setTemplate(null);
            setAgreed(false);
          }}
          accessibilityRole="button"
        >
          <Text style={s.ghostBtnText}>Start Another Raise</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={s.card}>
        <Text style={s.overline}>Step 1 — Deal Template</Text>
        <Text style={s.hint}>
          Pre-cleared, investor-friendly terms. Click-and-agree replaces months of negotiation.
        </Text>
        {TEMPLATES.map((t) => (
          <Pressable
            key={t.id}
            style={[s.template, template === t.id && s.templateActive]}
            onPress={() => {
              LayoutAnimation.configureNext(QUIET_EASE);
              setTemplate(t.id);
              setAgreed(false);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: template === t.id }}
          >
            <View style={s.templateHeader}>
              <Text style={s.templateName}>{t.name}</Text>
              <Text style={s.templateTagline}>{t.tagline}</Text>
            </View>
            {template === t.id &&
              t.terms.map((term) => (
                <Text key={term} style={s.termRow}>
                  · {term}
                </Text>
              ))}
          </Pressable>
        ))}
        {chosen && (
          <Pressable
            style={[s.agreeRow, agreed && s.agreeRowOn]}
            onPress={() => setAgreed(!agreed)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <Text style={[s.agreeBox, agreed && s.agreeBoxOn]}>{agreed ? '✓' : ''}</Text>
            <Text style={s.agreeText}>
              I accept the {chosen.name} terms on behalf of the university
            </Text>
          </Pressable>
        )}
      </View>

      {agreed && (
        <View style={s.card}>
          <Text style={s.overline}>Step 2 — Deal Economics</Text>
          <Text style={s.fieldLabel}>RAISE TARGET</Text>
          <View style={s.presetRow}>
            {WIZARD_RAISES.map((v) => (
              <Chip key={v} label={formatMoneyCompact(v)} active={raise === v} onPress={() => setRaise(v)} />
            ))}
          </View>
          <Text style={s.fieldLabel}>UNIVERSITY EQUITY (WITHIN TEMPLATE CAP)</Text>
          <View style={s.presetRow}>
            {WIZARD_EQUITY.map((v) => (
              <Chip key={v} label={`${v}%`} active={equity === v} onPress={() => setEquity(v)} />
            ))}
          </View>
          <Text style={s.hint}>
            Platform success fee: 6% of capital raised at close · investors pay a 1.5% SPV admin
            fee · the crowd arrives as one SPV line on the cap table.
          </Text>
          <Pressable style={s.cta} onPress={submit} accessibilityRole="button">
            <Text style={s.ctaText}>Submit Raise for Review</Text>
          </Pressable>
        </View>
      )}
    </>
  );

  function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable
        style={[s.chip, active && s.chipActive]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  }
}

// ----------------------------------------------------------------------------
// 2) Milestone Update Composer
// ----------------------------------------------------------------------------
function MilestoneComposer() {
  const s = useThemedStyles(makeStyles);
  const [startupId, setStartupId] = useState(STARTUPS[0].id);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [videoAttached, setVideoAttached] = useState(false);
  const [published, setPublished] = useState<string[]>([]);

  const startup = STARTUPS.find((st) => st.id === startupId)!;

  const publish = () => {
    if (title.trim().length < 4) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    LayoutAnimation.configureNext(QUIET_EASE);
    setPublished((cur) => [
      `${startup.name} — ${title.trim()}${videoAttached ? ' · 90s lab video' : ''}`,
      ...cur,
    ]);
    setTitle('');
    setNote('');
    setVideoAttached(false);
  };

  return (
    <View style={s.card}>
      <Text style={s.overline}>Milestone Update</Text>
      <Text style={s.hint}>
        Updates land on every investor's feed and advance the Lab Progress Bar. Attach a
        micro-video — updates with video see 3× engagement.
      </Text>

      <Text style={s.fieldLabel}>SPINOUT</Text>
      <View style={s.presetRow}>
        {STARTUPS.slice(0, 3).map((st) => (
          <Pressable
            key={st.id}
            style={[s.chip, startupId === st.id && s.chipActive]}
            onPress={() => setStartupId(st.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: startupId === st.id }}
          >
            <Text style={[s.chipText, startupId === st.id && s.chipTextActive]}>{st.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.fieldLabel}>MILESTONE</Text>
      <TextInput
        style={s.input}
        value={title}
        onChangeText={setTitle}
        placeholder='e.g. "First production coil shipped"'
        placeholderTextColor={s.placeholder.color}
        maxLength={80}
        accessibilityLabel="Milestone title"
      />
      <Text style={s.fieldLabel}>NOTE TO INVESTORS (OPTIONAL)</Text>
      <TextInput
        style={[s.input, s.inputMultiline]}
        value={note}
        onChangeText={setNote}
        placeholder="What was proven, and what it unlocks…"
        placeholderTextColor={s.placeholder.color}
        multiline
        maxLength={400}
        accessibilityLabel="Update note"
      />

      <Pressable
        style={[s.videoAttach, videoAttached && s.videoAttachOn]}
        onPress={() => setVideoAttached(!videoAttached)}
        accessibilityRole="button"
        accessibilityState={{ selected: videoAttached }}
      >
        <Text style={[s.videoAttachText, videoAttached && s.videoAttachTextOn]}>
          {videoAttached ? '▶ lab-update.mp4 · 90s attached ✓' : '+ Attach micro-video (≤90s)'}
        </Text>
      </Pressable>

      <Pressable
        style={[s.cta, title.trim().length < 4 && s.ctaDisabled]}
        disabled={title.trim().length < 4}
        onPress={publish}
        accessibilityRole="button"
      >
        <Text style={s.ctaText}>Publish to Investor Feeds</Text>
      </Pressable>

      {published.length > 0 && (
        <View style={s.publishedList}>
          <Text style={s.fieldLabel}>PUBLISHED THIS SESSION</Text>
          {published.map((p) => (
            <Text key={p} style={s.publishedRow}>
              ✓ {p}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------
// 3) Attestation Desk — review evidence, sign with the registered key
// ----------------------------------------------------------------------------

/** FNV-1a 32-bit — deterministic demo stand-in for the Ed25519 signature. */
function demoSignature(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const a = h.toString(16).padStart(8, '0');
  let h2 = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  const b = h2.toString(16).padStart(8, '0');
  return `${a}${b}`.toUpperCase();
}

function AttestationDesk() {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);

  // Completed milestones without an attestation, across the portfolio.
  const pending = useMemo(
    () =>
      STARTUPS.flatMap((st) =>
        st.milestones
          .filter((m) => m.status === 'completed' && !m.attestation)
          .map((m) => ({ startup: st, milestone: m, key: `${st.id}:${m.id}` })),
      ),
    [],
  );

  const sign = (key: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    LayoutAnimation.configureNext(QUIET_EASE);
    setSigned((cur) => ({ ...cur, [key]: demoSignature(key + OFFICER.keyId) }));
    setReviewing(null);
  };

  return (
    <View style={s.card}>
      <Text style={s.overline}>Attestation Desk</Text>
      <Text style={s.hint}>
        Completed milestones awaiting independent sign-off. Signing hashes the evidence bundle
        and records your Ed25519 signature against key {OFFICER.keyId} in the attestor registry
        — the stamp appears in every investor's milestone tracker.
      </Text>

      {pending.length === 0 && (
        <Text style={s.emptyText}>Nothing awaiting attestation — the portfolio is current.</Text>
      )}

      {pending.map(({ startup, milestone, key }) => {
        const signature = signed[key];
        const open = reviewing === key;
        return (
          <View key={key} style={s.attestRow}>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(QUIET_EASE);
                setReviewing(open ? null : key);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <View style={s.attestHeader}>
                <View style={s.attestLeft}>
                  <Text style={s.attestTitle}>{milestone.title}</Text>
                  <Text style={s.attestSub}>
                    {startup.name} · completed {milestone.date}
                  </Text>
                </View>
                {signature ? (
                  <Text style={s.signedMark}>✦ SIGNED</Text>
                ) : (
                  <Text style={s.pendingMark}>REVIEW</Text>
                )}
              </View>
            </Pressable>

            {open && !signature && (
              <View style={s.evidence}>
                <Text style={s.evidenceTitle}>Evidence bundle</Text>
                <Text style={s.evidenceRow}>· {milestone.description}</Text>
                <Text style={s.evidenceRow}>
                  · SHA-256: {demoSignature(milestone.id + startup.id).slice(0, 12)}… (3 files, 214 MB)
                </Text>
                <Pressable style={s.cta} onPress={() => sign(key)} accessibilityRole="button">
                  <Text style={s.ctaText}>
                    Sign as {OFFICER.name} — Key {OFFICER.keyId}
                  </Text>
                </Pressable>
                <Text style={[s.hint, { textAlign: 'center', marginBottom: 0 }]}>
                  Signature is recorded on-platform and independently verifiable
                </Text>
              </View>
            )}

            {signature && (
              <View style={[s.evidence, { borderLeftColor: palette.emerald }]}>
                <Text style={s.evidenceRow}>
                  Ed25519 signature {signature} · recorded to registry · investors now see the
                  attestation stamp
                </Text>
              </View>
            )}
          </View>
        );
      })}
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
      paddingBottom: 0,
    },
    back: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted, marginBottom: space.md },
    title: { fontFamily: font.serif, fontSize: 26, lineHeight: 34, color: c.onNavy },
    subtitle: { fontFamily: font.sans, fontSize: 11, color: c.onNavyMuted, marginTop: space.xs },
    sectionTabs: { marginTop: space.lg },
    sectionTabsContent: { paddingRight: space.lg },
    sectionTab: { paddingVertical: space.sm + 2, marginRight: space.lg },
    sectionTabActive: { borderBottomWidth: 2, borderBottomColor: c.gold },
    sectionTabText: { fontFamily: font.sans, fontSize: 13, color: c.onNavyMuted },
    sectionTabTextActive: { color: c.gold, fontWeight: '600' },

    content: { paddingVertical: space.lg, paddingBottom: space.xxl },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginHorizontal: space.md,
      marginBottom: space.md,
    },
    overline: { ...T.overline },
    cardTitle: { fontFamily: font.serif, fontSize: 19, color: c.ink, marginTop: space.xs, marginBottom: space.sm },
    hint: { ...T.caption, marginTop: space.xs, marginBottom: space.md },
    successMark: { fontFamily: font.serif, fontSize: 30, color: c.gold },
    emptyText: { ...T.body, color: c.inkMuted, fontStyle: 'italic' },

    template: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      padding: space.md,
      marginBottom: space.sm,
    },
    templateActive: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    templateName: { fontFamily: font.serif, fontSize: 16, color: c.ink },
    templateTagline: { fontFamily: font.sans, fontSize: 11, color: c.inkFaint },
    termRow: { ...T.body, fontSize: 12, lineHeight: 19, color: c.inkMuted, marginTop: 4 },

    agreeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: space.sm,
      padding: space.sm,
      borderRadius: radius.sm,
    },
    agreeRowOn: { backgroundColor: c.surfaceGoldTint },
    agreeBox: {
      width: 20,
      height: 20,
      borderWidth: 1,
      borderColor: c.bronze,
      borderRadius: radius.sm,
      textAlign: 'center',
      color: c.bronze,
      fontSize: 13,
      lineHeight: 18,
      marginRight: space.sm,
    },
    agreeBoxOn: { backgroundColor: c.gold, borderColor: c.gold, color: '#0A192F' },
    agreeText: { ...T.body, fontSize: 13, flex: 1 },

    fieldLabel: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      color: c.inkMuted,
      marginTop: space.sm,
      marginBottom: space.sm,
    },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm + 2,
      paddingVertical: 7,
      marginRight: space.sm,
      marginBottom: space.sm,
    },
    chipActive: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    chipText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    chipTextActive: { color: c.bronze, fontWeight: '600' },

    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      backgroundColor: c.background,
      color: c.ink,
      fontFamily: font.sans,
      fontSize: 13,
      paddingHorizontal: space.sm,
      paddingVertical: 9,
    },
    inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
    placeholder: { color: c.inkFaint },

    videoAttach: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderStyle: 'dashed',
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: space.md,
      marginTop: space.md,
    },
    videoAttachOn: { borderColor: c.bronze, borderStyle: 'solid', backgroundColor: c.surfaceGoldTint },
    videoAttachText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    videoAttachTextOn: { color: c.bronze, fontWeight: '600' },

    cta: {
      backgroundColor: c.gold,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 13,
      marginTop: space.md,
    },
    ctaDisabled: { opacity: 0.35 },
    ctaText: { fontFamily: font.sans, fontSize: 13, fontWeight: '700', letterSpacing: 0.3, color: '#0A192F' },
    ghostBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      borderRadius: radius.sm,
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: space.sm,
    },
    ghostBtnText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.inkMuted },

    publishedList: { marginTop: space.md },
    publishedRow: { ...T.body, fontSize: 12, color: c.emerald, marginBottom: 4 },

    attestRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.md,
    },
    attestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    attestLeft: { flex: 1, paddingRight: space.sm },
    attestTitle: { ...T.body, fontWeight: '600', fontSize: 14 },
    attestSub: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1 },
    signedMark: { fontFamily: font.sans, fontSize: 10, letterSpacing: 1, fontWeight: '700', color: c.emerald },
    pendingMark: { fontFamily: font.sans, fontSize: 10, letterSpacing: 1, fontWeight: '700', color: c.bronze },

    evidence: {
      marginTop: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: c.gold,
      paddingLeft: space.md,
    },
    evidenceTitle: { ...T.body, fontWeight: '600', fontSize: 12, marginBottom: 4 },
    evidenceRow: { ...T.caption, fontSize: 12, lineHeight: 18, marginBottom: 2 },

    // Portfolio desk
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
    statCell: { width: '50%', paddingVertical: space.sm },
    statCellValue: { ...T.financial, fontSize: 18, fontWeight: '600', ...tabularNums },
    statCellValueGold: { color: c.bronze },
    statCellLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },
    statCellSub: { fontFamily: font.sans, fontSize: 9, color: c.inkFaint, marginTop: 1 },
    reportRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingVertical: space.sm,
    },
    reportLabel: { ...T.body, fontSize: 13, color: c.inkMuted },
    reportValue: { ...T.financial, fontSize: 14, fontWeight: '600' },
    groupTitle: {
      fontFamily: font.sans,
      fontSize: 9,
      letterSpacing: 1.2,
      color: c.inkMuted,
      marginTop: space.md,
      marginBottom: space.sm,
    },
    stackBar: { flexDirection: 'row', height: 14, borderRadius: radius.sm, overflow: 'hidden', marginBottom: space.sm },
    segment: { height: '100%' },
    legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
    swatch: { width: 9, height: 9, borderRadius: 2, marginRight: space.sm },
    legendLabel: { ...T.body, fontSize: 12, flex: 1 },
    legendValue: { ...T.financial, fontSize: 12, fontWeight: '600' },

    holding: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline, paddingVertical: space.md },
    holdingLast: {},
    holdingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.sm },
    holdingLeft: { flex: 1, paddingRight: space.sm },
    holdingName: { ...T.body, fontWeight: '600', fontSize: 14 },
    holdingMeta: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted, marginTop: 1 },
    platformChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
    platformOn: { borderColor: c.gold, backgroundColor: c.surfaceGoldTint },
    platformOff: { borderColor: c.hairline },
    platformText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 1, fontWeight: '700' },
    platformTextOn: { color: c.bronze },
    platformTextOff: { color: c.inkFaint },
    capBar: { flexDirection: 'row', height: 10, borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
    capSeg: { height: '100%' },
    holdingFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    holdingUni: { fontFamily: font.sans, fontSize: 11, fontWeight: '600', color: c.bronze },
    holdingNext: { fontFamily: font.sans, fontSize: 11, color: c.inkMuted },

    // Consortia
    consortiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    consortiumName: { fontFamily: font.serif, fontSize: 18, color: c.ink, flex: 1, paddingRight: space.sm },
    leadChip: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.gold, backgroundColor: c.surfaceGoldTint, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
    leadText: { fontFamily: font.sans, fontSize: 8, letterSpacing: 1, fontWeight: '700', color: c.bronze },
    consortiumThesis: { ...T.body, fontSize: 13, lineHeight: 20, color: c.inkMuted, marginTop: space.xs, marginBottom: space.md },
    memberRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md },
    memberChip: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 4, marginRight: space.sm, marginBottom: space.xs },
    memberChipYou: { borderColor: c.bronze, backgroundColor: c.surfaceGoldTint },
    memberText: { fontFamily: font.sans, fontSize: 12, color: c.inkMuted },
    memberTextYou: { color: c.bronze, fontWeight: '600' },
    consortiumStats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline, paddingTop: space.md },
    consortiumStat: { flex: 1 },
    consortiumStatValue: { ...T.financial, fontSize: 16, fontWeight: '600' },
    consortiumStatLabel: { ...T.caption, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },
    proposeCard: { alignItems: 'center' },
    proposeText: { fontFamily: font.sans, fontSize: 13, fontWeight: '600', color: c.bronze },
    footnote: { ...T.caption, fontSize: 10, lineHeight: 15, marginTop: space.md },
  });
};
