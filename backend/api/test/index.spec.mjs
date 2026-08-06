/**
 * Standalone verification of the index auto-invest allocation (no Nest/DB).
 * Run against the compiled output after `npm run build`:
 *   node test/index.spec.mjs
 * Exits non-zero on any failed assertion — CI gate for the water-fill allocator.
 */
import assert from 'node:assert/strict';
import { allocateBudget, nextRun, quarterLabel } from '../dist/index-fund/index.util.js';

let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const big = [
  { campaignId: 'a', capacity: 1_000_000 },
  { campaignId: 'b', capacity: 1_000_000 },
  { campaignId: 'c', capacity: 1_000_000 },
];

// 1. With ample capacity and a loose cap, the budget splits ~evenly and fully.
const even = allocateBudget(90000, big, 100);
assert.equal(even.allocations.length, 3);
assert.ok(Math.abs(even.deployed - 90000) < 0.05);
for (const a of even.allocations) assert.ok(Math.abs(a.amount - 30000) < 0.05);
ok('ample capacity + loose cap → even, full deployment');

// 2. Per-deal cap redirects the overflow to the other deals.
// budget 100k, 3 deals, cap 40% = 40k each → all can absorb → 33,333 each.
const capped = allocateBudget(100000, big, 40);
for (const a of capped.allocations) assert.ok(a.amount <= 40000 + 0.01);
assert.ok(Math.abs(capped.deployed - 100000) < 0.05);
ok('per-deal cap respected while still deploying the budget');

// 3. Capacity limits leave an undeployed remainder.
const tight = allocateBudget(100000, [{ campaignId: 'a', capacity: 20000 }, { campaignId: 'b', capacity: 15000 }], 100);
assert.equal(tight.deployed, 35000);
assert.equal(tight.undeployed, 65000);
ok('limited capacity caps deployment and reports the undeployed remainder');

// 4. A single deal with a tight cap deploys only up to the cap.
const one = allocateBudget(100000, [{ campaignId: 'a', capacity: 1_000_000 }], 25);
assert.equal(one.deployed, 25000);
assert.equal(one.undeployed, 75000);
ok('one deal under a 25% cap deploys 25% of the budget');

// 5. No candidates → nothing deployed.
const none = allocateBudget(50000, [], 50);
assert.equal(none.allocations.length, 0);
assert.equal(none.undeployed, 50000);
ok('no candidates → whole budget undeployed');

// 6. Period + cadence helpers.
assert.equal(quarterLabel(new Date('2026-08-02T00:00:00Z')), '2026-Q3');
assert.equal(quarterLabel(new Date('2026-01-15T00:00:00Z')), '2026-Q1');
assert.equal(nextRun(new Date('2026-08-02T00:00:00Z')).toISOString().slice(0, 10), '2026-11-02');
ok('quarter label + next-run (+3 months)');

console.log(`\n${passed} index-allocation assertions passed.`);
