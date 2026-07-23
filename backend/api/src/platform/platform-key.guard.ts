import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DbService } from '../db/db.service';

export interface Partner {
  id: string;
  name: string;
  kind: string;
  liveMode: boolean;
}

/** The authenticated partner, attached to the request by PlatformKeyGuard. */
export interface PartnerRequest extends Request {
  partner: Partner;
}

/**
 * Embedded-infrastructure auth: partners present a secret API key as
 * `Authorization: Bearer sk_…` (or `x-api-key`). We hash the presented key
 * with SHA-256 and look the partner up by digest — the secret itself is never
 * stored or compared in plaintext, exactly like Stripe's restricted keys.
 */
@Injectable()
export class PlatformKeyGuard implements CanActivate {
  constructor(private readonly db: DbService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const key = extractKey(req);
    if (!key) throw new UnauthorizedException('API key required (Authorization: Bearer sk_…)');

    const hash = createHash('sha256').update(key).digest();
    const partner = await this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT id, name, kind, live_mode
           FROM platform_partners
          WHERE api_key_hash = $1 AND active`,
        [hash],
      );
      return rows.rows[0];
    });
    if (!partner) throw new UnauthorizedException('invalid or revoked API key');

    (req as any).partner = {
      id: partner.id,
      name: partner.name,
      kind: partner.kind,
      liveMode: partner.live_mode,
    } satisfies Partner;
    return true;
  }
}

function extractKey(req: any): string | null {
  const auth = req.headers?.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const apiKey = req.headers?.['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.length > 0) return apiKey;
  return null;
}
