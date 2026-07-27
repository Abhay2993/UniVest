import { finalize, tally, withMyVote } from '../governance';
import { buildAlerts, DEFAULT_ALERT_PREFS } from '../alerts';
import { PORTFOLIO_POSITIONS } from '../../data/mock';

describe('governance — weighted tally + quorum', () => {
  const base = { forWeight: 250, againstWeight: 0, abstainWeight: 0, eligibleWeight: 430, quorumPct: 50 };

  it('computes turnout and quorum against eligible weight', () => {
    const t = tally(base);
    expect(t.turnoutPct).toBe(58.14);
    expect(t.quorumMet).toBe(true);
    expect(t.leaning).toBe('for');
    expect(t.forPct).toBe(58.14);
  });

  it('passes only with quorum AND a FOR majority', () => {
    expect(finalize(base)).toBe('passed');
    expect(finalize({ ...base, forWeight: 100 })).toBe('rejected'); // 100/430 < 50% quorum
    expect(finalize({ forWeight: 100, againstWeight: 200, abstainWeight: 0, eligibleWeight: 430, quorumPct: 50 })).toBe('rejected');
  });

  it('treats ties as rejected', () => {
    expect(finalize({ forWeight: 200, againstWeight: 200, abstainWeight: 30, eligibleWeight: 430, quorumPct: 50 })).toBe('rejected');
  });

  it('folds a holder vote into the base at their unit weight', () => {
    const base0 = { forWeight: 150, againstWeight: 20, abstainWeight: 0 };
    expect(withMyVote(base0, 'for', 120).forWeight).toBe(270);
    expect(withMyVote(base0, 'against', 120).againstWeight).toBe(140);
    expect(withMyVote(base0, null, 120)).toEqual(base0);
  });
});

describe('alerts — holdings-scoped, preference-filtered feed', () => {
  it('surfaces attestation + governance alerts for held positions', () => {
    const items = buildAlerts(PORTFOLIO_POSITIONS, DEFAULT_ALERT_PREFS);
    expect(items.length).toBeGreaterThan(0);
    // Helion (held) has attested milestones.
    expect(items.some((a) => a.kind === 'attestation' && a.title.includes('Helion'))).toBe(true);
    // The Vasca SPV (Series 019) has an open proposal.
    expect(items.some((a) => a.kind === 'governance')).toBe(true);
  });

  it('respects category preferences', () => {
    const noGov = buildAlerts(PORTFOLIO_POSITIONS, { ...DEFAULT_ALERT_PREFS, governance: false });
    expect(noGov.some((a) => a.kind === 'governance')).toBe(false);
    const noAtt = buildAlerts(PORTFOLIO_POSITIONS, { ...DEFAULT_ALERT_PREFS, attestation: false });
    expect(noAtt.some((a) => a.kind === 'attestation')).toBe(false);
  });

  it('returns nothing for an empty portfolio', () => {
    expect(buildAlerts([], DEFAULT_ALERT_PREFS)).toHaveLength(0);
  });
});
