/**
 * Standalone verification of the governance tally (no Nest/DB).
 * Run against the compiled output after `npm run build`:
 *   node test/governance.spec.mjs
 * Exits non-zero on any failed assertion — CI gate for quorum + outcome logic.
 */
import assert from 'node:assert/strict';
import { finalize, tally } from '../dist/governance/governance.util.js';

let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

// Vasca SPV: eligible 430 (Alice 250 + Bob 180), 50% quorum.
const base = { forWeight: 250, againstWeight: 0, abstainWeight: 0, eligibleWeight: 430, quorumPct: 50 };

// 1. Turnout and quorum from weighted votes.
const t = tally(base);
assert.equal(t.votesCastWeight, 250);
assert.equal(t.turnoutPct, 58.14); // 250/430
assert.equal(t.quorumMet, true);
assert.equal(t.leaning, 'for');
ok('turnout 58.14% clears the 50% quorum; leaning FOR');

// 2. Shares are of eligible weight, so bars leave room for non-voters.
assert.equal(t.forPct, 58.14);
assert.equal(t.againstPct, 0);
ok('vote shares are computed against eligible weight');

// 3. A quorum-clearing FOR majority passes at close.
assert.equal(finalize(base), 'passed');
ok('quorum + FOR majority → passed');

// 4. Below quorum, even a FOR majority is rejected.
assert.equal(finalize({ ...base, forWeight: 100, eligibleWeight: 430 }), 'rejected'); // 100/430 = 23% < 50%
ok('below quorum → rejected regardless of majority');

// 5. Quorum met but AGAINST outweighs FOR → rejected; a tie → rejected.
assert.equal(finalize({ forWeight: 100, againstWeight: 200, abstainWeight: 0, eligibleWeight: 430, quorumPct: 50 }), 'rejected');
assert.equal(finalize({ forWeight: 200, againstWeight: 200, abstainWeight: 40, eligibleWeight: 430, quorumPct: 50 }), 'rejected');
ok('AGAINST majority and ties → rejected');

// 6. Abstains count toward turnout/quorum but not the for/against decision.
const withAbstain = { forWeight: 120, againstWeight: 100, abstainWeight: 100, eligibleWeight: 430, quorumPct: 50 };
assert.equal(tally(withAbstain).quorumMet, true); // 320/430 = 74%
assert.equal(finalize(withAbstain), 'passed');    // for 120 > against 100
ok('abstains lift turnout but do not sway the FOR/AGAINST outcome');

console.log(`\n${passed} governance assertions passed.`);
