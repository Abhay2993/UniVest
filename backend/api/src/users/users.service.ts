import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * Reg CF annual limit (post-2021 SEC thresholds) — the server-side source of
 * truth; the mobile app mirrors it for the onboarding result screen.
 */
export function computeInvestmentLimit(annualIncome: number, netWorth: number): number {
  const THRESHOLD = 124_000;
  const CAP = 124_000;
  const FLOOR = 2_500;
  const greater = Math.max(annualIncome, netWorth);
  if (annualIncome >= THRESHOLD || netWorth >= THRESHOLD) {
    return Math.min(Math.round(greater * 0.1), CAP);
  }
  return Math.max(FLOOR, Math.round(greater * 0.05));
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  me(userId: string) {
    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `SELECT id, full_name, role, kyc_status, accreditation,
                suitability_score, invest_limit_annual
           FROM users WHERE id = $1`,
        [userId],
      );
      if (res.rows.length === 0) throw new NotFoundException('user not found');
      return res.rows[0];
    });
  }

  /** Suitability outcome: stores quiz score and the computed Reg CF limit. */
  async suitability(userId: string, annualIncome: number, netWorth: number, quizScore: number) {
    if (![annualIncome, netWorth].every((n) => Number.isFinite(n) && n >= 0)) {
      throw new BadRequestException('annualIncome and netWorth must be non-negative numbers');
    }
    if (!Number.isInteger(quizScore) || quizScore < 0 || quizScore > 5) {
      throw new BadRequestException('quizScore must be an integer 0–5');
    }
    const limit = computeInvestmentLimit(annualIncome, netWorth);
    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `UPDATE users
            SET suitability_score = $2, suitability_quiz_at = now(),
                annual_income = $3, net_worth = $4, invest_limit_annual = $5
          WHERE id = $1
          RETURNING id, suitability_score, invest_limit_annual`,
        [userId, quizScore * 20, annualIncome, netWorth, limit],
      );
      if (res.rows.length === 0) throw new NotFoundException('user not found');
      return res.rows[0];
    });
  }

  /** Simulates the Persona signed webhook (production verifies the signature). */
  async kycWebhook(userRef: string, status: string) {
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw new BadRequestException('status must be approved|rejected|pending');
    }
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `UPDATE users
            SET kyc_status = $2::kyc_status,
                kyc_approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE kyc_approved_at END
          WHERE id = $1
          RETURNING id, kyc_status`,
        [userRef, status],
      );
      if (res.rows.length === 0) throw new NotFoundException('user not found');
      return res.rows[0];
    });
  }
}
