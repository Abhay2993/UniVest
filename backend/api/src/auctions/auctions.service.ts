import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';

interface BookOrder {
  side: 'buy' | 'sell';
  units: number;
  limitPrice: number;
}

/** TypeScript mirror of the database's clear_auction(): uniform price
 *  maximizing min(demand, supply), midpoint of the max-volume plateau. */
function indicativeClearing(orders: BookOrder[]): { price: number | null; volume: number } {
  const candidates = [...new Set(orders.map((o) => o.limitPrice))].sort((a, b) => a - b);
  let bestVolume = 0;
  let lo: number | null = null;
  let hi: number | null = null;
  for (const p of candidates) {
    const demand = orders
      .filter((o) => o.side === 'buy' && o.limitPrice >= p)
      .reduce((s, o) => s + o.units, 0);
    const supply = orders
      .filter((o) => o.side === 'sell' && o.limitPrice <= p)
      .reduce((s, o) => s + o.units, 0);
    const volume = Math.min(demand, supply);
    if (volume > bestVolume) {
      bestVolume = volume;
      lo = p;
      hi = p;
    } else if (volume === bestVolume && bestVolume > 0) {
      hi = p;
    }
  }
  if (bestVolume === 0 || lo === null || hi === null) return { price: null, volume: 0 };
  return { price: (lo + hi) / 2, volume: bestVolume };
}

@Injectable()
export class AuctionsService {
  constructor(private readonly db: DbService) {}

  /** The open window with aggregated depth and the indicative clearing price. */
  async active() {
    return this.db.asAdmin(async (q) => {
      const windows = await q(
        `SELECT w.id, w.spv_id, s.legal_name, w.opens_at, w.closes_at
           FROM auction_windows w JOIN spvs s ON s.id = w.spv_id
          WHERE w.status = 'open'
          ORDER BY w.closes_at LIMIT 1`,
      );
      if (windows.rows.length === 0) throw new NotFoundException('no open auction window');
      const window = windows.rows[0];

      const orders = await q<{ side: 'buy' | 'sell'; units: string; limit_price: string }>(
        `SELECT side, units, limit_price FROM auction_orders
          WHERE window_id = $1 AND status = 'open'`,
        [window.id],
      );
      const book: BookOrder[] = orders.rows.map((o) => ({
        side: o.side,
        units: Number(o.units),
        limitPrice: Number(o.limit_price),
      }));
      const indicative = indicativeClearing(book);

      const history = await q(
        `SELECT closes_at::date AS date, clearing_price, cleared_units
           FROM auction_windows
          WHERE spv_id = $1 AND status IN ('cleared', 'settled') AND clearing_price IS NOT NULL
          ORDER BY closes_at`,
        [window.spv_id],
      );

      return {
        ...window,
        indicativePrice: indicative.price,
        indicativeVolume: indicative.volume,
        demandUnits: book.filter((o) => o.side === 'buy').reduce((s, o) => s + o.units, 0),
        supplyUnits: book.filter((o) => o.side === 'sell').reduce((s, o) => s + o.units, 0),
        history: history.rows,
      };
    });
  }

  async placeOrder(
    userId: string,
    windowId: string,
    side: string,
    units: number,
    limitPrice: number,
  ) {
    if (side !== 'buy' && side !== 'sell') throw new BadRequestException('side must be buy|sell');
    if (!Number.isFinite(units) || units <= 0) throw new BadRequestException('units must be > 0');
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
      throw new BadRequestException('limitPrice must be > 0');
    }
    const open = await this.db.asAdmin(async (q) => {
      const w = await q(`SELECT 1 FROM auction_windows WHERE id = $1 AND status = 'open'`, [windowId]);
      return w.rows.length > 0;
    });
    if (!open) throw new ConflictException('auction window is not open');

    return this.db.asUser(userId, async (q) => {
      const res = await q(
        `INSERT INTO auction_orders (window_id, user_id, side, units, limit_price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, side, units, limit_price, status, created_at`,
        [windowId, userId, side, units, limitPrice],
      );
      return res.rows[0];
    });
  }

  /** Runs the database clearing engine (ops/scheduler context). */
  async clear(windowId: string) {
    try {
      return await this.db.asAdmin(async (q) => {
        const res = await q(`SELECT o_price, o_units FROM clear_auction($1)`, [windowId]);
        return { clearingPrice: res.rows[0].o_price, clearedUnits: res.rows[0].o_units };
      });
    } catch (err: any) {
      if (String(err?.message ?? '').includes('is not open')) {
        throw new ConflictException('auction window is not open');
      }
      throw err;
    }
  }
}
