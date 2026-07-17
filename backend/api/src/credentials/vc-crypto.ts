/**
 * Pure W3C Verifiable Credential crypto — no Nest/DB dependencies, so it is
 * unit-testable standalone and reusable by any third-party verifier. Real
 * Ed25519 via node:crypto (RFC 8410 DER wrapping of raw 32-byte keys).
 */
import * as crypto from 'node:crypto';

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_ED25519_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Deterministic demo attestor key derived from the key_id. Production keys
 * live in the officer's secure enclave and never leave the device — only the
 * public key is registered.
 */
export function demoKeyPair(keyId: string): { privateKey: crypto.KeyObject; publicKeyRaw: Buffer } {
  const seed = crypto.createHash('sha256').update(`univest-demo-attestor:${keyId}`).digest();
  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const spki = crypto.createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  return { privateKey, publicKeyRaw: Buffer.from(spki.subarray(spki.length - 32)) };
}

export function publicKeyFromRaw(raw: Buffer): crypto.KeyObject {
  return crypto.createPublicKey({
    key: Buffer.concat([SPKI_ED25519_PREFIX, raw]),
    format: 'der',
    type: 'spki',
  });
}

/** Deterministic JSON serialization (sorted keys) so hashes are canonical. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

export interface SignedCredential extends Record<string, unknown> {
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
}

/** Attach an Ed25519Signature2020 proof to a credential payload. */
export function signCredential(
  payload: Record<string, unknown>,
  keyId: string,
  privateKey: crypto.KeyObject,
): { credential: SignedCredential; vcHash: Buffer } {
  const canonical = Buffer.from(stableStringify(payload));
  const vcHash = crypto.createHash('sha256').update(canonical).digest();
  const signature = crypto.sign(null, canonical, privateKey);
  const credential: SignedCredential = {
    ...payload,
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `did:univest:attestor:${keyId}#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: signature.toString('base64url'),
    },
  };
  return { credential, vcHash };
}

/** Verify a credential's Ed25519 proof against a raw public key. */
export function verifyCredential(
  credential: Record<string, any>,
  publicKeyRaw: Buffer,
): boolean {
  const proof = credential?.proof;
  if (!proof?.proofValue) return false;
  const { proof: _omit, ...payload } = credential;
  const canonical = Buffer.from(stableStringify(payload));
  try {
    return crypto.verify(
      null,
      canonical,
      publicKeyFromRaw(publicKeyRaw),
      Buffer.from(String(proof.proofValue), 'base64url'),
    );
  } catch {
    return false;
  }
}

/** Extract the attestor key_id from a credential's verificationMethod. */
export function keyIdFromCredential(credential: Record<string, any>): string | null {
  const vm = credential?.proof?.verificationMethod;
  if (typeof vm !== 'string') return null;
  const m = /^did:univest:attestor:(.+?)(#|$)/.exec(vm);
  return m ? m[1] : null;
}
