import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * Scientific-diligence surface for a startup: independent replication studies,
 * the freedom-to-operate landscape (with a SQL-computed clearance score), and
 * talent-flow moves. Public reads — these signals are the product.
 */
@Injectable()
export class DiligenceService {
  constructor(private readonly db: DbService) {}

  async forStartup(startupId: string) {
    return this.db.asAdmin(async (q) => {
      const replication = await q(
        `SELECT milestone_title, lab_name, fee, status, result, completed_date
           FROM replication_studies WHERE startup_id = $1
          ORDER BY created_at`,
        [startupId],
      );
      const patents = await q(
        `SELECT title, assignee, relation, jurisdiction
           FROM fto_patents WHERE startup_id = $1`,
        [startupId],
      );
      const clearance = await q(
        `SELECT owned, blocking, adjacent, clearance_score
           FROM startup_fto_clearance WHERE startup_id = $1`,
        [startupId],
      );
      const talent = await q(
        `SELECT person_name, role, from_org, pedigree, joined_date
           FROM talent_moves WHERE startup_id = $1
          ORDER BY joined_date DESC`,
        [startupId],
      );

      const replicated = replication.rows.filter((r: any) => r.status === 'replicated').length;
      return {
        replication: {
          studies: replication.rows,
          replicated,
          verifiedByReplication: replicated > 0,
        },
        fto: {
          patents: patents.rows,
          clearance: clearance.rows[0] ?? { owned: 0, blocking: 0, adjacent: 0, clearance_score: 100 },
        },
        talent: talent.rows,
      };
    });
  }
}
