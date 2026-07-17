import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { DbService } from '../db/db.service';
import {
  demoKeyPair,
  keyIdFromCredential,
  signCredential,
  verifyCredential,
} from './vc-crypto';

/**
 * On-chain verifiable attestations — W3C Verifiable Credentials over the
 * attestor key registry, signed with REAL Ed25519 (node:crypto, see
 * vc-crypto.ts). Anyone can fetch a credential and verify the signature
 * against the registered public key without trusting this API.
 *
 * Demo boundaries, stated plainly:
 *  - Attestor keys are derived deterministically from the key_id (so demo
 *    credentials are reproducible); production keys live in the officer's
 *    secure enclave and never leave the device.
 *  - The "ledger anchor" is a deterministic reference recorded alongside the
 *    credential; production batches vc_hashes into a Merkle root anchored to
 *    a public chain (e.g. an Ethereum L2), making revocation and existence
 *    independently provable.
 */
@Injectable()
export class CredentialsService {
  constructor(private readonly db: DbService) {}

  /** Issue (admin/ops): build the VC, sign it as the attestor, store + anchor. */
  async issue(attestationId: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT a.id, a.attestor_name, a.attestor_org, a.attestor_role, a.key_id,
                encode(a.evidence_hash, 'hex') AS evidence_hash_hex, a.signed_at,
                m.title AS milestone_title, m.id AS milestone_id,
                s.name AS startup_name, u.name AS university_name
           FROM milestone_attestations a
           JOIN milestones m ON m.id = a.milestone_id
           JOIN startups s ON s.id = m.startup_id
           JOIN universities u ON u.id = s.university_id
          WHERE a.id = $1`,
        [attestationId],
      );
      if (rows.rows.length === 0) throw new NotFoundException('attestation not found');
      const a = rows.rows[0];

      const existing = await q(
        `SELECT 1 FROM attestation_credentials WHERE attestation_id = $1`,
        [attestationId],
      );
      if (existing.rows.length > 0) throw new ConflictException('credential already issued');

      // Demo attestor key: deterministic per key_id; register the real public
      // key bytes so verification is genuine.
      const { privateKey, publicKeyRaw } = demoKeyPair(a.key_id);
      await q(`UPDATE attestor_keys SET ed25519_pubkey = $2 WHERE key_id = $1`, [
        a.key_id,
        publicKeyRaw,
      ]);

      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'MilestoneAttestationCredential'],
        issuer: `did:univest:attestor:${a.key_id}`,
        validFrom: new Date(a.signed_at).toISOString(),
        credentialSubject: {
          id: `urn:univest:milestone:${a.milestone_id}`,
          milestone: a.milestone_title,
          startup: a.startup_name,
          university: a.university_name,
          attestor: { name: a.attestor_name, organization: a.attestor_org, role: a.attestor_role },
          evidenceHashSha256: a.evidence_hash_hex,
        },
      };

      const { credential, vcHash } = signCredential(payload, a.key_id, privateKey);

      // Demo anchor: deterministic reference; production submits vcHash in a
      // Merkle batch to a public chain and stores the real tx hash here.
      const anchorRef =
        'demo:0x' + crypto.createHash('sha256').update(vcHash).update('anchor').digest('hex').slice(0, 40);

      const inserted = await q(
        `INSERT INTO attestation_credentials (attestation_id, credential, vc_hash, anchor_chain, anchor_ref)
         VALUES ($1, $2, $3, 'demo-ledger', $4)
         RETURNING id, anchor_chain, anchor_ref, issued_at`,
        [attestationId, JSON.stringify(credential), vcHash, anchorRef],
      );
      return { ...inserted.rows[0], credential };
    });
  }

  /** Public: fetch the signed credential for an attestation. */
  async get(attestationId: string) {
    return this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT credential, anchor_chain, anchor_ref, issued_at
           FROM attestation_credentials WHERE attestation_id = $1`,
        [attestationId],
      );
      if (rows.rows.length === 0) throw new NotFoundException('credential not issued');
      return rows.rows[0];
    });
  }

  /**
   * Public: verify a presented credential against the on-registry public key.
   * Recomputes the canonical payload hash and checks the Ed25519 proof — the
   * same check any third party can run offline with the registry export.
   */
  async verify(credential: Record<string, any>) {
    if (!credential?.proof?.proofValue) {
      throw new BadRequestException('credential is missing an Ed25519 proof');
    }
    const keyId = keyIdFromCredential(credential);
    if (!keyId) throw new BadRequestException('unrecognized verificationMethod');

    const keyRow = await this.db.asAdmin(async (q) => {
      const rows = await q(
        `SELECT owner_name, fingerprint, ed25519_pubkey, revoked_at
           FROM attestor_keys WHERE key_id = $1`,
        [keyId],
      );
      return rows.rows[0];
    });
    if (!keyRow) return { valid: false, reason: 'attestor key not in registry', keyId };
    if (keyRow.revoked_at) return { valid: false, reason: 'attestor key revoked', keyId };

    const valid = verifyCredential(credential, Buffer.from(keyRow.ed25519_pubkey));
    return {
      valid,
      keyId,
      attestor: keyRow.owner_name,
      fingerprint: keyRow.fingerprint,
      ...(valid ? {} : { reason: 'signature does not match the registered key' }),
    };
  }
}
