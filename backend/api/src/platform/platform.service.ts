import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { keyIdFromCredential, publicKeyFromRaw, verifyCredential } from '../credentials/vc-crypto';
import type { Partner } from './platform-key.guard';

/**
 * Embedded infrastructure — "Stripe-for-spinout-equity". The three rails a
 * partner (accelerator, platform, or university) can rent instead of rebuilding:
 *
 *   1. SPV formation      — POST /platform/v1/spvs
 *   2. Attestation verify — POST /platform/v1/attestations/verify
 *   3. Secondary book     — GET  /platform/v1/secondary/:windowId/book
 *
 * Every partner-scoped query filters on partner_id, so a partner can only ever
 * touch its own resources (partners are not `users`, so the per-user RLS
 * policies do not apply — isolation is enforced here explicitly).
 */
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'SGD', 'AUD'];

@Injectable()
export class PlatformService {
  constructor(private readonly db: DbService) {}

  /** Form an SPV on UniVest's rails, programmatically. */
  async createSpv(
    partner: Partner,
    body: {
      companyName?: string;
      vertical?: string;
      targetAmount?: number;
      currency?: string;
      externalRef?: string;
      carryPct?: number;
    },
  ) {
    const companyName = String(body?.companyName ?? '').trim();
    const targetAmount = Number(body?.targetAmount);
    if (!companyName) throw new BadRequestException('companyName is required');
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      throw new BadRequestException('targetAmount must be a positive number');
    }
    const currency = String(body?.currency ?? 'USD').toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new BadRequestException(`currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}`);
    }
    const carryPct = body?.carryPct == null ? 15 : Number(body.carryPct);
    if (!Number.isFinite(carryPct) || carryPct < 0 || carryPct > 30) {
      throw new BadRequestException('carryPct must be between 0 and 30');
    }

    return this.db.asAdmin(async (q) => {
      // Idempotency by (partner, externalRef): return the existing SPV instead
      // of creating a duplicate — the behaviour partners expect from Stripe.
      if (body?.externalRef) {
        const existing = await q(
          `SELECT ${SPV_COLS} FROM platform_spvs WHERE partner_id = $1 AND external_ref = $2`,
          [partner.id, body.externalRef],
        );
        if (existing.rows.length > 0) return this.shapeSpv(existing.rows[0]);
      }
      const inserted = await q(
        `INSERT INTO platform_spvs
           (partner_id, external_ref, company_name, vertical, target_amount, currency, carry_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${SPV_COLS}`,
        [
          partner.id,
          body?.externalRef ?? null,
          companyName,
          body?.vertical ?? null,
          targetAmount,
          currency,
          carryPct,
        ],
      );
      return this.shapeSpv(inserted.rows[0]);
    });
  }

  async listSpvs(partner: Partner) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT ${SPV_COLS} FROM platform_spvs WHERE partner_id = $1 ORDER BY created_at DESC`,
        [partner.id],
      );
      return { object: 'list', data: rows.rows.map((r) => this.shapeSpv(r)) };
    });
  }

  async getSpv(partner: Partner, id: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT ${SPV_COLS} FROM platform_spvs WHERE id = $1 AND partner_id = $2`,
        [id, partner.id],
      );
      if (rows.rows.length === 0) throw new NotFoundException('spv not found');
      return this.shapeSpv(rows.rows[0]);
    });
  }

  /**
   * Attestation verification as a service: given a milestone credential, run
   * the real Ed25519 check against the on-file attestor key. This is UniVest's
   * trust layer, rented — a partner proves a milestone without holding keys.
   */
  async verifyAttestation(credential: Record<string, any>) {
    const keyId = keyIdFromCredential(credential);
    if (!keyId) return { valid: false, reason: 'no UniVest verificationMethod on the credential' };

    const key = await this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT owner_name, ed25519_pubkey, revoked_at
           FROM attestor_keys WHERE key_id = $1`,
        [keyId],
      );
      return rows.rows[0];
    });
    if (!key) return { valid: false, keyId, reason: 'unknown attestor key' };
    if (key.revoked_at) return { valid: false, keyId, reason: 'attestor key has been revoked' };

    const pubkey = key.ed25519_pubkey as Buffer;
    // Confirm the raw key parses before trusting a verify result.
    try {
      publicKeyFromRaw(pubkey);
    } catch {
      return { valid: false, keyId, reason: 'malformed attestor public key' };
    }
    const valid = verifyCredential(credential, pubkey);
    return {
      valid,
      keyId,
      attestor: key.owner_name,
      subject: credential?.credentialSubject?.id ?? null,
      ...(valid ? {} : { reason: 'signature does not match the attestor key' }),
    };
  }

  /**
   * Secondary rails: a read-only snapshot of an auction order book, exposed so
   * a partner can render live secondary liquidity on their own surface.
   */
  async secondaryBook(windowId: string) {
    return this.db.asAdmin(async (q) => {
      const win = await q(
        `SELECT id, status, opens_at, closes_at FROM auction_windows WHERE id = $1`,
        [windowId],
      );
      if (win.rows.length === 0) throw new NotFoundException('auction window not found');

      const orders = await q(
        `SELECT side, SUM(units)::numeric AS units, limit_price
           FROM auction_orders
          WHERE window_id = $1 AND status IN ('open','partially_filled')
          GROUP BY side, limit_price`,
        [windowId],
      );
      const bids = orders.rows
        .filter((o) => o.side === 'buy')
        .map((o) => ({ price: Number(o.limit_price), units: Number(o.units) }))
        .sort((a, b) => b.price - a.price);
      const asks = orders.rows
        .filter((o) => o.side === 'sell')
        .map((o) => ({ price: Number(o.limit_price), units: Number(o.units) }))
        .sort((a, b) => a.price - b.price);

      return {
        object: 'secondary_book',
        window: win.rows[0].id,
        status: win.rows[0].status,
        opensAt: win.rows[0].opens_at,
        closesAt: win.rows[0].closes_at,
        bestBid: bids[0]?.price ?? null,
        bestAsk: asks[0]?.price ?? null,
        bids,
        asks,
      };
    });
  }

  private shapeSpv(row: any) {
    return {
      object: 'spv',
      id: row.id,
      externalRef: row.external_ref,
      companyName: row.company_name,
      vertical: row.vertical,
      targetAmount: Number(row.target_amount),
      currency: row.currency,
      carryPct: Number(row.carry_pct),
      status: row.status,
      createdAt: row.created_at,
    };
  }
}

const SPV_COLS =
  'id, external_ref, company_name, vertical, target_amount, currency, carry_pct, status, created_at';
