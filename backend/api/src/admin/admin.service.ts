import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class AdminService {
  constructor(private readonly db: DbService) {}

  /** Ops actions require a real admin row — the role is read from the
   *  database, never trusted from the client. */
  private async requireAdmin(userId: string): Promise<void> {
    const isAdmin = await this.db.asAdmin(async (q) => {
      const res = await q<{ role: string }>(
        'SELECT role FROM users WHERE id = $1 AND deactivated_at IS NULL',
        [userId],
      );
      return res.rows[0]?.role === 'admin';
    });
    if (!isAdmin) throw new ForbiddenException('admin role required');
  }

  /** KYC exceptions: retail users the automated flow has not cleared. */
  async pendingKyc(adminId: string) {
    await this.requireAdmin(adminId);
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `SELECT id, full_name, email, country_code, kyc_status, created_at
           FROM users
          WHERE role = 'retail' AND kyc_status IN ('not_started', 'pending')
          ORDER BY created_at`,
      );
      return res.rows;
    });
  }

  /** Moderation hides preserve the audit trail — never a delete. */
  async hideQuestion(adminId: string, questionId: string, reason: string) {
    await this.requireAdmin(adminId);
    if (typeof reason !== 'string' || reason.trim().length < 3) {
      throw new BadRequestException('a moderation reason is required');
    }
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `UPDATE deal_questions
            SET hidden_at = now(), hidden_reason = $2
          WHERE id = $1 AND hidden_at IS NULL
          RETURNING id, hidden_at, hidden_reason`,
        [questionId, reason.trim()],
      );
      if (res.rows.length === 0) throw new NotFoundException('question not found or already hidden');
      return res.rows[0];
    });
  }

  /** Campaign approval: tto_review → live. */
  async approveCampaign(adminId: string, campaignId: string) {
    await this.requireAdmin(adminId);
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `UPDATE campaigns
            SET status = 'live', opens_at = COALESCE(opens_at, now())
          WHERE id = $1 AND status = 'tto_review'
          RETURNING id, status, opens_at, closes_at`,
        [campaignId],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException('campaign not found or not awaiting review');
      }
      return res.rows[0];
    });
  }
}
