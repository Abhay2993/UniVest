import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class OfferingsService {
  constructor(private readonly db: DbService) {}

  /** Public catalog: live campaigns with their startup and university. */
  list() {
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `SELECT c.id, s.name, s.slug, s.vertical, s.tagline,
                u.name AS university, u.short_name AS university_short, u.country_code,
                c.target_amount, c.raised_amount, c.min_investment, c.max_investment,
                c.price_per_unit, c.closes_at, c.success_fee_pct, c.admin_fee_pct,
                c.university_equity_pct, c.template
           FROM campaigns c
           JOIN startups s ON s.id = c.startup_id
           JOIN universities u ON u.id = s.university_id
          WHERE c.status = 'live'
          ORDER BY c.closes_at`,
      );
      return res.rows;
    });
  }

  /** Full offering detail: pitch, milestones + attestations, public Q&A. */
  async detail(campaignId: string) {
    return this.db.asAdmin(async (q) => {
      const campaign = await q(
        `SELECT c.*, s.name, s.slug, s.vertical, s.tagline, s.founder_user_id,
                s.pitch_plain_english, s.pitch_commercialization, s.pitch_lab_proof,
                u.name AS university, u.country_code
           FROM campaigns c
           JOIN startups s ON s.id = c.startup_id
           JOIN universities u ON u.id = s.university_id
          WHERE c.id = $1`,
        [campaignId],
      );
      if (campaign.rows.length === 0) throw new NotFoundException('offering not found');
      const row = campaign.rows[0];

      const milestones = await q(
        `SELECT m.id, m.position, m.title, m.description, m.status,
                m.target_date, m.completed_at, m.video_update_url,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                     'attestorName', a.attestor_name,
                     'attestorOrg',  a.attestor_org,
                     'role',         a.attestor_role,
                     'keyId',        a.key_id,
                     'signedAt',     a.signed_at))
                     FROM milestone_attestations a WHERE a.milestone_id = m.id),
                  '[]'::json) AS attestations
           FROM milestones m
          WHERE m.startup_id = $1
          ORDER BY m.position`,
        [row.startup_id],
      );

      const questions = await q(
        `SELECT dq.id, dq.body, dq.upvotes, dq.created_at,
                au.full_name AS author,
                CASE WHEN dq.author_id = $2 THEN 'founder'
                     WHEN au.role = 'tto' THEN 'tto'
                     ELSE 'investor' END AS badge,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                       'body', da.body,
                       'author', ans.full_name,
                       'badge', CASE WHEN da.author_id = $2 THEN 'founder'
                                     WHEN ans.role = 'tto' THEN 'tto'
                                     ELSE 'investor' END,
                       'createdAt', da.created_at) ORDER BY da.created_at)
                     FROM deal_answers da JOIN users ans ON ans.id = da.author_id
                    WHERE da.question_id = dq.id AND da.hidden_at IS NULL),
                  '[]'::json) AS answers
           FROM deal_questions dq
           JOIN users au ON au.id = dq.author_id
          WHERE dq.campaign_id = $1 AND dq.hidden_at IS NULL
          ORDER BY dq.created_at DESC`,
        [campaignId, row.founder_user_id],
      );

      return { ...row, milestones: milestones.rows, questions: questions.rows };
    });
  }

  /** Post a public diligence question as the calling user (RLS-checked). */
  async addQuestion(userId: string, campaignId: string, body: string) {
    if (typeof body !== 'string' || body.trim().length < 10 || body.length > 4000) {
      throw new BadRequestException('question must be 10–4000 characters');
    }
    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `INSERT INTO deal_questions (campaign_id, author_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, body, upvotes, created_at`,
        [campaignId, userId, body.trim()],
      );
      return res.rows[0];
    });
  }
}
