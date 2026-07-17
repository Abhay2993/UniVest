/**
 * Quant engine for deep-tech private positions — built for milestone-driven,
 * illiquid science bets, NOT borrowed from public-equity technical analysis.
 * Pure functions, no React imports, so the whole thing is unit-testable in
 * Node. All models expose their assumptions and output distributions with
 * explicit uncertainty rather than false-precision point estimates.
 */
import { Milestone, Startup, Vertical } from '../types';

// ---------------------------------------------------------------------------
// Seedable RNG (mulberry32) — deterministic Monte Carlo for tests.
// ---------------------------------------------------------------------------
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Sector priors (documented, editable). Higher risk = longer, less-proven.
// ---------------------------------------------------------------------------
const SECTOR_START_TRL: Record<Vertical, number> = {
  'Fusion Energy': 3,
  'Quantum Computing': 3,
  MedTech: 4,
  'AI & Robotics': 4,
  'Advanced Materials': 4,
};

const SECTOR_RISK: Record<Vertical, number> = {
  'Fusion Energy': 0.9,
  'Quantum Computing': 0.85,
  MedTech: 0.6,
  'AI & Robotics': 0.5,
  'Advanced Materials': 0.55,
};

// ---------------------------------------------------------------------------
// 1) Probabilistic milestone-tree valuation (Monte Carlo)
// ---------------------------------------------------------------------------
export interface MilestoneNode {
  /** Probability of clearing this milestone once reached. */
  completionProb: number;
  /** Valuation multiplier applied on success. */
  stepUp: number;
}

export interface ValuationOptions {
  /** Fraction of value retained if the venture stalls at a milestone. */
  residualOnFailure: number;
  /** Extra multiple applied when every remaining milestone clears (exit). */
  finalExitMultiple: number;
  /** Starting value; 1 → results read as a multiple on invested capital. */
  startValue: number;
  iterations: number;
}

export const DEFAULT_VALUATION: ValuationOptions = {
  residualOnFailure: 0.05,
  finalExitMultiple: 1.5,
  startValue: 1,
  iterations: 4000,
};

/** A sample counts as a total loss below this multiple of the start value. */
const TOTAL_LOSS_THRESHOLD = 0.1;

/**
 * Predictive milestone-slip model — probability that a given forward
 * milestone lands late. A documented logistic blend of sector base rate,
 * depth in the remaining sequence, status, execution pace (TRL velocity),
 * and horizon. Production replaces the hand-set weights with a model fit on
 * historical planned-vs-actual milestone dates; the interface stays the same.
 */
export function milestoneSlipProbability(startup: Startup, milestone: Milestone): number {
  if (milestone.status === 'completed') return 0;

  const remaining = startup.milestones.filter((m) => m.status !== 'completed');
  const idx = Math.max(0, remaining.findIndex((m) => m.id === milestone.id));
  const depth = remaining.length <= 1 ? 0 : idx / (remaining.length - 1); // 0..1

  const sector = SECTOR_RISK[startup.vertical] ?? 0.6; // 0.5..0.9
  const pace = trlVelocity(startup); // levels/yr
  const paceRelief = clamp(pace / 2, 0, 0.5);

  const horizonYears = Math.max(
    0,
    (Date.parse(milestone.date + 'T00:00:00') - Date.now()) / (365.25 * 86_400_000),
  );
  const horizonTerm = 0.3 * Math.min(horizonYears / 3, 1);

  const logit =
    -1.2 +
    1.6 * sector +
    0.9 * depth +
    (milestone.status === 'upcoming' ? 0.4 : 0) -
    0.8 * paceRelief +
    horizonTerm;

  return clamp(1 / (1 + Math.exp(-logit)), 0.05, 0.95);
}

/**
 * Derives the forward milestone nodes for a startup. Completed milestones are
 * already banked (excluded); attestation of past milestones lifts team
 * credibility, nudging every forward probability up. When `slipAware` is set,
 * each node's completion probability is additionally dampened by its
 * predicted slip risk — late milestones consume runway and miss windows.
 */
export function buildMilestoneNodes(startup: Startup, slipAware = false): MilestoneNode[] {
  const completed = startup.milestones.filter((m) => m.status === 'completed');
  const attested = completed.filter((m) => m.attestation).length;
  const credibility = completed.length === 0 ? 0 : attested / completed.length; // 0..1
  const credBoost = 0.1 * credibility;

  const remaining = startup.milestones.filter((m) => m.status !== 'completed');
  let upcomingSeen = 0;

  return remaining.map((m) => {
    let base: number;
    if (m.status === 'in_progress') {
      base = 0.8;
    } else {
      // Upcoming milestones decay with distance in the sequence.
      base = 0.65 * Math.pow(0.9, upcomingSeen);
      upcomingSeen += 1;
    }
    let completionProb = clamp(base + credBoost, 0.3, 0.95);
    if (slipAware) {
      const slip = milestoneSlipProbability(startup, m);
      completionProb = clamp(completionProb * (1 - 0.35 * slip), 0.2, 0.95);
    }
    // Later milestones (closer to commercialization) carry bigger step-ups.
    const stepUp = 1.3 + 0.06 * indexInRemaining(m, remaining);
    return { completionProb, stepUp };
  });
}

function indexInRemaining(m: Milestone, remaining: Milestone[]): number {
  return remaining.findIndex((x) => x.id === m.id);
}

export interface ValuationStats {
  expected: number;
  p10: number;
  p50: number;
  p90: number;
  /** Fraction of outcomes at or below the total-loss threshold. */
  pTotalLoss: number;
  /** Fraction of outcomes returning ≥ start value. */
  pProfit: number;
  samples: number[];
}

export function simulateValuation(
  nodes: MilestoneNode[],
  options: Partial<ValuationOptions> = {},
  rng: () => number = Math.random,
): ValuationStats {
  const opt = { ...DEFAULT_VALUATION, ...options };
  const samples: number[] = new Array(opt.iterations);

  for (let i = 0; i < opt.iterations; i++) {
    let value = opt.startValue;
    let stalled = false;
    for (const node of nodes) {
      if (rng() < node.completionProb) {
        value *= node.stepUp;
      } else {
        value *= opt.residualOnFailure;
        stalled = true;
        break;
      }
    }
    if (!stalled) value *= opt.finalExitMultiple;
    samples[i] = value;
  }

  samples.sort((a, b) => a - b);
  const start = opt.startValue;
  return {
    expected: mean(samples),
    p10: percentile(samples, 0.1),
    p50: percentile(samples, 0.5),
    p90: percentile(samples, 0.9),
    pTotalLoss: samples.filter((v) => v <= start * TOTAL_LOSS_THRESHOLD).length / samples.length,
    pProfit: samples.filter((v) => v >= start).length / samples.length,
    samples,
  };
}

/** Convenience: valuation distribution as a multiple on invested capital. */
export function valuationForStartup(
  startup: Startup,
  options: Partial<ValuationOptions> & { slipAware?: boolean } = {},
  seed?: number,
): ValuationStats {
  const { slipAware = false, ...simOptions } = options;
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  return simulateValuation(buildMilestoneNodes(startup, slipAware), simOptions, rng);
}

// ---------------------------------------------------------------------------
// 2) TRL tracking + Science-Risk score
// ---------------------------------------------------------------------------
export function currentTRL(startup: Startup): number {
  const start = SECTOR_START_TRL[startup.vertical] ?? 3;
  const completed = startup.milestones.filter((m) => m.status === 'completed').length;
  return Math.min(9, start + completed);
}

/** TRL levels climbed per year, from completed-milestone dates. */
export function trlVelocity(startup: Startup): number {
  const done = startup.milestones
    .filter((m) => m.status === 'completed')
    .map((m) => Date.parse(m.date + 'T00:00:00'))
    .sort((a, b) => a - b);
  if (done.length < 2) return 0;
  const years = (done[done.length - 1] - done[0]) / (365.25 * 86_400_000);
  if (years <= 0) return 0;
  return (done.length - 1) / years;
}

export interface ScienceRisk {
  /** 0 (lowest risk) – 100 (highest). */
  score: number;
  band: 'Low' | 'Elevated' | 'High' | 'Severe';
  trl: number;
  trlGap: number;
  attestationRate: number;
  sectorRisk: number;
}

/**
 * Blends remaining TRL gap, sector prior, and independent-attestation rate.
 * More attested progress lowers the score; a big remaining gap in a hard
 * sector raises it.
 */
export function scienceRiskScore(startup: Startup): ScienceRisk {
  const trl = currentTRL(startup);
  const trlGap = 9 - trl; // 0..~6
  const completed = startup.milestones.filter((m) => m.status === 'completed');
  const attested = completed.filter((m) => m.attestation).length;
  const attestationRate = completed.length === 0 ? 0 : attested / completed.length;
  const sectorRisk = SECTOR_RISK[startup.vertical] ?? 0.6;

  // Weighted blend on a 0..1 scale, then scaled to 0..100.
  const gapComponent = (trlGap / 6) * 0.45;
  const sectorComponent = sectorRisk * 0.4;
  const attestationRelief = attestationRate * 0.15;
  const raw = clamp(gapComponent + sectorComponent - attestationRelief + 0.15, 0, 1);
  const score = Math.round(raw * 100);

  const band: ScienceRisk['band'] =
    score >= 75 ? 'Severe' : score >= 55 ? 'High' : score >= 35 ? 'Elevated' : 'Low';

  return { score, band, trl, trlGap, attestationRate, sectorRisk };
}

// ---------------------------------------------------------------------------
// 3) Factor-based portfolio analytics
// ---------------------------------------------------------------------------
export interface FactorSlice {
  label: string;
  /** Share of portfolio cost basis, 0..1. */
  weight: number;
}

export interface PositionLike {
  startupId: string;
  costBasis: number;
}

export function timeToLiquidityYears(startup: Startup): number {
  const future = startup.milestones
    .map((m) => Date.parse(m.date + 'T00:00:00'))
    .filter((t) => t > Date.now());
  if (future.length === 0) return 0.25;
  const last = Math.max(...future);
  return Math.max(0.25, (last - Date.now()) / (365.25 * 86_400_000));
}

function trlBand(trl: number): string {
  if (trl <= 4) return 'TRL 1–4 · Lab';
  if (trl <= 6) return 'TRL 5–6 · Prototype';
  return 'TRL 7–9 · Deployment';
}

function liquidityBand(years: number): string {
  if (years < 2) return '< 2 yr';
  if (years < 4) return '2–4 yr';
  return '4+ yr';
}

function groupExposure(
  positions: PositionLike[],
  startupOf: (id: string) => Startup | undefined,
  key: (s: Startup) => string,
): FactorSlice[] {
  const total = positions.reduce((sum, p) => sum + p.costBasis, 0) || 1;
  const acc = new Map<string, number>();
  for (const p of positions) {
    const s = startupOf(p.startupId);
    if (!s) continue;
    const k = key(s);
    acc.set(k, (acc.get(k) ?? 0) + p.costBasis);
  }
  return [...acc.entries()]
    .map(([label, basis]) => ({ label, weight: basis / total }))
    .sort((a, b) => b.weight - a.weight);
}

export interface FactorExposure {
  byVertical: FactorSlice[];
  byTRL: FactorSlice[];
  byLiquidity: FactorSlice[];
  byUniversity: FactorSlice[];
  /** Weighted-average science-risk score across the book. */
  weightedScienceRisk: number;
  /** A plain-English "measured note" on the biggest concentration. */
  note: string;
}

export function portfolioFactorExposure(
  positions: PositionLike[],
  startupOf: (id: string) => Startup | undefined,
): FactorExposure {
  const byVertical = groupExposure(positions, startupOf, (s) => s.vertical);
  const byTRL = groupExposure(positions, startupOf, (s) => trlBand(currentTRL(s)));
  const byLiquidity = groupExposure(positions, startupOf, (s) =>
    liquidityBand(timeToLiquidityYears(s)),
  );
  const byUniversity = groupExposure(positions, startupOf, (s) => s.university.shortName);

  const total = positions.reduce((sum, p) => sum + p.costBasis, 0) || 1;
  const weightedScienceRisk = positions.reduce((sum, p) => {
    const s = startupOf(p.startupId);
    return s ? sum + scienceRiskScore(s).score * (p.costBasis / total) : sum;
  }, 0);

  const topVertical = byVertical[0];
  const topLiquidity = byLiquidity[0];
  const note = topVertical
    ? `You're ${Math.round(topVertical.weight * 100)}% ${topVertical.label}` +
      (topLiquidity ? `, with ${Math.round(topLiquidity.weight * 100)}% at ${topLiquidity.label} to liquidity` : '') +
      `. Weighted science-risk ${Math.round(weightedScienceRisk)}/100.`
    : 'No positions yet.';

  return {
    byVertical,
    byTRL,
    byLiquidity,
    byUniversity,
    weightedScienceRisk,
    note,
  };
}

// ---------------------------------------------------------------------------
// 4) Scenario / stress testing
// ---------------------------------------------------------------------------
export interface Scenario {
  id: string;
  label: string;
  detail: string;
  /** Sectors this shock touches (empty = all). */
  verticals: Vertical[];
  /** Multiplier on forward completion probabilities (≤1 = worse). */
  probShock: number;
  /** Multiplier on step-ups (≤1 = compressed valuations). */
  stepShock: number;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'baseline',
    label: 'Baseline',
    detail: 'Current model assumptions, no shock applied.',
    verticals: [],
    probShock: 1,
    stepShock: 1,
  },
  {
    id: 'fusion-slip',
    label: 'Fusion timelines slip 2 yr',
    detail: 'Fusion milestones clear less often and re-rate lower as capital patience thins.',
    verticals: ['Fusion Energy'],
    probShock: 0.7,
    stepShock: 0.85,
  },
  {
    id: 'quantum-winter',
    label: 'Quantum winter',
    detail: 'A funding pullback in quantum compresses step-ups and lengthens milestones.',
    verticals: ['Quantum Computing'],
    probShock: 0.65,
    stepShock: 0.75,
  },
  {
    id: 'broad-shock',
    label: 'Broad deep-tech drawdown',
    detail: 'A market-wide risk-off hits every vertical\'s probabilities and marks.',
    verticals: [],
    probShock: 0.8,
    stepShock: 0.85,
  },
];

function shockedNodes(startup: Startup, scenario: Scenario): MilestoneNode[] {
  const nodes = buildMilestoneNodes(startup);
  const hit = scenario.verticals.length === 0 || scenario.verticals.includes(startup.vertical);
  if (!hit) return nodes;
  return nodes.map((n) => ({
    completionProb: clamp(n.completionProb * scenario.probShock, 0.05, 0.98),
    stepUp: Math.max(1, n.stepUp * scenario.stepShock),
  }));
}

export interface ScenarioResult {
  scenario: Scenario;
  expectedMultiple: number;
  pTotalLoss: number;
}

/** Portfolio-weighted expected multiple and loss probability under a shock. */
export function portfolioUnderScenario(
  positions: PositionLike[],
  startupOf: (id: string) => Startup | undefined,
  scenario: Scenario,
  seed = 12345,
): ScenarioResult {
  const rng = mulberry32(seed);
  const total = positions.reduce((sum, p) => sum + p.costBasis, 0) || 1;
  let weightedExpected = 0;
  let weightedLoss = 0;

  for (const p of positions) {
    const s = startupOf(p.startupId);
    if (!s) continue;
    const stats = simulateValuation(shockedNodes(s, scenario), { iterations: 3000 }, rng);
    const w = p.costBasis / total;
    weightedExpected += stats.expected * w;
    weightedLoss += stats.pTotalLoss * w;
  }
  return { scenario, expectedMultiple: weightedExpected, pTotalLoss: weightedLoss };
}

// ---------------------------------------------------------------------------
// 5) Liquidity analytics (batch-auction market microstructure)
// ---------------------------------------------------------------------------
export interface BookOrder {
  side: 'buy' | 'sell';
  units: number;
  limitPrice: number;
}

export interface LiquidityMetrics {
  bidDepth: number;
  askDepth: number;
  bestBid: number | null;
  bestAsk: number | null;
  /** Absolute best-ask − best-bid; null if one side is empty. */
  spread: number | null;
  /** Volume-weighted avg price to SELL `impactUnits` into the bids. */
  sellImpactVWAP: number | null;
  /** % below best bid that the sell VWAP lands. */
  sellImpactPct: number | null;
  /** Stdev of historical clearing prices. */
  clearingVolatility: number;
  /** Liquidity score 0 (illiquid) – 100 (deep). */
  score: number;
}

export function liquidityMetrics(
  book: BookOrder[],
  clearingHistory: number[],
  impactUnits = 100,
): LiquidityMetrics {
  const bids = book.filter((o) => o.side === 'buy').sort((a, b) => b.limitPrice - a.limitPrice);
  const asks = book.filter((o) => o.side === 'sell').sort((a, b) => a.limitPrice - b.limitPrice);
  const bidDepth = bids.reduce((s, o) => s + o.units, 0);
  const askDepth = asks.reduce((s, o) => s + o.units, 0);
  const bestBid = bids[0]?.limitPrice ?? null;
  const bestAsk = asks[0]?.limitPrice ?? null;
  const spread = bestBid !== null && bestAsk !== null ? Math.abs(bestAsk - bestBid) : null;

  // Walk the bid book to sell `impactUnits`.
  let remaining = impactUnits;
  let proceeds = 0;
  let filled = 0;
  for (const bid of bids) {
    if (remaining <= 0) break;
    const take = Math.min(bid.units, remaining);
    proceeds += take * bid.limitPrice;
    filled += take;
    remaining -= take;
  }
  const sellImpactVWAP = filled > 0 ? proceeds / filled : null;
  const sellImpactPct =
    sellImpactVWAP !== null && bestBid ? (1 - sellImpactVWAP / bestBid) * 100 : null;

  const clearingVolatility = stdev(clearingHistory);

  // Score blends depth balance, tightness of spread, and price stability.
  const depthScore = Math.min(1, (bidDepth + askDepth) / 800); // 800u = "deep" here
  const balance = bidDepth + askDepth > 0 ? 1 - Math.abs(bidDepth - askDepth) / (bidDepth + askDepth) : 0;
  const mid = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;
  const spreadScore = spread !== null && mid ? Math.max(0, 1 - spread / (mid * 0.15)) : 0;
  const stabilityScore = mid ? Math.max(0, 1 - clearingVolatility / (mid * 0.15)) : 0;
  const score = Math.round(
    100 * (0.4 * depthScore + 0.2 * balance + 0.2 * spreadScore + 0.2 * stabilityScore),
  );

  return {
    bidDepth,
    askDepth,
    bestBid,
    bestAsk,
    spread,
    sellImpactVWAP,
    sellImpactPct,
    clearingVolatility,
    score,
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}
function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}
/** Percentile of a pre-sorted ascending array. */
function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(Math.floor(q * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}
function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}
