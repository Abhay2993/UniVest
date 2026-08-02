import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService, Query } from '../db/db.service';
import { bestScheme, currentTaxYear, reliefFor, SchemeParams } from './tax-relief.util';

function mapScheme(r: any): SchemeParams {
  return {
    code: r.code,
    name: r.name,
    jurisdiction: r.jurisdiction,
    incomeReliefPct: Number(r.income_relief_pct),
    annualCap: r.annual_cap == null ? null : Number(r.annual_cap),
    capCurrency: r.cap_currency,
    minHoldMonths: Number(r.min_hold_months),
    cgtExempt: r.cgt_exempt,
    lossRelief: r.loss_relief,
    certificateKind: r.certificate_kind,
  };
}

@Injectable()
export class TaxReliefService {
  constructor(private readonly db: DbService) {}

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

  /** All schemes (public reference data). */
  async schemes() {
    return this.db.asAdmin(async (q) => {
      const res = await q('SELECT * FROM tax_schemes ORDER BY jurisdiction, income_relief_pct DESC');
      return res.rows.map(mapScheme);
    });
  }

  /** How much the investor has already claimed this tax year, per scheme code. */
  private async priorByCode(q: Query, userId: string, taxYear: string): Promise<Record<string, number>> {
    const res = await q(
      `SELECT scheme_code, COALESCE(SUM(invested_amount), 0) AS total
         FROM tax_relief_claims WHERE user_id = $1 AND tax_year = $2 GROUP BY scheme_code`,
      [userId, taxYear],
    );
    const out: Record<string, number> = {};
    for (const r of res.rows) out[r.scheme_code] = Number(r.total);
    return out;
  }

  /** The schemes a campaign carries, and which apply to this investor's residency. */
  async eligibility(userId: string, campaignId: string) {
    return this.db.asAdmin(async (q) => {
      const who = await q<{ country_code: string }>('SELECT country_code FROM users WHERE id = $1', [userId]);
      if (who.rowCount === 0) throw new NotFoundException('user not found');
      const country = who.rows[0].country_code;

      const rows = await q(
        `SELECT s.*, cts.advance_assurance_ref, cts.scheme_cap
           FROM campaign_tax_schemes cts JOIN tax_schemes s ON s.code = cts.scheme_code
          WHERE cts.campaign_id = $1`,
        [campaignId],
      );
      const campaignSchemes = rows.rows.map((r) => ({
        ...mapScheme(r),
        advanceAssuranceRef: r.advance_assurance_ref ?? null,
      }));
      const applicable = campaignSchemes.filter((s) => s.jurisdiction === country);
      const taxYear = currentTaxYear(country);
      const prior = await this.priorByCode(q, userId, taxYear);
      const recommended = bestScheme(applicable, prior);

      return {
        userJurisdiction: country,
        taxYear,
        campaignSchemes,
        applicable: applicable.map((s) => ({
          ...s,
          remainingCap: s.annualCap == null ? null : Math.max(s.annualCap - (prior[s.code] ?? 0), 0),
        })),
        recommendedScheme: recommended?.code ?? null,
      };
    });
  }

  /** Estimate the relief for an amount under the best applicable scheme. */
  async estimate(userId: string, campaignId: string, amount: number) {
    if (!(amount > 0)) throw new BadRequestException('amount must be positive');
    return this.db.asAdmin(async (q) => {
      const who = await q<{ country_code: string }>('SELECT country_code FROM users WHERE id = $1', [userId]);
      if (who.rowCount === 0) throw new NotFoundException('user not found');
      const country = who.rows[0].country_code;
      const rows = await q(
        `SELECT s.* FROM campaign_tax_schemes cts JOIN tax_schemes s ON s.code = cts.scheme_code
          WHERE cts.campaign_id = $1 AND s.jurisdiction = $2`,
        [campaignId, country],
      );
      const applicable = rows.rows.map(mapScheme);
      if (applicable.length === 0) {
        return { eligible: false, reason: `no scheme for a ${country} investor on this deal`, amount };
      }
      const taxYear = currentTaxYear(country);
      const prior = await this.priorByCode(q, userId, taxYear);
      const scheme = bestScheme(applicable, prior)!;
      const relief = reliefFor(scheme, amount, prior[scheme.code] ?? 0);
      return { eligible: true, amount, taxYear, scheme, relief };
    });
  }

  /** Record a (pending) relief claim for an investment under the best scheme. */
  async claim(userId: string, campaignId: string, amount: number) {
    const est = await this.estimate(userId, campaignId, amount);
    if (!est.eligible) throw new BadRequestException(est.reason);
    const { scheme, relief, taxYear } = est as any;
    const inserted = await this.db.asUser(userId, async (q) => {
      const res = await q<{ id: string }>(
        `INSERT INTO tax_relief_claims (user_id, campaign_id, scheme_code, invested_amount, relief_amount, tax_year)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, campaignId, scheme.code, amount, relief.reliefAmount, taxYear],
      );
      return res.rows[0].id;
    });
    return this.claimById(userId, inserted);
  }

  private async claimById(userId: string, id: string) {
    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `SELECT c.*, s.name AS scheme_name, s.certificate_kind, s.min_hold_months, s.cgt_exempt, s.loss_relief
           FROM tax_relief_claims c JOIN tax_schemes s ON s.code = c.scheme_code
          WHERE c.id = $1`,
        [id],
      );
      if (res.rowCount === 0) throw new NotFoundException('claim not found');
      return this.shape(res.rows[0]);
    });
  }

  /** The caller's own relief claims / certificates (RLS-scoped). */
  async claims(userId: string) {
    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `SELECT c.*, s.name AS scheme_name, s.certificate_kind, s.min_hold_months, s.cgt_exempt, s.loss_relief
           FROM tax_relief_claims c JOIN tax_schemes s ON s.code = c.scheme_code
          WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
        [userId],
      );
      return res.rows.map((r) => this.shape(r));
    });
  }

  /** Issue the certificate for a claim (admin; once the raise has closed). */
  async issue(adminId: string, claimId: string) {
    await this.requireAdmin(adminId);
    return this.db.asAdmin(async (q) => {
      const cur = await q('SELECT status, scheme_code FROM tax_relief_claims WHERE id = $1', [claimId]);
      if (cur.rowCount === 0) throw new NotFoundException('claim not found');
      if (cur.rows[0].status === 'issued') throw new ConflictException('certificate already issued');
      const ref = `${cur.rows[0].scheme_code.toUpperCase()}-${claimId.slice(0, 8)}`;
      await q(
        `UPDATE tax_relief_claims SET status = 'issued', certificate_ref = $2, issued_at = now() WHERE id = $1`,
        [claimId, ref],
      );
      const res = await q(
        `SELECT c.*, s.name AS scheme_name, s.certificate_kind, s.min_hold_months, s.cgt_exempt, s.loss_relief
           FROM tax_relief_claims c JOIN tax_schemes s ON s.code = c.scheme_code WHERE c.id = $1`,
        [claimId],
      );
      return this.shape(res.rows[0]);
    });
  }

  private shape(r: any) {
    return {
      id: r.id,
      campaignId: r.campaign_id,
      schemeCode: r.scheme_code,
      schemeName: r.scheme_name,
      certificateKind: r.certificate_kind,
      investedAmount: Number(r.invested_amount),
      reliefAmount: Number(r.relief_amount),
      taxYear: r.tax_year,
      status: r.status,
      certificateRef: r.certificate_ref ?? null,
      minHoldMonths: Number(r.min_hold_months),
      cgtExempt: r.cgt_exempt,
      lossRelief: r.loss_relief,
      issuedAt: r.issued_at ? new Date(r.issued_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }
}
