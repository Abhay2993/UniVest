import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * University OS — the supply-side surface. A TTO's whole spinout book
 * (on- and off-platform), its aggregate equity value, and the cross-university
 * consortia it participates in. Read as the university's TTO members / admins.
 */
@Injectable()
export class UniversityService {
  constructor(private readonly db: DbService) {}

  /** Full portfolio + rolled-up value for a university. */
  async portfolio(universityId: string) {
    return this.db.asAdmin(async (q) => {
      const uni = await q(`SELECT id, name FROM universities WHERE id = $1`, [universityId]);
      if (uni.rows.length === 0) throw new NotFoundException('university not found');

      const companies = await q(
        `SELECT id, name, vertical, stage, on_platform, raised_to_date, post_money,
                pct_founders, pct_university, pct_option_pool, pct_investors,
                milestones_completed, milestones_total, next_milestone, last_update
           FROM tto_portfolio_companies
          WHERE university_id = $1
          ORDER BY post_money DESC`,
        [universityId],
      );
      const summary = await q(
        `SELECT spinouts, on_platform, total_raised, portfolio_value, university_equity_value
           FROM university_portfolio_value WHERE university_id = $1`,
        [universityId],
      );
      return {
        university: uni.rows[0],
        summary: summary.rows[0] ?? {
          spinouts: 0,
          on_platform: 0,
          total_raised: 0,
          portfolio_value: 0,
          university_equity_value: 0,
        },
        companies: companies.rows,
      };
    });
  }

  /** Consortia a university participates in, with member lists. */
  async consortia(universityId: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT c.id, c.name, c.thesis, c.vertical, c.committed_capital, c.deals,
                lead.short_name AS lead_university,
                (SELECT json_agg(u.short_name ORDER BY u.short_name)
                   FROM consortium_members m JOIN universities u ON u.id = m.university_id
                  WHERE m.consortium_id = c.id) AS members
           FROM consortia c
           JOIN universities lead ON lead.id = c.lead_university_id
          WHERE EXISTS (
                  SELECT 1 FROM consortium_members m
                   WHERE m.consortium_id = c.id AND m.university_id = $1)
          ORDER BY c.committed_capital DESC`,
        [universityId],
      );
      return rows.rows;
    });
  }
}
