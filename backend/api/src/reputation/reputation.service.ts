import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, Query } from '../db/db.service';
import {
  EMPTY_COUNTS,
  ReputationBand,
  ReputationCounts,
  reputationBand,
  reputationScore,
} from './reputation.util';

export type SubjectKind = 'founder' | 'attestor' | 'investor';
const KINDS: SubjectKind[] = ['founder', 'attestor', 'investor'];

function assertKind(kind: string): SubjectKind {
  if (!KINDS.includes(kind as SubjectKind)) {
    throw new BadRequestException(`subjectKind must be one of ${KINDS.join(', ')}`);
  }
  return kind as SubjectKind;
}

export interface TrustProfile {
  subjectKind: SubjectKind;
  subjectId: string;
  name: string | null;
  score: number;
  band: ReputationBand;
  counts: ReputationCounts;
  followers: number;
  endorsements: { endorserName: string | null; note: string; createdAt: string }[];
  recentEvents: { eventType: string; sourceRef: string | null; occurredAt: string }[];
}

@Injectable()
export class ReputationService {
  constructor(private readonly db: DbService) {}

  private async countsFor(q: Query, kind: SubjectKind, id: string): Promise<ReputationCounts> {
    const res = await q(
      `SELECT completed, attested, replicated, slipped, deals_led, endorsements
         FROM reputation_event_counts
        WHERE subject_kind = $1 AND subject_id = $2`,
      [kind, id],
    );
    const r = res.rows[0];
    if (!r) return { ...EMPTY_COUNTS };
    return {
      completed: Number(r.completed),
      attested: Number(r.attested),
      replicated: Number(r.replicated),
      slipped: Number(r.slipped),
      dealsLed: Number(r.deals_led),
      endorsements: Number(r.endorsements),
    };
  }

  /** Full trust profile for a subject: score, breakdown, followers, endorsements. */
  async profile(kindRaw: string, id: string): Promise<TrustProfile> {
    const kind = assertKind(kindRaw);
    return this.db.asAdmin(async (q) => {
      const who = await q('SELECT full_name FROM users WHERE id = $1', [id]);
      if (who.rowCount === 0) throw new NotFoundException('subject not found');
      const counts = await this.countsFor(q, kind, id);
      const followers = await q(
        'SELECT COUNT(*)::int AS n FROM follows WHERE subject_kind = $1 AND subject_id = $2',
        [kind, id],
      );
      const endorsements = await q(
        `SELECT e.note, e.created_at, u.full_name AS endorser_name
           FROM endorsements e LEFT JOIN users u ON u.id = e.endorser_id
          WHERE e.subject_kind = $1 AND e.subject_id = $2
          ORDER BY e.created_at DESC LIMIT 20`,
        [kind, id],
      );
      const events = await q(
        `SELECT event_type, source_ref, occurred_at
           FROM reputation_events
          WHERE subject_kind = $1 AND subject_id = $2
          ORDER BY occurred_at DESC LIMIT 20`,
        [kind, id],
      );
      const score = reputationScore(counts);
      return {
        subjectKind: kind,
        subjectId: id,
        name: who.rows[0].full_name ?? null,
        score,
        band: reputationBand(score),
        counts,
        followers: followers.rows[0].n,
        endorsements: endorsements.rows.map((e: any) => ({
          endorserName: e.endorser_name ?? null,
          note: e.note,
          createdAt: new Date(e.created_at).toISOString(),
        })),
        recentEvents: events.rows.map((e: any) => ({
          eventType: e.event_type,
          sourceRef: e.source_ref ?? null,
          occurredAt: new Date(e.occurred_at).toISOString(),
        })),
      };
    });
  }

  /** Ranked subjects of a kind by trust score (social-proof leaderboard). */
  async leaderboard(kindRaw: string, limit = 10) {
    const kind = assertKind(kindRaw);
    return this.db.asAdmin(async (q) => {
      const res = await q(
        `SELECT c.subject_id, u.full_name,
                c.completed, c.attested, c.replicated, c.slipped, c.deals_led, c.endorsements,
                (SELECT COUNT(*)::int FROM follows f
                  WHERE f.subject_kind = c.subject_kind AND f.subject_id = c.subject_id) AS followers
           FROM reputation_event_counts c
           LEFT JOIN users u ON u.id = c.subject_id
          WHERE c.subject_kind = $1`,
        [kind],
      );
      return res.rows
        .map((r: any) => {
          const counts: ReputationCounts = {
            completed: Number(r.completed),
            attested: Number(r.attested),
            replicated: Number(r.replicated),
            slipped: Number(r.slipped),
            dealsLed: Number(r.deals_led),
            endorsements: Number(r.endorsements),
          };
          const score = reputationScore(counts);
          return {
            subjectId: r.subject_id,
            name: r.full_name ?? null,
            score,
            band: reputationBand(score),
            followers: r.followers,
          };
        })
        .sort((a, b) => b.score - a.score || b.followers - a.followers)
        .slice(0, limit);
    });
  }

  /** Follow a subject (idempotent, RLS-scoped to the caller). */
  async follow(userId: string, kindRaw: string, subjectId: string) {
    const kind = assertKind(kindRaw);
    if (userId === subjectId) throw new BadRequestException('cannot follow yourself');
    await this.db.asUser(userId, (q) =>
      q(
        `INSERT INTO follows (follower_id, subject_kind, subject_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, kind, subjectId],
      ),
    );
    return { following: true };
  }

  async unfollow(userId: string, kindRaw: string, subjectId: string) {
    const kind = assertKind(kindRaw);
    await this.db.asUser(userId, (q) =>
      q(
        'DELETE FROM follows WHERE follower_id = $1 AND subject_kind = $2 AND subject_id = $3',
        [userId, kind, subjectId],
      ),
    );
    return { following: false };
  }

  /** Post an endorsement (web-of-trust). Also logs a reputation event. */
  async endorse(userId: string, kindRaw: string, subjectId: string, note: string) {
    const kind = assertKind(kindRaw);
    const body = (note ?? '').trim();
    if (body.length < 3 || body.length > 280) {
      throw new BadRequestException('note must be 3–280 characters');
    }
    if (userId === subjectId) throw new BadRequestException('cannot endorse yourself');
    await this.db.asUser(userId, (q) =>
      q(
        `INSERT INTO endorsements (endorser_id, subject_kind, subject_id, note)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endorser_id, subject_kind, subject_id)
         DO UPDATE SET note = EXCLUDED.note, created_at = now()`,
        [userId, kind, subjectId, body],
      ),
    );
    // The endorsement is a reputation event for the subject (system-logged).
    await this.db.asAdmin((q) =>
      q(
        `INSERT INTO reputation_events (subject_kind, subject_id, event_type, source_ref)
         VALUES ($1, $2, 'endorsement_received', $3)`,
        [kind, subjectId, `endorsement:${userId}`],
      ),
    );
    return this.profile(kind, subjectId);
  }

  /** The caller's feed: recent reputation events for subjects they follow. */
  async feed(userId: string) {
    // The follow set is read under the caller's identity (RLS follows_own);
    // the public reputation events + subject names are then resolved as admin
    // (the users table's RLS otherwise hides other users' names in the feed).
    const subjects = await this.db.asUser(userId, async (q) => {
      const res = await q(
        'SELECT subject_kind, subject_id FROM follows WHERE follower_id = $1',
        [userId],
      );
      return res.rows as { subject_kind: SubjectKind; subject_id: string }[];
    });
    if (subjects.length === 0) return [];

    return this.db.asAdmin(async (q) => {
      const conds = subjects
        .map((_, i) => `(e.subject_kind = $${2 * i + 1} AND e.subject_id = $${2 * i + 2})`)
        .join(' OR ');
      const params = subjects.flatMap((s) => [s.subject_kind, s.subject_id]);
      const res = await q(
        `SELECT e.subject_kind, e.subject_id, u.full_name, e.event_type, e.source_ref, e.occurred_at
           FROM reputation_events e
           LEFT JOIN users u ON u.id = e.subject_id
          WHERE ${conds}
          ORDER BY e.occurred_at DESC
          LIMIT 50`,
        params,
      );
      return res.rows.map((r: any) => ({
        subjectKind: r.subject_kind,
        subjectId: r.subject_id,
        name: r.full_name ?? null,
        eventType: r.event_type,
        sourceRef: r.source_ref ?? null,
        occurredAt: new Date(r.occurred_at).toISOString(),
      }));
    });
  }
}
