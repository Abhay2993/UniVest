import {
  brierScore,
  calibrationSummary,
  compositeIndex,
  expectedCalibrationError,
  indexReturn,
  PredictionOutcome,
  reliabilityCurve,
} from '../calibration';
import { RESOLVED_PREDICTIONS } from '../../data/outcomes';

describe('brierScore', () => {
  it('is 0 for perfect deterministic forecasts', () => {
    expect(
      brierScore([
        { predicted: 1, outcome: 1, model: 'slip' },
        { predicted: 0, outcome: 0, model: 'slip' },
      ]),
    ).toBe(0);
  });

  it('is 0.25 for maximally uncertain forecasts', () => {
    expect(
      brierScore([
        { predicted: 0.5, outcome: 1, model: 'slip' },
        { predicted: 0.5, outcome: 0, model: 'slip' },
      ]),
    ).toBeCloseTo(0.25, 9);
  });
});

describe('reliability curve & ECE', () => {
  it('a perfectly calibrated set has ECE ≈ 0', () => {
    // In the [0.8,0.9) bucket, 8 of 10 outcomes are 1 → observed 0.8 ≈ predicted.
    const pairs: PredictionOutcome[] = [];
    for (let i = 0; i < 10; i++) {
      pairs.push({ predicted: 0.85, outcome: i < 8 ? 1 : 0, model: 'slip' });
    }
    const ece = expectedCalibrationError(pairs, 10);
    expect(ece).toBeCloseTo(0.05, 9); // |0.85 − 0.80|
  });

  it('places predictions into the correct bucket, 1.0 in the last bin', () => {
    const curve = reliabilityCurve(
      [
        { predicted: 0.05, outcome: 0, model: 'slip' },
        { predicted: 1.0, outcome: 1, model: 'slip' },
      ],
      10,
    );
    expect(curve[0].count).toBe(1); // 0.05 → first bin
    expect(curve[9].count).toBe(1); // 1.0 → last bin
  });

  it('summary over the real resolved dataset is sane and honest', () => {
    const s = calibrationSummary(RESOLVED_PREDICTIONS);
    expect(s.sampleSize).toBe(RESOLVED_PREDICTIONS.length);
    expect(s.brier).toBeGreaterThan(0);
    expect(s.brier).toBeLessThan(0.25); // beats the coin-flip baseline
    expect(s.ece).toBeGreaterThan(0); // not falsely perfect
    expect(s.ece).toBeLessThan(0.15); // but well-calibrated
    expect(s.baseRate).toBeGreaterThan(0);
    expect(s.baseRate).toBeLessThan(1);
  });
});

describe('deep-tech index', () => {
  it('computes total and annualized return', () => {
    const r = indexReturn([
      { date: '2025-01-01', level: 100 },
      { date: '2026-01-01', level: 120 },
    ]);
    expect(r.total).toBeCloseTo(0.2, 6);
    expect(r.annualized).toBeCloseTo(0.2, 2); // ~1 year
  });

  it('composite is equal-weight and rebased to 100', () => {
    const comp = compositeIndex({
      a: [
        { date: '2025-01-01', level: 100 },
        { date: '2025-02-01', level: 120 },
      ],
      b: [
        { date: '2025-01-01', level: 100 },
        { date: '2025-02-01', level: 140 },
      ],
    });
    expect(comp[0].level).toBe(100);
    expect(comp[1].level).toBeCloseTo(130, 6); // mean(120,140)=130, rebased from 100
  });
});
