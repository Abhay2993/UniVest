/**
 * Standalone verification of the reputation scorer (no Nest/DB).
 * Run against the compiled output after `npm run build`:
 *   node test/reputation.spec.mjs
 * Exits non-zero on any failed assertion — CI gate for the trust-score formula.
 */
import assert from 'node:assert/strict';
import {
  EMPTY_COUNTS,
  reputationBand,
  reputationScore,
} from '../dist/reputation/reputation.util.js';

let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

// 1. An empty track record sits at the 40 baseline ("Developing").
assert.equal(reputationScore(EMPTY_COUNTS), 40);
assert.equal(reputationBand(40), 'Developing');
ok('no track record scores 40 / Developing');

// 2. The Helion founder (2 completed, 2 attested, 1 replicated, 1 endorsement).
const founder = { completed: 2, attested: 2, replicated: 1, slipped: 0, dealsLed: 0, endorsements: 1 };
// 40 + 7*2 + 9*2 + 11*1 + 5*1 = 88
assert.equal(reputationScore(founder), 88);
assert.equal(reputationBand(88), 'Exceptional');
ok('founder with attested + replicated record scores 88 / Exceptional');

// 3. Independent verification outweighs raw completion.
const rawOnly = { ...EMPTY_COUNTS, completed: 3 };
const verified = { ...EMPTY_COUNTS, completed: 1, attested: 1, replicated: 1 };
assert.ok(reputationScore(verified) > reputationScore(rawOnly));
ok('attestation + replication outweigh raw completions');

// 4. Slips subtract and the score floors at 0.
const slipping = { ...EMPTY_COUNTS, completed: 1, slipped: 5 };
assert.equal(reputationScore(slipping), Math.max(0, 40 + 7 - 70));
assert.equal(reputationScore(slipping), 0);
assert.equal(reputationBand(0), 'Unproven');
ok('slips subtract; score floors at 0 / Unproven');

// 5. Bands partition the range at 80 / 60 / 40.
assert.equal(reputationBand(80), 'Exceptional');
assert.equal(reputationBand(79), 'Strong');
assert.equal(reputationBand(60), 'Strong');
assert.equal(reputationBand(59), 'Developing');
ok('bands partition at 80 / 60 / 40');

console.log(`\n${passed} reputation assertions passed.`);
