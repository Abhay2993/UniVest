/**
 * Standalone verification of the milestone-tranched escrow math (no Nest/DB).
 * Run against the compiled output after `npm run build`:
 *   node test/escrow.spec.mjs
 * Exits non-zero on any failed assertion — CI gate for the escrow roll-up.
 */
import assert from 'node:assert/strict';
import { isReleasable, summarizeEscrow, trancheAmount } from '../dist/escrow/escrow.util.js';

let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const ENVELOPE = 2_500_000;
const tranches = [
  { releasePct: 30, status: 'released', releasedAmount: 750000 },
  { releasePct: 40, status: 'held', releasedAmount: null },
  { releasePct: 30, status: 'held', releasedAmount: null },
];

// 1. trancheAmount uses the snapshot when present, else pct × envelope.
assert.equal(trancheAmount({ releasePct: 40, status: 'held' }, ENVELOPE), 1_000_000);
assert.equal(trancheAmount({ releasePct: 30, status: 'released', releasedAmount: 750000 }, ENVELOPE), 750000);
ok('trancheAmount prefers the snapshot, else pct × envelope');

// 2. Summary splits released vs held against the envelope.
const s = summarizeEscrow(tranches, ENVELOPE);
assert.equal(s.releasedAmount, 750000);
assert.equal(s.heldAmount, 1_750_000);
assert.equal(s.releasedPct, 30);
assert.equal(s.deRiskedPct, 70);
ok('summary splits released 750k / held 1.75M (30% released, 70% protected)');

// 3. Refunds leave escrow (reduce the held balance) and are tracked.
const withRefund = summarizeEscrow(
  [
    { releasePct: 30, status: 'released', releasedAmount: 750000 },
    { releasePct: 40, status: 'refunded', releasedAmount: 1_000_000 },
    { releasePct: 30, status: 'held', releasedAmount: null },
  ],
  ENVELOPE,
);
assert.equal(withRefund.refundedAmount, 1_000_000);
assert.equal(withRefund.heldAmount, 750000);
ok('refunds reduce the held balance and are tracked separately');

// 4. Held never goes negative even if snapshots overshoot.
const over = summarizeEscrow([{ releasePct: 60, status: 'released', releasedAmount: 3_000_000 }], ENVELOPE);
assert.equal(over.heldAmount, 0);
ok('held balance floors at zero');

// 5. Releasability: held + (no milestone OR attested) is releasable; unattested is not.
assert.equal(isReleasable({ status: 'held', hasMilestone: true, milestoneAttested: true }), true);
assert.equal(isReleasable({ status: 'held', hasMilestone: false, milestoneAttested: false }), true);
assert.equal(isReleasable({ status: 'held', hasMilestone: true, milestoneAttested: false }), false);
assert.equal(isReleasable({ status: 'released', hasMilestone: true, milestoneAttested: true }), false);
ok('isReleasable gates on attestation and only for held tranches');

console.log(`\n${passed} escrow assertions passed.`);
