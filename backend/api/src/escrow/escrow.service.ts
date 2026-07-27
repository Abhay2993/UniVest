import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService, Query } from '../db/db.service';
import { isReleasable, summarizeEscrow, TrancheStatus } from './escrow.util';

export interface TrancheView {
  id: string;
  position: number;
  label: string;
  releasePct: number;
  status: TrancheStatus;
  amount: number;
  releasedAt: string | null;
  milestone: { id: string; title: string; status: string; attested: boolean } | null;
  releasable: boolean;
}

@Injectable()
export class EscrowService {
  constructor(private readonly db: DbService) {}

  /** Ops actions require a real admin row — the role is read from the DB. */
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

  private async loadSchedule(q: Query, campaignId: string) {
    const campaign = await q<{ escrow_total: string }>(
      'SELECT target_amount AS escrow_total FROM campaigns WHERE id = $1',
      [campaignId],
    );
    if (campaign.rowCount === 0) throw new NotFoundException('campaign not found');
    const escrowTotal = Number(campaign.rows[0].escrow_total);

    const rows = await q(
      `SELECT t.id, t.position, t.label, t.release_pct, t.status, t.released_amount, t.released_at,
              m.id AS milestone_id, m.title AS milestone_title, m.status AS milestone_status,
              (a.id IS NOT NULL) AS attested
         FROM escrow_tranches t
         LEFT JOIN milestones m ON m.id = t.milestone_id
         LEFT JOIN LATERAL (SELECT id FROM milestone_attestations
                             WHERE milestone_id = t.milestone_id LIMIT 1) a ON TRUE
        WHERE t.campaign_id = $1
        ORDER BY t.position`,
      [campaignId],
    );

    const tranches: TrancheView[] = rows.rows.map((r: any) => {
      const releasePct = Number(r.release_pct);
      const releasedAmount = r.released_amount == null ? null : Number(r.released_amount);
      const status = r.status as TrancheStatus;
      const hasMilestone = r.milestone_id != null;
      const attested = Boolean(r.attested);
      const amount =
        releasedAmount != null
          ? releasedAmount
          : Math.round(((escrowTotal * releasePct) / 100) * 100) / 100;
      return {
        id: r.id,
        position: r.position,
        label: r.label,
        releasePct,
        status,
        amount,
        releasedAt: r.released_at ? new Date(r.released_at).toISOString() : null,
        milestone: hasMilestone
          ? { id: r.milestone_id, title: r.milestone_title, status: r.milestone_status, attested }
          : null,
        releasable: isReleasable({ status, hasMilestone, milestoneAttested: attested }),
      };
    });

    const summary = summarizeEscrow(
      tranches.map((t) => ({
        releasePct: t.releasePct,
        status: t.status,
        releasedAmount: t.status === 'released' || t.status === 'refunded' ? t.amount : null,
      })),
      escrowTotal,
    );
    return { summary, tranches };
  }

  /** Public escrow schedule + roll-up for a campaign. */
  async schedule(campaignId: string) {
    return this.db.asAdmin((q) => this.loadSchedule(q, campaignId));
  }

  private async transition(
    adminId: string,
    trancheId: string,
    target: 'released' | 'refunded',
  ) {
    await this.requireAdmin(adminId);
    return this.db.asAdmin(async (q) => {
      const cur = await q<{
        campaign_id: string;
        release_pct: string;
        status: TrancheStatus;
        escrow_total: string;
      }>(
        `SELECT t.campaign_id, t.release_pct, t.status, c.target_amount AS escrow_total
           FROM escrow_tranches t JOIN campaigns c ON c.id = t.campaign_id
          WHERE t.id = $1`,
        [trancheId],
      );
      if (cur.rowCount === 0) throw new NotFoundException('tranche not found');
      const row = cur.rows[0];
      if (row.status !== 'held') {
        throw new ConflictException(`tranche is already ${row.status}`);
      }
      const snapshot =
        Math.round(((Number(row.escrow_total) * Number(row.release_pct)) / 100) * 100) / 100;
      try {
        await q(
          `UPDATE escrow_tranches
              SET status = $2, released_amount = $3, released_at = now()
            WHERE id = $1`,
          [trancheId, target, snapshot],
        );
      } catch (e: any) {
        // The release trigger rejects an unattested milestone as check_violation.
        if (e?.code === '23514') {
          throw new ConflictException('tranche milestone is not attested yet');
        }
        throw e;
      }
      return this.loadSchedule(q, row.campaign_id);
    });
  }

  /** Release a held tranche to the company (gated on milestone attestation). */
  release(adminId: string, trancheId: string) {
    return this.transition(adminId, trancheId, 'released');
  }

  /** Refund a held tranche to investors (e.g. a milestone that failed). */
  refund(adminId: string, trancheId: string) {
    return this.transition(adminId, trancheId, 'refunded');
  }
}
