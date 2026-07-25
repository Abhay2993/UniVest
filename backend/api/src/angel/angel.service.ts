import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * Angel investors — an accredited persona over `users`. Angels apply (which
 * requires an accredited standing on their profile), get early access to deals
 * before they open to the public, and can lead an SPV — committing capital and
 * earning carry on the profit they help raise. Reuses the existing
 * accreditation, campaign, and carry primitives.
 */
@Injectable()
export class AngelService {
  constructor(private readonly db: DbService) {}

  /** Apply as an angel. Requires an accredited (or higher) standing. */
  async apply(
    userId: string,
    body: { thesis?: string; committedCapital?: number; focusVerticals?: string[] },
  ) {
    return this.db.asAdmin(async (q) => {
      const users = await q(
        `SELECT accreditation FROM users WHERE id = $1`,
        [userId],
      );
      if (users.rows.length === 0) throw new NotFoundException('user not found');
      const accredited = users.rows[0].accreditation !== 'none';

      const committed = Number(body?.committedCapital ?? 0);
      if (!Number.isFinite(committed) || committed < 0) {
        throw new BadRequestException('committedCapital must be a non-negative number');
      }
      const verticals = Array.isArray(body?.focusVerticals)
        ? body!.focusVerticals!.map((v) => String(v)).slice(0, 12)
        : [];
      // Accredited applicants are activated immediately; others stay pending
      // until an accreditation check clears.
      const status = accredited ? 'active' : 'pending';

      const row = await q(
        `INSERT INTO angel_profiles (user_id, thesis, committed_capital, focus_verticals, status, verified_at)
         VALUES ($1, $2, $3, $4, $5::angel_status, CASE WHEN $5 = 'active' THEN now() ELSE NULL END)
         ON CONFLICT (user_id) DO UPDATE
           SET thesis = EXCLUDED.thesis,
               committed_capital = EXCLUDED.committed_capital,
               focus_verticals = EXCLUDED.focus_verticals,
               status = EXCLUDED.status,
               verified_at = COALESCE(angel_profiles.verified_at, EXCLUDED.verified_at)
         RETURNING user_id, thesis, committed_capital, focus_verticals, status, verified_at, created_at`,
        [userId, body?.thesis ?? null, committed, verticals, status],
      );
      return { accredited, ...this.shapeProfile(row.rows[0]) };
    });
  }

  async me(userId: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT user_id, thesis, committed_capital, focus_verticals, status, verified_at, created_at
           FROM angel_profiles WHERE user_id = $1`,
        [userId],
      );
      if (rows.rows.length === 0) throw new NotFoundException('not an angel — apply first');
      return this.shapeProfile(rows.rows[0]);
    });
  }

  /**
   * Early-access deal flow: campaigns inside their angel-only window
   * (opens_to_angels_at ≤ now < public_opens_at). Active angels only.
   */
  async dealflow(userId: string) {
    return this.db.asAdmin(async (q) => {
      await this.requireActiveAngel(q, userId);
      const rows = await q(
        `SELECT c.id AS campaign_id, s.name AS company, s.vertical, s.tagline,
                c.target_amount, c.raised_amount,
                d.public_opens_at, d.min_ticket, d.allocation_units,
                EXISTS (SELECT 1 FROM spv_leads l
                          WHERE l.campaign_id = c.id AND l.angel_user_id = $1) AS i_lead
           FROM angel_deals d
           JOIN campaigns c ON c.id = d.campaign_id
           JOIN startups  s ON s.id = c.startup_id
          WHERE d.opens_to_angels_at <= now() AND d.public_opens_at > now()
          ORDER BY d.public_opens_at ASC`,
        [userId],
      );
      return {
        object: 'list',
        data: rows.rows.map((r) => ({
          campaignId: r.campaign_id,
          company: r.company,
          vertical: r.vertical,
          tagline: r.tagline,
          targetAmount: Number(r.target_amount),
          raisedAmount: Number(r.raised_amount),
          publicOpensAt: r.public_opens_at,
          minTicket: Number(r.min_ticket),
          allocationUnits: r.allocation_units == null ? null : Number(r.allocation_units),
          iLead: r.i_lead,
        })),
      };
    });
  }

  /** Lead (or co-lead) a deal: commit capital and set the carry earned as lead. */
  async lead(
    userId: string,
    campaignId: string,
    body: { committedAmount?: number; carryPct?: number },
  ) {
    return this.db.asAdmin(async (q) => {
      await this.requireActiveAngel(q, userId);

      const committed = Number(body?.committedAmount);
      if (!Number.isFinite(committed) || committed <= 0) {
        throw new BadRequestException('committedAmount must be a positive number');
      }
      const carryPct = body?.carryPct == null ? 20 : Number(body.carryPct);
      if (!Number.isFinite(carryPct) || carryPct < 0 || carryPct > 30) {
        throw new BadRequestException('carryPct must be between 0 and 30');
      }

      const deal = await q(
        `SELECT d.min_ticket, c.id
           FROM angel_deals d JOIN campaigns c ON c.id = d.campaign_id
          WHERE c.id = $1`,
        [campaignId],
      );
      if (deal.rows.length === 0) throw new NotFoundException('campaign is not open to angels');
      if (committed < Number(deal.rows[0].min_ticket)) {
        throw new BadRequestException(`committedAmount is below the ${deal.rows[0].min_ticket} minimum ticket`);
      }

      const existing = await q(
        `SELECT id FROM spv_leads WHERE campaign_id = $1 AND angel_user_id = $2`,
        [campaignId, userId],
      );
      if (existing.rows.length > 0) {
        throw new BadRequestException('you already lead this deal');
      }

      const inserted = await q(
        `INSERT INTO spv_leads (campaign_id, angel_user_id, committed_amount, carry_pct, status)
         VALUES ($1, $2, $3, $4, 'committed')
         RETURNING id, campaign_id, committed_amount, carry_pct, status, created_at`,
        [campaignId, userId, committed, carryPct],
      );
      return this.shapeLead(inserted.rows[0]);
    });
  }

  async myLeads(userId: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT l.id, l.campaign_id, l.committed_amount, l.carry_pct, l.status, l.created_at,
                s.name AS company
           FROM spv_leads l
           JOIN campaigns c ON c.id = l.campaign_id
           JOIN startups  s ON s.id = c.startup_id
          WHERE l.angel_user_id = $1
          ORDER BY l.created_at DESC`,
        [userId],
      );
      return { object: 'list', data: rows.rows.map((r) => ({ company: r.company, ...this.shapeLead(r) })) };
    });
  }

  private async requireActiveAngel(q: any, userId: string) {
    const rows = await q(`SELECT status FROM angel_profiles WHERE user_id = $1`, [userId]);
    if (rows.rows.length === 0) throw new NotFoundException('not an angel — apply first');
    if (rows.rows[0].status !== 'active') {
      throw new ForbiddenException('angel account is not active yet');
    }
  }

  private shapeProfile(row: any) {
    return {
      object: 'angel',
      userId: row.user_id,
      thesis: row.thesis,
      committedCapital: Number(row.committed_capital),
      focusVerticals: row.focus_verticals ?? [],
      status: row.status,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
    };
  }

  private shapeLead(row: any) {
    return {
      object: 'spv_lead',
      id: row.id,
      campaignId: row.campaign_id,
      committedAmount: Number(row.committed_amount),
      carryPct: Number(row.carry_pct),
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
