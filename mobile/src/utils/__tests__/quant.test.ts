import {
  buildMilestoneNodes,
  currentTRL,
  liquidityMetrics,
  milestoneSlipProbability,
  mulberry32,
  portfolioFactorExposure,
  portfolioUnderScenario,
  scienceRiskScore,
  SCENARIOS,
  simulateValuation,
  valuationForStartup,
} from '../quant';
import { STARTUPS } from '../../data/mock';

const helion = STARTUPS.find((s) => s.name === 'Helion Dynamics')!;
const qubit = STARTUPS.find((s) => s.name === 'Qubit Foundry')!;

describe('milestone-tree valuation', () => {
  it('is deterministic for a fixed seed', () => {
    const a = valuationForStartup(helion, { iterations: 2000 }, 42);
    const b = valuationForStartup(helion, { iterations: 2000 }, 42);
    expect(a.expected).toBe(b.expected);
    expect(a.p50).toBe(b.p50);
  });

  it('produces ordered percentiles and valid probabilities', () => {
    const v = valuationForStartup(helion, { iterations: 4000 }, 7);
    expect(v.p10).toBeLessThanOrEqual(v.p50);
    expect(v.p50).toBeLessThanOrEqual(v.p90);
    expect(v.pTotalLoss).toBeGreaterThanOrEqual(0);
    expect(v.pTotalLoss).toBeLessThanOrEqual(1);
    expect(v.pProfit).toBeGreaterThanOrEqual(0);
    expect(v.pProfit).toBeLessThanOrEqual(1);
  });

  it('reflects deep-tech reality: high upside tail, meaningful loss mass', () => {
    const v = valuationForStartup(helion, { iterations: 6000 }, 99);
    // Expected value is a multiple on invested capital in a plausible band.
    expect(v.expected).toBeGreaterThan(0.5);
    expect(v.expected).toBeLessThan(6);
    // The p90 upside is a real multiple, and total loss is a genuine risk.
    expect(v.p90).toBeGreaterThan(1);
    expect(v.pTotalLoss).toBeGreaterThan(0.1);
  });

  it('analytic mean matches Monte Carlo mean for a hand-built tree', () => {
    // Two nodes, p=0.7 each, step 1.4, residual 0.05, exit 1.5, start 1.
    const nodes = [
      { completionProb: 0.7, stepUp: 1.4 },
      { completionProb: 0.7, stepUp: 1.4 },
    ];
    // E = 0.3*0.05 + 0.7*0.3*(1.4*0.05) + 0.49*(1.4*1.4*1.5)
    const analytic = 0.3 * 0.05 + 0.7 * 0.3 * (1.4 * 0.05) + 0.49 * (1.4 * 1.4 * 1.5);
    const sim = simulateValuation(
      nodes,
      { residualOnFailure: 0.05, finalExitMultiple: 1.5, startValue: 1, iterations: 40000 },
      mulberry32(2024),
    );
    expect(sim.expected).toBeCloseTo(analytic, 1);
  });
});

describe('TRL & science risk', () => {
  it('derives current TRL from sector start + completed milestones', () => {
    // Helion: Fusion start 3 + 2 completed = 5
    expect(currentTRL(helion)).toBe(5);
    // Qubit: Quantum start 3 + 1 completed = 4
    expect(currentTRL(qubit)).toBe(4);
  });

  it('scores harder-sector / larger-gap startups as riskier', () => {
    const vasca = STARTUPS.find((s) => s.name === 'Vasca Bio')!;
    const helionRisk = scienceRiskScore(helion).score; // fusion, TRL 5
    const vascaRisk = scienceRiskScore(vasca).score; // medtech, TRL 6
    expect(helionRisk).toBeGreaterThan(vascaRisk);
    expect(['Low', 'Elevated', 'High', 'Severe']).toContain(scienceRiskScore(helion).band);
  });
});

describe('factor exposure', () => {
  const positions = [
    { startupId: helion.id, costBasis: 6000 }, // fusion
    { startupId: qubit.id, costBasis: 4000 }, // quantum
  ];
  const lookup = (id: string) => STARTUPS.find((s) => s.id === id);

  it('weights by cost basis and sums to 1', () => {
    const fx = portfolioFactorExposure(positions, lookup);
    const sum = fx.byVertical.reduce((s, x) => s + x.weight, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(fx.byVertical[0].weight).toBeCloseTo(0.6, 6); // fusion is 6000/10000
    expect(fx.note).toMatch(/60% Fusion Energy/);
  });
});

describe('scenario stress testing', () => {
  const positions = [{ startupId: helion.id, costBasis: 6000 }];
  const lookup = (id: string) => STARTUPS.find((s) => s.id === id);

  it('a fusion shock lowers expected value vs baseline', () => {
    const baseline = portfolioUnderScenario(positions, lookup, SCENARIOS[0]);
    const fusionSlip = portfolioUnderScenario(
      positions,
      lookup,
      SCENARIOS.find((s) => s.id === 'fusion-slip')!,
    );
    expect(fusionSlip.expectedMultiple).toBeLessThan(baseline.expectedMultiple);
    expect(fusionSlip.pTotalLoss).toBeGreaterThan(baseline.pTotalLoss);
  });
});

describe('milestone-slip model', () => {
  it('returns probabilities in [0.05, 0.95] and 0 for completed milestones', () => {
    for (const st of STARTUPS) {
      for (const m of st.milestones) {
        const p = milestoneSlipProbability(st, m);
        if (m.status === 'completed') {
          expect(p).toBe(0);
        } else {
          expect(p).toBeGreaterThanOrEqual(0.05);
          expect(p).toBeLessThanOrEqual(0.95);
        }
      }
    }
  });

  it('deeper (later) milestones carry more slip risk than nearer ones', () => {
    const remaining = helion.milestones.filter((m) => m.status !== 'completed');
    const first = milestoneSlipProbability(helion, remaining[0]);
    const last = milestoneSlipProbability(helion, remaining[remaining.length - 1]);
    expect(last).toBeGreaterThan(first);
  });

  it('harder sectors slip more, all else equal', () => {
    const meridian = STARTUPS.find((s) => s.name === 'Meridian Robotics')!; // AI & Robotics, 0.5
    const helionActive = helion.milestones.find((m) => m.status === 'in_progress')!;
    const meridianActive = meridian.milestones.find((m) => m.status === 'in_progress')!;
    // Fusion (0.9 sector risk) vs robotics (0.5) — fusion's active milestone slips more.
    expect(milestoneSlipProbability(helion, helionActive)).toBeGreaterThan(
      milestoneSlipProbability(meridian, meridianActive),
    );
  });

  it('slip-aware valuation is more conservative than the baseline tree', () => {
    const baseline = valuationForStartup(helion, { iterations: 6000 }, 314);
    const slipAware = valuationForStartup(helion, { iterations: 6000, slipAware: true }, 314);
    expect(slipAware.expected).toBeLessThan(baseline.expected);
    expect(slipAware.pTotalLoss).toBeGreaterThanOrEqual(baseline.pTotalLoss);
    // And the node-level dampening is visible directly.
    const rawNodes = buildMilestoneNodes(helion, false);
    const dampedNodes = buildMilestoneNodes(helion, true);
    for (let i = 0; i < rawNodes.length; i++) {
      expect(dampedNodes[i].completionProb).toBeLessThanOrEqual(rawNodes[i].completionProb);
    }
  });
});

describe('liquidity analytics', () => {
  const book = [
    { side: 'buy' as const, units: 100, limitPrice: 13.0 },
    { side: 'buy' as const, units: 200, limitPrice: 12.5 },
    { side: 'sell' as const, units: 180, limitPrice: 12.25 },
  ];

  it('computes depth, spread, and sell price impact by walking the book', () => {
    const m = liquidityMetrics(book, [11.4, 12.1, 12.375], 250);
    expect(m.bidDepth).toBe(300);
    expect(m.askDepth).toBe(180);
    expect(m.bestBid).toBe(13.0);
    expect(m.bestAsk).toBe(12.25);
    // Sell 250u: 100@13.0 + 150@12.5 = 1300 + 1875 = 3175 / 250 = 12.70
    expect(m.sellImpactVWAP).toBeCloseTo(12.7, 6);
    expect(m.sellImpactPct).toBeCloseTo((1 - 12.7 / 13.0) * 100, 6);
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });
});
