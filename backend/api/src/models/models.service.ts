import { BadRequestException, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * Data-flywheel surface: log predictions, resolve outcomes, and publish
 * calibration (Brier + ECE) straight from the prediction ledger. Public reads
 * — calibration transparency is a feature, not a secret.
 */
@Injectable()
export class ModelsService {
  constructor(private readonly db: DbService) {}

  /** Record a model prediction (called internally when the app forecasts). */
  async logPrediction(input: {
    model: string;
    subjectKind: string;
    subjectId: string;
    predictedProb: number;
  }) {
    if (input.model !== 'valuation' && input.model !== 'slip') {
      throw new BadRequestException('model must be valuation|slip');
    }
    if (!(input.predictedProb >= 0 && input.predictedProb <= 1)) {
      throw new BadRequestException('predictedProb must be in [0,1]');
    }
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `INSERT INTO model_predictions (model, subject_kind, subject_id, predicted_prob)
         VALUES ($1::model_name, $2, $3, $4)
         RETURNING id, made_at`,
        [input.model, input.subjectKind, input.subjectId, input.predictedProb],
      );
      return res.rows[0];
    });
  }

  /** Stamp the realized outcome once a subject resolves. */
  async resolve(predictionId: string, outcome: number) {
    if (outcome !== 0 && outcome !== 1) throw new BadRequestException('outcome must be 0|1');
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `UPDATE model_predictions SET outcome = $2, resolved_at = now()
          WHERE id = $1 AND outcome IS NULL
          RETURNING id, outcome, resolved_at`,
        [predictionId, outcome],
      );
      return res.rows[0] ?? null;
    });
  }

  /**
   * Published calibration for a model: Brier score, ECE, sample size, and the
   * reliability curve — all computed from the ledger.
   */
  async calibration(model: string) {
    if (model !== 'valuation' && model !== 'slip') {
      throw new BadRequestException('model must be valuation|slip');
    }
    return this.db.asAdmin(async (q) => {
      const agg = await q(
        `SELECT COUNT(*)::int AS n,
                COALESCE(AVG(POWER(predicted_prob - outcome, 2)), 0) AS brier,
                COALESCE(AVG(outcome::numeric), 0) AS base_rate
           FROM model_predictions
          WHERE model = $1::model_name AND outcome IS NOT NULL`,
        [model],
      );
      const curve = await q(
        `SELECT bucket, n, mean_predicted, observed_freq
           FROM model_reliability WHERE model = $1::model_name ORDER BY bucket`,
        [model],
      );
      const n = agg.rows[0].n as number;
      // ECE = sample-weighted mean |mean_predicted − observed_freq|.
      const ece =
        n === 0
          ? 0
          : curve.rows.reduce(
              (s: number, b: any) =>
                s + (Number(b.n) / n) * Math.abs(Number(b.mean_predicted) - Number(b.observed_freq)),
              0,
            );
      return {
        model,
        sampleSize: n,
        brier: Number(agg.rows[0].brier),
        ece,
        baseRate: Number(agg.rows[0].base_rate),
        curve: curve.rows,
      };
    });
  }
}
