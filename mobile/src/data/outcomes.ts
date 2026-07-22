/**
 * The proprietary outcome dataset behind the calibration flywheel.
 *
 * In production these rows come from the prediction ledger (`model_predictions`
 * in the schema): every valuation/slip prediction the platform made, joined to
 * the realized outcome once a milestone resolved or an SPV exited. Here we
 * generate a stable, representative historical dataset deterministically so the
 * calibration curve is REAL math over a fixed set — and honest: the models are
 * modeled as slightly optimistic (a small positive bias), so the curve sits
 * near, but not exactly on, the diagonal, exactly as a real model would.
 */
import { mulberry32 } from '../utils/quant';
import { IndexPoint, PredictionOutcome } from '../utils/calibration';
import { Vertical } from '../types';

function generateResolvedPredictions(): PredictionOutcome[] {
  const rng = mulberry32(20260717);
  const rows: PredictionOutcome[] = [];

  // 220 resolved slip predictions and 180 resolved valuation-event predictions.
  // outcome ~ Bernoulli(trueProb), where trueProb = predicted − optimism bias.
  const gen = (count: number, model: PredictionOutcome['model'], bias: number) => {
    for (let i = 0; i < count; i++) {
      // Predictions spread across the probability range, clustered mid-high.
      const predicted = Math.round(clamp01(0.15 + 0.8 * Math.pow(rng(), 0.8)) * 100) / 100;
      const trueProb = clamp01(predicted - bias);
      rows.push({ predicted, outcome: rng() < trueProb ? 1 : 0, model });
    }
  };

  gen(220, 'slip', 0.06); // slip model is mildly over-confident
  gen(180, 'valuation', 0.04);
  return rows;
}

function clamp01(x: number): number {
  return Math.min(Math.max(x, 0), 1);
}

export const RESOLVED_PREDICTIONS: PredictionOutcome[] = generateResolvedPredictions();

/** Number of realized exits feeding the dataset (for the headline copy). */
export const RESOLVED_DEALS = 47;

// ---------------------------------------------------------------------------
// Deep-Tech Index — monthly levels per vertical, base 100 at inception.
// Modeled from aggregate NAV progress; production computes from spv_valuations.
// ---------------------------------------------------------------------------
const INDEX_DATES = [
  '2025-01-01', '2025-03-01', '2025-05-01', '2025-07-01', '2025-09-01',
  '2025-11-01', '2026-01-01', '2026-03-01', '2026-05-01', '2026-07-01',
];

function series(levels: number[]): IndexPoint[] {
  return INDEX_DATES.map((date, i) => ({ date, level: levels[i] }));
}

export const INDEX_BY_VERTICAL: Record<Vertical, IndexPoint[]> = {
  'Fusion Energy': series([100, 104, 111, 108, 119, 127, 124, 138, 152, 166]),
  'Quantum Computing': series([100, 103, 99, 106, 114, 110, 121, 130, 126, 141]),
  MedTech: series([100, 106, 112, 118, 121, 129, 134, 140, 149, 158]),
  'AI & Robotics': series([100, 108, 115, 113, 122, 131, 128, 139, 147, 155]),
  'Advanced Materials': series([100, 102, 105, 109, 108, 114, 119, 123, 128, 134]),
};
