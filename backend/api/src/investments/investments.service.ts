import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class InvestmentsService {
  constructor(private readonly db: DbService) {}

  /**
   * Place a commitment. Enforced here AND in the database:
   * KYC approved, campaign live, ticket within bounds, rolling Reg CF limit;
   * admin fee (campaign %) computed at order time; the cooling-off deadline
   * is stamped by the DB trigger and returned to the client.
   */
  async create(userId: string, campaignId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    return this.db.asUser(userId, async (q) => {
      const campaign = await q(
        `SELECT status, min_investment, max_investment, admin_fee_pct
           FROM campaigns WHERE id = $1`,
        [campaignId],
      );
      if (campaign.rows.length === 0) throw new NotFoundException('campaign not found');
      const c = campaign.rows[0];
      if (c.status !== 'live') throw new ConflictException('campaign is not open for investment');
      if (amount < Number(c.min_investment) || amount > Number(c.max_investment)) {
        throw new BadRequestException(
          `ticket must be between ${c.min_investment} and ${c.max_investment}`,
        );
      }

      const me = await q(
        `SELECT kyc_status, invest_limit_annual FROM users WHERE id = $1`,
        [userId],
      );
      if (me.rows[0]?.kyc_status !== 'approved') {
        throw new ForbiddenException('identity verification required before investing');
      }
      const limit = me.rows[0].invest_limit_annual;
      if (limit !== null) {
        const prior = await q(
          `SELECT COALESCE(SUM(amount), 0) AS committed
             FROM investments
            WHERE investor_id = $1
              AND status IN ('pending_payment', 'escrowed', 'settled')
              AND created_at > now() - INTERVAL '365 days'`,
          [userId],
        );
        const committed = Number(prior.rows[0].committed);
        if (committed + amount > Number(limit)) {
          throw new UnprocessableEntityException(
            `exceeds your Reg CF annual limit: ${committed} already committed of ${limit}`,
          );
        }
      }

      const adminFee = Math.round(amount * Number(c.admin_fee_pct)) / 100;
      const inserted = await q(
        `INSERT INTO investments (campaign_id, investor_id, status, amount, admin_fee_amount, escrowed_at)
         VALUES ($1, $2, 'escrowed', $3, $4, now())
         RETURNING id, status, amount, admin_fee_amount, cancellable_until, created_at`,
        [campaignId, userId, amount, adminFee],
      );
      return inserted.rows[0];
    });
  }

  /** Reg CF cancellation — the DB trigger is the final arbiter of the 48h window. */
  async cancel(userId: string, investmentId: string) {
    try {
      return await this.db.asUser(userId, async (q) => {
        const res = await q(
          `UPDATE investments SET status = 'cancelled'
            WHERE id = $1 AND status IN ('pending_kyc', 'pending_payment', 'escrowed')
            RETURNING id, status, cancelled_at`,
          [investmentId],
        );
        if (res.rows.length === 0) throw new NotFoundException('no cancellable investment found');
        return res.rows[0];
      });
    } catch (err: any) {
      if (err?.code === '23514') {
        throw new ConflictException('cancellation window closed (Reg CF 48h rule)');
      }
      throw err;
    }
  }

  /** Holdings with latest NAV marks (RLS-scoped view) plus open commitments. */
  async portfolio(userId: string) {
    return this.db.asUser(userId, async (q) => {
      const positions = await q(
        `SELECT p.spv_id, s.legal_name, p.units, p.cost_basis,
                p.nav_per_unit, p.marked_as_of, p.current_value, p.unrealized_multiple
           FROM investor_position_metrics p
           JOIN spvs s ON s.id = p.spv_id
          ORDER BY p.current_value DESC`,
      );
      const commitments = await q(
        `SELECT i.id, i.amount, i.admin_fee_amount, i.status, i.cancellable_until,
                c.closes_at, st.name AS startup
           FROM investments i
           JOIN campaigns c ON c.id = i.campaign_id
           JOIN startups st ON st.id = c.startup_id
          WHERE i.status IN ('pending_payment', 'escrowed')
          ORDER BY i.created_at DESC`,
      );
      const taxDocuments = await q(
        `SELECT t.tax_year, t.kind, t.issued_at, s.legal_name
           FROM tax_documents t
           LEFT JOIN spvs s ON s.id = t.spv_id
          ORDER BY t.tax_year DESC`,
      );
      return {
        positions: positions.rows,
        commitments: commitments.rows,
        taxDocuments: taxDocuments.rows,
      };
    });
  }
}
