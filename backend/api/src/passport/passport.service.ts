import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import {
  demoKeyPair,
  keyIdFromCredential,
  signCredential,
  verifyCredential,
} from '../credentials/vc-crypto';

/**
 * Portable investor passport — a W3C Verifiable Credential asserting the
 * investor's verified KYC, accreditation, and suitability, signed with the
 * platform's Ed25519 issuer key. Because it's a standard VC verifiable
 * against the public issuer key, ANY platform can accept it without trusting
 * UniVest's API — the identity-layer network + regulatory moat.
 *
 * Demo issuer key is deterministic; production keeps it in an HSM and rotates
 * it, publishing the public key at a well-known DID document.
 */
const ISSUER_KEY_ID = 'univest-passport-issuer';

@Injectable()
export class PassportService {
  constructor(private readonly db: DbService) {}

  /** Issue (or re-issue) the passport from the user's verified profile. */
  async issue(userId: string) {
    return this.db.asAdmin(async (q) => {
      const users = await q(
        `SELECT id, full_name, country_code, kyc_status, kyc_approved_at,
                accreditation, suitability_score, invest_limit_annual
           FROM users WHERE id = $1`,
        [userId],
      );
      if (users.rows.length === 0) throw new NotFoundException('user not found');
      const u = users.rows[0];
      if (u.kyc_status !== 'approved') {
        throw new ForbiddenException('passport requires an approved KYC status');
      }

      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'InvestorPassportCredential'],
        issuer: `did:univest:issuer:${ISSUER_KEY_ID}`,
        validFrom: new Date(u.kyc_approved_at ?? Date.now()).toISOString(),
        credentialSubject: {
          id: `urn:univest:investor:${u.id}`,
          holder: u.full_name,
          residence: u.country_code,
          kycStatus: u.kyc_status,
          accreditation: u.accreditation,
          suitabilityScore: u.suitability_score,
          annualInvestmentLimit: u.invest_limit_annual,
        },
      };

      const { privateKey } = demoKeyPair(ISSUER_KEY_ID);
      const { credential, vcHash } = signCredential(payload, ISSUER_KEY_ID, privateKey, 'issuer');

      // One active passport per user: supersede prior issuances.
      await q(`UPDATE investor_passports SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
      const inserted = await q(
        `INSERT INTO investor_passports (user_id, credential, vc_hash)
         VALUES ($1, $2, $3)
         RETURNING id, issued_at`,
        [userId, JSON.stringify(credential), vcHash],
      );
      return { ...inserted.rows[0], credential };
    });
  }

  async get(userId: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT credential, issued_at, revoked_at
           FROM investor_passports
          WHERE user_id = $1 AND revoked_at IS NULL
          ORDER BY issued_at DESC LIMIT 1`,
        [userId],
      );
      if (rows.rows.length === 0) throw new NotFoundException('no active passport');
      return rows.rows[0];
    });
  }

  /**
   * Public: verify a presented passport against the platform issuer key —
   * the same check any third-party platform runs to accept a UniVest identity.
   */
  async verify(credential: Record<string, any>) {
    const keyId = keyIdFromCredential(credential);
    if (keyId !== ISSUER_KEY_ID) {
      return { valid: false, reason: 'not a UniVest passport issuer' };
    }
    // The Ed25519 signature against the public issuer key is the real gate —
    // exactly the check a third-party platform runs offline. (Production also
    // consults a published revocation list keyed on the credential id.)
    const { publicKeyRaw } = demoKeyPair(ISSUER_KEY_ID);
    const valid = verifyCredential(credential, publicKeyRaw);
    return {
      valid,
      issuer: 'UniVest Identity',
      holder: credential?.credentialSubject?.holder,
      annualInvestmentLimit: credential?.credentialSubject?.annualInvestmentLimit,
      ...(valid ? {} : { reason: 'signature does not match the UniVest issuer key' }),
    };
  }
}
