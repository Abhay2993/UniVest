/**
 * Standalone verification of the W3C VC Ed25519 crypto (no Nest/DB needed).
 * Run against the compiled output after `npm run build`:
 *   node test/vc-crypto.spec.mjs
 * Exits non-zero on any failed assertion — CI gate for the crown-jewel crypto.
 */
import assert from 'node:assert/strict';
import {
  demoKeyPair,
  keyIdFromCredential,
  signCredential,
  stableStringify,
  verifyCredential,
} from '../dist/credentials/vc-crypto.js';

let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

// 1. stableStringify is order-independent (canonical form).
assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
assert.equal(stableStringify({ a: 1, b: { d: 4, c: 3 } }), '{"a":1,"b":{"c":3,"d":4}}');
ok('stableStringify produces canonical, key-sorted output');

// 2. A signed credential verifies against the matching public key.
const keyId = 'oxford-tto-2026';
const { privateKey, publicKeyRaw } = demoKeyPair(keyId);
const payload = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential', 'MilestoneAttestationCredential'],
  issuer: `did:univest:attestor:${keyId}`,
  credentialSubject: { milestone: 'Phase I Trials', evidenceHashSha256: 'abc123' },
};
const { credential } = signCredential(payload, keyId, privateKey);
assert.equal(credential.proof.type, 'Ed25519Signature2020');
assert.equal(keyIdFromCredential(credential), keyId);
assert.equal(verifyCredential(credential, publicKeyRaw), true);
ok('a genuine credential verifies (valid Ed25519 proof)');

// 3. Tampering with any field breaks verification.
const tampered = structuredClone(credential);
tampered.credentialSubject.milestone = 'FORGED MILESTONE';
assert.equal(verifyCredential(tampered, publicKeyRaw), false);
ok('tampered credential fails verification (forgery detected)');

// 4. A different attestor key cannot validate the signature.
const otherKey = demoKeyPair('mit-tlo-2026');
assert.equal(verifyCredential(credential, otherKey.publicKeyRaw), false);
ok('wrong public key fails verification');

// 5. Demo key derivation is deterministic (reproducible demo credentials).
assert.deepEqual(demoKeyPair(keyId).publicKeyRaw, publicKeyRaw);
ok('demo key derivation is deterministic');

console.log(`\nVC crypto: ${passed} assertions passed`);
