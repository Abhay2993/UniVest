import { Injectable } from '@nestjs/common';
import { DbService, Query } from '../db/db.service';

export interface AlertPreferences {
  attestation: boolean;
  escrow: boolean;
  governance: boolean;
  secondary: boolean;
  closing: boolean;
}

const CATEGORIES: (keyof AlertPreferences)[] = [
  'attestation', 'escrow', 'governance', 'secondary', 'closing',
];

export interface AlertItem {
  kind: keyof AlertPreferences;
  title: string;
  detail: string;
  occurredAt: string;
}

@Injectable()
export class AlertsService {
  constructor(private readonly db: DbService) {}

  /** The caller's preferences, creating all-on defaults on first read. */
  async getPreferences(userId: string): Promise<AlertPreferences> {
    return this.db.asUser(userId, async (q) => {
      await q(
        'INSERT INTO alert_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [userId],
      );
      const res = await q(
        'SELECT attestation, escrow, governance, secondary, closing FROM alert_preferences WHERE user_id = $1',
        [userId],
      );
      return res.rows[0] as AlertPreferences;
    });
  }

  async updatePreferences(userId: string, body: Partial<AlertPreferences>): Promise<AlertPreferences> {
    const cur = await this.getPreferences(userId);
    const next: AlertPreferences = { ...cur };
    for (const c of CATEGORIES) {
      if (typeof body[c] === 'boolean') next[c] = body[c] as boolean;
    }
    return this.db.asUser(userId, async (q) => {
      await q(
        `UPDATE alert_preferences
            SET attestation = $2, escrow = $3, governance = $4, secondary = $5, closing = $6,
                updated_at = now()
          WHERE user_id = $1`,
        [userId, next.attestation, next.escrow, next.governance, next.secondary, next.closing],
      );
      return next;
    });
  }

  /**
   * A material-event feed scoped to the caller's holdings and filtered by their
   * preferences. Holdings are read under the caller's identity (RLS
   * spv_holdings_own); the event tables joined in are public.
   */
  async feed(userId: string): Promise<AlertItem[]> {
    const prefs = await this.getPreferences(userId);
    return this.db.asUser(userId, async (q) => {
      const items: AlertItem[] = [];
      if (prefs.attestation) items.push(...(await this.attestationItems(q)));
      if (prefs.escrow) items.push(...(await this.escrowItems(q)));
      if (prefs.governance) items.push(...(await this.governanceItems(q)));
      return items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)).slice(0, 50);
    });
  }

  private async attestationItems(q: Query): Promise<AlertItem[]> {
    const res = await q(
      `SELECT s.name AS startup, m.title AS milestone, a.attestor_org, a.signed_at
         FROM spv_holdings h
         JOIN spvs sp        ON sp.id = h.spv_id
         JOIN campaigns c    ON c.id = sp.campaign_id
         JOIN startups s     ON s.id = c.startup_id
         JOIN milestones m   ON m.startup_id = s.id
         JOIN milestone_attestations a ON a.milestone_id = m.id
        ORDER BY a.signed_at DESC LIMIT 20`,
    );
    return res.rows.map((r: any) => ({
      kind: 'attestation' as const,
      title: `${r.startup}: "${r.milestone}" attested`,
      detail: `Independently verified by ${r.attestor_org}.`,
      occurredAt: new Date(r.signed_at).toISOString(),
    }));
  }

  private async escrowItems(q: Query): Promise<AlertItem[]> {
    const res = await q(
      `SELECT s.name AS startup, t.label, t.released_amount, t.released_at
         FROM spv_holdings h
         JOIN spvs sp     ON sp.id = h.spv_id
         JOIN campaigns c ON c.id = sp.campaign_id
         JOIN startups s  ON s.id = c.startup_id
         JOIN escrow_tranches t ON t.campaign_id = c.id AND t.status = 'released'
        ORDER BY t.released_at DESC LIMIT 20`,
    );
    return res.rows.map((r: any) => ({
      kind: 'escrow' as const,
      title: `${r.startup}: escrow tranche released`,
      detail: `"${r.label}" released against its attested milestone.`,
      occurredAt: new Date(r.released_at).toISOString(),
    }));
  }

  private async governanceItems(q: Query): Promise<AlertItem[]> {
    const res = await q(
      `SELECT sp.legal_name, p.title, p.closes_at
         FROM spv_holdings h
         JOIN spvs sp ON sp.id = h.spv_id
         JOIN governance_proposals p ON p.spv_id = sp.id AND p.status = 'open'
        ORDER BY p.closes_at ASC LIMIT 20`,
    );
    return res.rows.map((r: any) => ({
      kind: 'governance' as const,
      title: `Vote open: ${r.title}`,
      detail: `${r.legal_name} — voting closes ${new Date(r.closes_at).toISOString().slice(0, 10)}.`,
      occurredAt: new Date(r.closes_at).toISOString(),
    }));
  }
}
