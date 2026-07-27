import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, Query } from '../db/db.service';
import {
  Citation,
  EvidenceChunk,
  rankEvidence,
  selectEvidence,
  toCitation,
} from './retrieval';
import { generateWithClaude, synthesizeGrounded } from './generate';

export interface CopilotAsk {
  answer: string;
  grounded: boolean;
  model: string;
  citations: Citation[];
  /** All source labels considered, for the "N indexed sources" affordance. */
  sourceCount: number;
}

/**
 * Diligence copilot — grounded RAG over a deal's evidence bundle. Retrieval runs
 * over a unified corpus assembled from the data room, milestone attestations,
 * independent replication, the FTO landscape, talent flow, and the knowledge
 * graph; generation is Claude when a key is configured, else deterministic
 * grounded synthesis. Every exchange is persisted with its citations so answers
 * are auditable (RLS: a user reads only their own history).
 */
@Injectable()
export class CopilotService {
  constructor(private readonly db: DbService) {}

  /** Assemble the full evidence corpus for a campaign's deal. */
  private async buildCorpus(q: Query, campaignId: string) {
    const campaign = await q(
      `SELECT c.id, c.startup_id, c.university_equity_pct, c.target_amount, c.price_per_unit,
              s.name AS startup_name, s.vertical, s.tagline, s.university_id,
              u.name AS university_name, u.short_name AS university_short, u.country_code
         FROM campaigns c
         JOIN startups s     ON s.id = c.startup_id
         JOIN universities u ON u.id = s.university_id
        WHERE c.id = $1`,
      [campaignId],
    );
    if (campaign.rowCount === 0) throw new NotFoundException('campaign not found');
    const deal = campaign.rows[0];
    const startupId = deal.startup_id as string;
    const corpus: EvidenceChunk[] = [];

    // 1. Data room
    const docs = await q(
      `SELECT title, section, excerpt, keywords, kind
         FROM data_room_documents
        WHERE campaign_id = $1 AND excerpt IS NOT NULL
        ORDER BY uploaded_at`,
      [campaignId],
    );
    for (const d of docs.rows) {
      corpus.push({
        kind: 'document',
        ref: d.title,
        section: d.section ?? d.kind,
        text: d.excerpt,
        keywords: (d.keywords as string[]) ?? [],
      });
    }

    // 2. Milestone attestations (cryptographically signed evidence)
    const atts = await q(
      `SELECT m.title AS milestone_title, m.description, a.attestor_name, a.attestor_org,
              a.attestor_role, k.fingerprint
         FROM milestone_attestations a
         JOIN milestones m    ON m.id = a.milestone_id
         JOIN attestor_keys k ON k.key_id = a.key_id
        WHERE m.startup_id = $1
        ORDER BY a.signed_at`,
      [startupId],
    );
    for (const a of atts.rows) {
      corpus.push({
        kind: 'attestation',
        ref: `Attestation · ${a.attestor_org}`,
        section: a.milestone_title,
        text:
          `Milestone "${a.milestone_title}" (${a.description}) is attested by ${a.attestor_name}, ` +
          `${a.attestor_role.toUpperCase()} at ${a.attestor_org}, under registered Ed25519 key ` +
          `${a.fingerprint}. The signature verifies against the evidence bundle.`,
        keywords: ['attestation', 'verified', 'signed', 'milestone', 'proof', 'independent'],
      });
    }

    // 3. Independent replication
    const reps = await q(
      `SELECT milestone_title, lab_name, status, result
         FROM replication_studies WHERE startup_id = $1 ORDER BY created_at`,
      [startupId],
    );
    for (const r of reps.rows) {
      const done = r.status === 'replicated';
      corpus.push({
        kind: 'replication',
        ref: `Replication · ${r.lab_name}`,
        section: r.milestone_title,
        text: done
          ? `Independently replicated at ${r.lab_name}: ${r.result ?? 'result confirmed.'}`
          : `A replication of "${r.milestone_title}" at ${r.lab_name} is ${r.status.replace('_', ' ')}.`,
        keywords: ['replication', 'replicated', 'independent', 'reproduce', 'verified', 'milestone'],
      });
    }

    // 4. Freedom-to-operate landscape + SQL-computed clearance
    const patents = await q(
      `SELECT title, assignee, relation, jurisdiction FROM fto_patents WHERE startup_id = $1`,
      [startupId],
    );
    const clearance = await q(
      `SELECT owned, blocking, adjacent, clearance_score
         FROM startup_fto_clearance WHERE startup_id = $1`,
      [startupId],
    );
    if (patents.rows.length > 0) {
      const cl = clearance.rows[0] ?? { owned: 0, blocking: 0, adjacent: 0, clearance_score: 100 };
      const list = patents.rows
        .map((p: any) => `${p.title} (${p.assignee}, ${p.relation}, ${p.jurisdiction})`)
        .join('; ');
      corpus.push({
        kind: 'fto',
        ref: 'Freedom-to-Operate Landscape',
        section: `Clearance score ${cl.clearance_score}/100`,
        text:
          `FTO landscape: ${cl.owned} owned/licensed, ${cl.blocking} blocking, ${cl.adjacent} adjacent. ` +
          `Computed clearance score ${cl.clearance_score}/100. Patents: ${list}.`,
        keywords: ['patent', 'patents', 'fto', 'freedom', 'operate', 'ip', 'blocking', 'clearance', 'license'],
      });
    }

    // 5. Talent flow
    const talent = await q(
      `SELECT person_name, role, from_org, pedigree FROM talent_moves WHERE startup_id = $1
        ORDER BY joined_date DESC`,
      [startupId],
    );
    for (const t of talent.rows) {
      corpus.push({
        kind: 'talent',
        ref: `Talent · ${t.person_name}`,
        section: t.role,
        text: `${t.person_name} joined as ${t.role} from ${t.from_org} (${t.pedigree} pedigree).`,
        keywords: ['talent', 'team', 'hire', 'hires', 'people', 'founder', 'engineer', 'poached'],
      });
    }

    // 6. Knowledge graph — spinout lineage + competing labs (adjacent assignees)
    const competitors = patents.rows
      .filter((p: any) => p.relation === 'adjacent' || p.relation === 'blocking')
      .map((p: any) => p.assignee);
    const compText = competitors.length
      ? ` Adjacent/competing IP assignees in the graph: ${[...new Set(competitors)].join(', ')}.`
      : ' No blocking or adjacent assignees appear in the graph.';
    corpus.push({
      kind: 'graph',
      ref: 'Knowledge Graph',
      section: `${deal.startup_name} → ${deal.university_short ?? deal.university_name}`,
      text:
        `${deal.startup_name} is a ${deal.vertical} spinout of ${deal.university_name} ` +
        `(${deal.country_code}), which holds ${Number(deal.university_equity_pct)}% equity under the ` +
        `standardized template.${compText}`,
      keywords: ['university', 'spinout', 'competitor', 'competitors', 'graph', 'equity', 'relationship'],
    });

    return { corpus, deal };
  }

  /** Answer a question about a deal, grounded and cited, and persist it. */
  async ask(userId: string, campaignId: string, question: string): Promise<CopilotAsk> {
    const q = (question ?? '').trim();
    if (q.length < 5) throw new BadRequestException('question must be at least 5 characters');
    if (q.length > 500) throw new BadRequestException('question too long');

    const { corpus } = await this.db.asAdmin((run) => this.buildCorpus(run, campaignId));

    const ranked = rankEvidence(corpus, q);
    const evidence = selectEvidence(ranked);
    const grounded = evidence.length > 0;

    const gen =
      (grounded ? await generateWithClaude(q, evidence) : null) ??
      synthesizeGrounded(q, evidence);
    const citations = evidence.map((e) => toCitation(e.chunk));

    // Persist the exchange under the asker's identity (RLS: copilot_own).
    await this.db.asUser(userId, (run) =>
      run(
        `INSERT INTO copilot_exchanges (user_id, campaign_id, question, answer, citations, model)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [userId, campaignId, q, gen.answer, JSON.stringify(citations), gen.model],
      ),
    );

    return {
      answer: gen.answer,
      grounded,
      model: gen.model,
      citations,
      sourceCount: corpus.length,
    };
  }

  /** The asker's own copilot history for a campaign (audit trail; RLS-scoped). */
  async history(userId: string, campaignId: string) {
    return this.db.asUser(userId, async (run) => {
      const res = await run(
        `SELECT id, question, answer, citations, model, created_at
           FROM copilot_exchanges
          WHERE campaign_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
        [campaignId],
      );
      return res.rows;
    });
  }
}
