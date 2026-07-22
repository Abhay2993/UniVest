/**
 * Model calibration — the data-flywheel core. Every valuation/slip prediction
 * is logged; when the outcome resolves (milestone hit/missed, exit, total
 * loss) we score prediction-vs-reality. Over time this proprietary
 * outcome dataset makes the models demonstrably calibrated — a moat a cold-
 * start entrant cannot buy.
 *
 * Pure functions, no React imports, unit-tested. Standard proper-scoring-rule
 * math: Brier score, reliability (calibration) curve, and Expected
 * Calibration Error (ECE).
 */

export type ModelName = 'valuation' | 'slip';

export interface PredictionOutcome {
  /** Model's predicted probability of the positive event, 0..1. */
  predicted: number;
  /** Realized outcome: 1 = event happened, 0 = did not. */
  outcome: 0 | 1;
  model: ModelName;
}

/** Brier score = mean squared error of probabilistic forecasts. Lower = better. */
export function brierScore(pairs: PredictionOutcome[]): number {
  if (pairs.length === 0) return 0;
  return pairs.reduce((s, p) => s + (p.predicted - p.outcome) ** 2, 0) / pairs.length;
}

export interface ReliabilityBucket {
  lower: number;
  upper: number;
  count: number;
  /** Mean predicted probability of pairs in this bucket. */
  meanPredicted: number;
  /** Observed frequency of outcome=1 in this bucket. */
  observedFreq: number;
}

/**
 * Reliability curve: bucket predictions into `bins` equal-width bins and, per
 * bin, compare the mean predicted probability against the observed frequency.
 * A perfectly calibrated model lies on the diagonal (predicted ≈ observed).
 */
export function reliabilityCurve(pairs: PredictionOutcome[], bins = 10): ReliabilityBucket[] {
  const buckets: ReliabilityBucket[] = [];
  for (let k = 0; k < bins; k++) {
    const lower = k / bins;
    const upper = (k + 1) / bins;
    // Last bin is inclusive of 1.0.
    const inBin = pairs.filter(
      (p) => p.predicted >= lower && (k === bins - 1 ? p.predicted <= upper : p.predicted < upper),
    );
    buckets.push({
      lower,
      upper,
      count: inBin.length,
      meanPredicted:
        inBin.length === 0 ? 0 : inBin.reduce((s, p) => s + p.predicted, 0) / inBin.length,
      observedFreq:
        inBin.length === 0 ? 0 : inBin.reduce((s, p) => s + p.outcome, 0) / inBin.length,
    });
  }
  return buckets;
}

/**
 * Expected Calibration Error: sample-weighted average gap between predicted
 * probability and observed frequency across bins. 0 = perfectly calibrated.
 */
export function expectedCalibrationError(pairs: PredictionOutcome[], bins = 10): number {
  if (pairs.length === 0) return 0;
  const curve = reliabilityCurve(pairs, bins);
  return curve.reduce(
    (s, b) => s + (b.count / pairs.length) * Math.abs(b.meanPredicted - b.observedFreq),
    0,
  );
}

export interface CalibrationSummary {
  sampleSize: number;
  brier: number;
  ece: number;
  /** Observed base rate of the positive outcome across all pairs. */
  baseRate: number;
  curve: ReliabilityBucket[];
}

export function calibrationSummary(
  pairs: PredictionOutcome[],
  bins = 10,
): CalibrationSummary {
  return {
    sampleSize: pairs.length,
    brier: brierScore(pairs),
    ece: expectedCalibrationError(pairs, bins),
    baseRate:
      pairs.length === 0 ? 0 : pairs.reduce((s, p) => s + p.outcome, 0) / pairs.length,
    curve: reliabilityCurve(pairs, bins),
  };
}

export function summaryForModel(
  pairs: PredictionOutcome[],
  model: ModelName,
  bins = 10,
): CalibrationSummary {
  return calibrationSummary(pairs.filter((p) => p.model === model), bins);
}

// ---------------------------------------------------------------------------
// Deep-Tech Index — aggregate benchmark, base 100 at inception.
// ---------------------------------------------------------------------------
export interface IndexPoint {
  /** ISO date. */
  date: string;
  level: number;
}

/** Total and annualized return of an index series (first → last level). */
export function indexReturn(series: IndexPoint[]): { total: number; annualized: number } {
  if (series.length < 2) return { total: 0, annualized: 0 };
  const first = series[0];
  const last = series[series.length - 1];
  const total = last.level / first.level - 1;
  const years =
    (Date.parse(last.date + 'T00:00:00') - Date.parse(first.date + 'T00:00:00')) /
    (365.25 * 86_400_000);
  const annualized = years > 0 ? Math.pow(last.level / first.level, 1 / years) - 1 : 0;
  return { total, annualized };
}

/**
 * Equal-weight composite of several vertical index series over their shared
 * dates. Rebased so the composite also starts at 100.
 */
export function compositeIndex(seriesByVertical: Record<string, IndexPoint[]>): IndexPoint[] {
  const all = Object.values(seriesByVertical);
  if (all.length === 0) return [];
  const dates = all[0].map((p) => p.date);
  const raw = dates.map((date, i) => {
    const mean = all.reduce((s, series) => s + (series[i]?.level ?? 100), 0) / all.length;
    return { date, level: mean };
  });
  const base = raw[0].level;
  return raw.map((p) => ({ date: p.date, level: (p.level / base) * 100 }));
}
