import { Injectable, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

export type Query = <R extends Record<string, any> = Record<string, any>>(
  text: string,
  params?: unknown[],
) => Promise<{ rows: R[]; rowCount: number | null }>;

/**
 * All database access flows through per-transaction identities:
 * `set_config('app.current_user_id', …)` / `set_config('app.user_role', …)`
 * drive the schema's Row-Level Security policies, so even a buggy query
 * cannot cross tenant lines. The pool connects as the least-privilege
 * `univest_api` role (no table ownership → RLS always applies).
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://univest_api:univest@127.0.0.1:5432/univest',
    max: 10,
  });

  async withIdentity<T>(
    userId: string | null,
    role: string,
    fn: (q: Query) => Promise<T>,
  ): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT set_config('app.current_user_id', $1, true), set_config('app.user_role', $2, true)",
        [userId ?? '', role],
      );
      const q: Query = (text, params) => client.query(text, params as any[]) as any;
      const result = await fn(q);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Internal/system context (webhooks, aggregation, clearing jobs). */
  asAdmin<T>(fn: (q: Query) => Promise<T>): Promise<T> {
    return this.withIdentity(null, 'admin', fn);
  }

  /** Resolves the user's role from the database (never from a header), then
   *  runs `fn` under their RLS identity. */
  async asUser<T>(userId: string, fn: (q: Query) => Promise<T>): Promise<T> {
    const role = await this.asAdmin(async (q) => {
      const res = await q<{ role: string }>(
        'SELECT role FROM users WHERE id = $1 AND deactivated_at IS NULL',
        [userId],
      );
      if (res.rows.length === 0) throw new UnauthorizedException('unknown user');
      return res.rows[0].role;
    });
    return this.withIdentity(userId, role, fn);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
