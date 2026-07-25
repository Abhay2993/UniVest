import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** Buyer-side admin fee on a secondary match (matches the primary 1.5%). */
const SECONDARY_ADMIN_FEE_PCT = 1.5;

/**
 * Investor-facing secondary market — surfaces the existing liquidity rails
 * (secondary_trades listings, tender_offers, and the batch-auction book) to
 * investors. Listings and tenders run under the caller's RLS identity so a
 * seller can only list what they own; a match is executed in the settlement
 * (admin) context, exactly as the auction clearing does.
 */
@Injectable()
export class SecondaryService {
  constructor(private readonly db: DbService) {}

  /** Open listings, optionally filtered to one SPV. */
  async listings(userId: string, spvId?: string) {
    return this.db.asUser(userId, async (q) => {
      const rows = await q(
        `SELECT t.id, t.spv_id, sp.legal_name, st.name AS company,
                t.units, t.price_per_unit, t.total_price, t.currency_code, t.listed_at,
                (t.seller_id = $1) AS mine
           FROM secondary_trades t
           JOIN spvs sp ON sp.id = t.spv_id
           LEFT JOIN campaigns c ON c.id = sp.campaign_id
           LEFT JOIN startups  st ON st.id = c.startup_id
          WHERE t.status = 'listed' AND ($2::uuid IS NULL OR t.spv_id = $2)
          ORDER BY t.price_per_unit ASC, t.listed_at ASC`,
        [userId, spvId ?? null],
      );
      return { object: 'list', data: rows.rows.map((r) => this.shapeListing(r)) };
    });
  }

  /** The caller's SPV holdings, with how many units they already have listed. */
  async holdings(userId: string) {
    return this.db.asUser(userId, async (q) => {
      const rows = await q(
        `SELECT h.spv_id, sp.legal_name, st.name AS company,
                h.units, h.cost_basis, sp.unit_price_initial,
                COALESCE((SELECT SUM(t.units) FROM secondary_trades t
                           WHERE t.spv_id = h.spv_id AND t.seller_id = $1 AND t.status = 'listed'), 0) AS listed_units
           FROM spv_holdings h
           JOIN spvs sp ON sp.id = h.spv_id
           LEFT JOIN campaigns c ON c.id = sp.campaign_id
           LEFT JOIN startups  st ON st.id = c.startup_id
          WHERE h.user_id = $1 AND h.units > 0
          ORDER BY st.name NULLS LAST`,
        [userId],
      );
      return {
        object: 'list',
        data: rows.rows.map((r) => ({
          spvId: r.spv_id,
          legalName: r.legal_name,
          company: r.company,
          units: Number(r.units),
          costBasis: Number(r.cost_basis),
          unitPriceInitial: Number(r.unit_price_initial),
          listedUnits: Number(r.listed_units),
          availableUnits: Number(r.units) - Number(r.listed_units),
        })),
      };
    });
  }

  /** List units for sale — enforces that the seller actually holds them. */
  async createListing(
    userId: string,
    body: { spvId?: string; units?: number; pricePerUnit?: number },
  ) {
    const units = Number(body?.units);
    const price = Number(body?.pricePerUnit);
    if (!body?.spvId) throw new BadRequestException('spvId is required');
    if (!Number.isFinite(units) || units <= 0) throw new BadRequestException('units must be > 0');
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('pricePerUnit must be > 0');

    return this.db.asUser(userId, async (q) => {
      const held = await q(
        `SELECT h.units,
                COALESCE((SELECT SUM(t.units) FROM secondary_trades t
                           WHERE t.spv_id = h.spv_id AND t.seller_id = $1 AND t.status = 'listed'), 0) AS listed
           FROM spv_holdings h WHERE h.spv_id = $2 AND h.user_id = $1`,
        [userId, body.spvId],
      );
      if (held.rows.length === 0) throw new BadRequestException('you hold no units in this SPV');
      const available = Number(held.rows[0].units) - Number(held.rows[0].listed);
      if (units > available) {
        throw new BadRequestException(`only ${available} unlisted units available to sell`);
      }
      const inserted = await q(
        `INSERT INTO secondary_trades (spv_id, seller_id, units, price_per_unit)
         VALUES ($1, $2, $3, $4)
         RETURNING id, spv_id, units, price_per_unit, total_price, currency_code, status, listed_at`,
        [body.spvId, userId, units, price],
      );
      return this.shapeListing(inserted.rows[0]);
    });
  }

  async cancelListing(userId: string, id: string) {
    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `UPDATE secondary_trades SET status = 'cancelled'
          WHERE id = $1 AND seller_id = $2 AND status = 'listed'
          RETURNING id, status`,
        [id, userId],
      );
      if (res.rows.length === 0) throw new NotFoundException('no open listing of yours with that id');
      return res.rows[0];
    });
  }

  /**
   * Match (buy) a listing. Executed in the settlement context: a buyer is not a
   * counterparty on the resting row until the match, so RLS could not authorize
   * the update from their identity. We validate the buyer explicitly instead.
   */
  async buyListing(userId: string, id: string) {
    return this.db.asAdmin(async (q) => {
      const listing = await q(
        `SELECT seller_id, status, total_price FROM secondary_trades WHERE id = $1`,
        [id],
      );
      if (listing.rows.length === 0) throw new NotFoundException('listing not found');
      const row = listing.rows[0];
      if (row.status !== 'listed') throw new ConflictException('listing is no longer open');
      if (row.seller_id === userId) throw new BadRequestException('you cannot buy your own listing');

      const fee = Math.round(Number(row.total_price) * (SECONDARY_ADMIN_FEE_PCT / 100) * 100) / 100;
      const matched = await q(
        `UPDATE secondary_trades
            SET status = 'matched', buyer_id = $2, admin_fee_amount = $3, matched_at = now()
          WHERE id = $1 AND status = 'listed'
          RETURNING id, spv_id, units, price_per_unit, total_price, admin_fee_amount, status, matched_at`,
        [id, userId, fee],
      );
      if (matched.rows.length === 0) throw new ConflictException('listing was taken concurrently');
      const m = matched.rows[0];
      return {
        ...this.shapeListing(m),
        adminFee: Number(m.admin_fee_amount),
        buyerTotal: Number(m.total_price) + Number(m.admin_fee_amount),
      };
    });
  }

  /** Resting tender bids on an SPV. */
  async tenders(userId: string, spvId: string) {
    return this.db.asUser(userId, async (q) => {
      const rows = await q(
        `SELECT id, price_per_unit, max_units, filled_units, status, created_at,
                (max_units - filled_units) AS open_units
           FROM tender_offers
          WHERE spv_id = $1 AND status = 'listed'
          ORDER BY price_per_unit DESC, created_at ASC`,
        [spvId],
      );
      return {
        object: 'list',
        data: rows.rows.map((r) => ({
          id: r.id,
          pricePerUnit: Number(r.price_per_unit),
          maxUnits: Number(r.max_units),
          filledUnits: Number(r.filled_units),
          openUnits: Number(r.open_units),
          status: r.status,
          createdAt: r.created_at,
        })),
      };
    });
  }

  /** Post a resting tender bid. */
  async createTender(
    userId: string,
    body: { spvId?: string; pricePerUnit?: number; maxUnits?: number },
  ) {
    const price = Number(body?.pricePerUnit);
    const maxUnits = Number(body?.maxUnits);
    if (!body?.spvId) throw new BadRequestException('spvId is required');
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('pricePerUnit must be > 0');
    if (!Number.isFinite(maxUnits) || maxUnits <= 0) throw new BadRequestException('maxUnits must be > 0');

    return this.db.asUser(userId, async (q) => {
      const inserted = await q(
        `INSERT INTO tender_offers (spv_id, buyer_id, price_per_unit, max_units)
         VALUES ($1, $2, $3, $4)
         RETURNING id, spv_id, price_per_unit, max_units, filled_units, status, created_at`,
        [body.spvId, userId, price, maxUnits],
      );
      const r = inserted.rows[0];
      return {
        object: 'tender',
        id: r.id,
        spvId: r.spv_id,
        pricePerUnit: Number(r.price_per_unit),
        maxUnits: Number(r.max_units),
        filledUnits: Number(r.filled_units),
        status: r.status,
        createdAt: r.created_at,
      };
    });
  }

  /**
   * The book for an SPV: best ask (lowest listing), best bid (highest tender),
   * aggregated depth, and recent matched-trade price history.
   */
  async book(spvId: string) {
    return this.db.asAdmin(async (q) => {
      const asks = await q(
        `SELECT price_per_unit AS price, SUM(units)::numeric AS units
           FROM secondary_trades WHERE spv_id = $1 AND status = 'listed'
          GROUP BY price_per_unit ORDER BY price_per_unit ASC`,
        [spvId],
      );
      const bids = await q(
        `SELECT price_per_unit AS price, SUM(max_units - filled_units)::numeric AS units
           FROM tender_offers WHERE spv_id = $1 AND status = 'listed'
          GROUP BY price_per_unit ORDER BY price_per_unit DESC`,
        [spvId],
      );
      const history = await q(
        `SELECT matched_at::date AS date, price_per_unit, units
           FROM secondary_trades
          WHERE spv_id = $1 AND status IN ('matched','in_escrow','settled') AND matched_at IS NOT NULL
          ORDER BY matched_at DESC LIMIT 20`,
        [spvId],
      );
      const askRows = asks.rows.map((r) => ({ price: Number(r.price), units: Number(r.units) }));
      const bidRows = bids.rows.map((r) => ({ price: Number(r.price), units: Number(r.units) }));
      return {
        object: 'secondary_book',
        spvId,
        bestAsk: askRows[0]?.price ?? null,
        bestBid: bidRows[0]?.price ?? null,
        asks: askRows,
        bids: bidRows,
        history: history.rows.map((r) => ({ date: r.date, price: Number(r.price_per_unit), units: Number(r.units) })),
      };
    });
  }

  private shapeListing(r: any) {
    return {
      object: 'listing',
      id: r.id,
      spvId: r.spv_id,
      legalName: r.legal_name,
      company: r.company,
      units: Number(r.units),
      pricePerUnit: Number(r.price_per_unit),
      totalPrice: Number(r.total_price),
      currency: r.currency_code,
      status: r.status,
      listedAt: r.listed_at,
      ...(r.mine === undefined ? {} : { mine: r.mine }),
    };
  }
}
