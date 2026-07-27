import { scheduleFromMilestones, summarizeEscrow } from '../escrow';
import { STARTUPS } from '../../data/mock';
import { Milestone } from '../../types';

const helion = STARTUPS.find((s) => s.id === 's1')!;

describe('milestone-tranched escrow — schedule derivation', () => {
  it('splits the envelope across milestones and sums to exactly 100%', () => {
    const tranches = scheduleFromMilestones(helion.milestones, helion.targetAmount);
    expect(tranches).toHaveLength(helion.milestones.length);
    const pct = tranches.reduce((s, t) => s + t.releasePct, 0);
    expect(pct).toBe(100);
    const amt = tranches.reduce((s, t) => s + t.amount, 0);
    expect(Math.round(amt)).toBe(helion.targetAmount);
  });

  it('releases only completed AND attested milestones; others stay held', () => {
    const tranches = scheduleFromMilestones(helion.milestones, helion.targetAmount);
    helion.milestones.forEach((m, i) => {
      const expected = m.status === 'completed' && !!m.attestation ? 'released' : 'held';
      expect(tranches[i].status).toBe(expected);
    });
    // A completed-but-unattested milestone must not release.
    const unattested: Milestone[] = [
      { id: 'x', title: 'Done, not signed', description: '', status: 'completed', date: '2026-01-01' },
    ];
    expect(scheduleFromMilestones(unattested, 1000)[0].status).toBe('held');
  });

  it('uses cumulative rounding so odd counts still total 100 (33/34/33)', () => {
    const three: Milestone[] = [1, 2, 3].map((n) => ({
      id: `m${n}`, title: `M${n}`, description: '', status: 'upcoming', date: '2027-01-01',
    }));
    const pcts = scheduleFromMilestones(three, 900).map((t) => t.releasePct);
    expect(pcts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pcts).toEqual([33, 34, 33]);
  });
});

describe('milestone-tranched escrow — summary roll-up', () => {
  it('splits released vs protected against the envelope', () => {
    const tranches = scheduleFromMilestones(helion.milestones, helion.targetAmount);
    const s = summarizeEscrow(tranches, helion.targetAmount);
    // Helion: 2 of 5 milestones are completed + attested → 40% released, 60% protected.
    expect(s.releasedPct).toBe(40);
    expect(s.deRiskedPct).toBe(60);
    expect(s.releasedAmount + s.heldAmount).toBe(helion.targetAmount);
  });

  it('tracks refunds separately and floors held at zero', () => {
    const s = summarizeEscrow(
      [
        { position: 1, label: 'A', releasePct: 60, amount: 600, status: 'released', milestoneStatus: 'completed', attested: true },
        { position: 2, label: 'B', releasePct: 40, amount: 400, status: 'refunded', milestoneStatus: 'upcoming', attested: false },
      ],
      1000,
    );
    expect(s.releasedAmount).toBe(600);
    expect(s.refundedAmount).toBe(400);
    expect(s.heldAmount).toBe(0);
  });
});
