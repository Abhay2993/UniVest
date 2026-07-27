import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PortfolioPosition } from '../types';
import { font, Palette, radius, space, tabularNums, typeStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { PROPOSAL_KIND_LABEL, PROPOSALS, Proposal } from '../data/governance';
import { tally, VoteChoice, withMyVote } from '../utils/governance';

const QUIET = LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity);
const CHOICES: VoteChoice[] = ['for', 'against', 'abstain'];
const CHOICE_LABEL: Record<VoteChoice, string> = { for: 'For', against: 'Against', abstain: 'Abstain' };

/**
 * SPV Governance — holders vote on material decisions with weight equal to their
 * units; quorum and outcome come from the weighted tally. Mirrors the backend
 * `GET /governance/spv/:id/proposals` + `POST /proposals/:id/vote`.
 */
export function GovernanceCard({ positions }: { positions: PortfolioPosition[] }) {
  const s = useThemedStyles(makeStyles);
  const { palette } = useTheme();
  const [votes, setVotes] = useState<Record<string, VoteChoice>>({});

  // Proposals on SPVs the investor actually holds, with their unit weight.
  const items = PROPOSALS.flatMap((p) => {
    const pos = positions.find((x) => x.spvName === p.spvName);
    return pos ? [{ proposal: p, myWeight: pos.units }] : [];
  });
  if (items.length === 0) return null;

  const castVote = (id: string, choice: VoteChoice) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(QUIET);
    setVotes((cur) => ({ ...cur, [id]: choice }));
  };

  return (
    <View style={s.card}>
      <Text style={s.overline}>SPV Governance</Text>
      <Text style={s.hint}>
        You vote on material decisions for the SPVs you hold — weight equal to your units. Quorum
        and outcome are computed from the weighted tally.
      </Text>

      {items.map(({ proposal, myWeight }, i) => (
        <ProposalRow
          key={proposal.id}
          proposal={proposal}
          myWeight={myWeight}
          myVote={votes[proposal.id] ?? null}
          onVote={castVote}
          last={i === items.length - 1}
        />
      ))}
    </View>
  );

  function ProposalRow({
    proposal,
    myWeight,
    myVote,
    onVote,
    last,
  }: {
    proposal: Proposal;
    myWeight: number;
    myVote: VoteChoice | null;
    onVote: (id: string, c: VoteChoice) => void;
    last: boolean;
  }) {
    const weights = withMyVote(
      { forWeight: proposal.otherVotes.for, againstWeight: proposal.otherVotes.against, abstainWeight: proposal.otherVotes.abstain },
      myVote,
      myWeight,
    );
    const t = tally({ ...weights, eligibleWeight: proposal.eligibleWeight, quorumPct: proposal.quorumPct });
    const notVotedPct = Math.max(0, 100 - t.forPct - t.againstPct - t.abstainPct);

    return (
      <View style={[s.proposal, last && s.proposalLast]}>
        <View style={s.propHead}>
          <View style={s.kindPill}>
            <Text style={s.kindText}>{PROPOSAL_KIND_LABEL[proposal.kind]}</Text>
          </View>
          <Text style={s.closes}>closes in {proposal.closesInDays}d</Text>
        </View>
        <Text style={s.title}>{proposal.title}</Text>
        <Text style={s.desc}>{proposal.description}</Text>

        <View style={s.bar}>
          {t.forPct > 0 && <View style={{ flex: t.forPct, backgroundColor: palette.emerald }} />}
          {t.againstPct > 0 && <View style={{ flex: t.againstPct, backgroundColor: palette.danger }} />}
          {t.abstainPct > 0 && <View style={{ flex: t.abstainPct, backgroundColor: palette.inkMuted }} />}
          {notVotedPct > 0 && <View style={{ flex: notVotedPct, backgroundColor: palette.surfaceMuted }} />}
        </View>
        <View style={s.tallyRow}>
          <Text style={s.tallyText}>
            For {t.forPct}% · Against {t.againstPct}% · Abstain {t.abstainPct}%
          </Text>
          <Text style={[s.quorum, t.quorumMet ? s.quorumMet : s.quorumPending]}>
            {t.turnoutPct}% turnout · quorum {t.quorumMet ? 'met' : `${proposal.quorumPct}%`}
          </Text>
        </View>

        <View style={s.voteRow}>
          {CHOICES.map((c) => (
            <Pressable
              key={c}
              onPress={() => onVote(proposal.id, c)}
              style={[s.voteBtn, myVote === c && s.voteBtnOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: myVote === c }}
            >
              <Text style={[s.voteText, myVote === c && s.voteTextOn]}>{CHOICE_LABEL[c]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.weightNote}>
          {myVote
            ? `Your ${myWeight.toLocaleString()} units counted as “${CHOICE_LABEL[myVote]}”.`
            : `Your voting weight: ${myWeight.toLocaleString()} units.`}
        </Text>
      </View>
    );
  }
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

    proposal: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
      paddingTop: space.md,
      marginBottom: space.md,
    },
    proposalLast: { marginBottom: 0 },
    propHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    kindPill: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bronze,
      backgroundColor: c.surfaceGoldTint,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    kindText: { fontFamily: font.sans, fontSize: 9, fontWeight: '700', color: c.bronze, letterSpacing: 0.4, textTransform: 'uppercase' },
    closes: { ...T.caption, ...tabularNums },
    title: { fontFamily: font.sans, fontSize: 14, fontWeight: '700', color: c.ink, marginTop: space.sm },
    desc: { ...T.body, fontSize: 13, color: c.inkMuted, marginTop: 2, marginBottom: space.md },

    bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: c.surfaceMuted },
    tallyRow: { marginTop: space.sm, marginBottom: space.md },
    tallyText: { fontFamily: font.sans, fontSize: 12, color: c.ink, ...tabularNums },
    quorum: { fontFamily: font.sans, fontSize: 11, marginTop: 2, ...tabularNums },
    quorumMet: { color: c.emerald },
    quorumPending: { color: c.inkMuted },

    voteRow: { flexDirection: 'row', gap: space.sm as number },
    voteBtn: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.navy,
      borderRadius: radius.sm,
      paddingVertical: 9,
      alignItems: 'center',
    },
    voteBtnOn: { backgroundColor: c.navy },
    voteText: { fontFamily: font.sans, fontSize: 12, fontWeight: '600', color: c.navy },
    voteTextOn: { color: '#F5F7FA' },
    weightNote: { ...T.caption, marginTop: space.sm },
  });
};
