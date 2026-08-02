/**
 * Standalone verification of the tax-relief math (no Nest/DB).
 * Run against the compiled output after `npm run build`:
 *   node test/tax-relief.spec.mjs
 * Exits non-zero on any failed assertion — CI gate for relief + cap + tax-year.
 */
import assert from 'node:assert/strict';
import {
  bestScheme,
  currentTaxYear,
  reliefFor,
} from '../dist/tax-relief/tax-relief.util.js';

let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const seis = { code: 'uk_seis', name: 'UK SEIS', jurisdiction: 'GB', incomeReliefPct: 50, annualCap: 200000, capCurrency: 'GBP', minHoldMonths: 36, cgtExempt: true, lossRelief: true, certificateKind: 'SEIS3' };
const kiEis = { code: 'uk_ki_eis', name: 'KI-EIS', jurisdiction: 'GB', incomeReliefPct: 30, annualCap: 2000000, capCurrency: 'GBP', minHoldMonths: 36, cgtExempt: true, lossRelief: true, certificateKind: 'EIS3-KI' };
const qsbs = { code: 'us_qsbs', name: 'QSBS', jurisdiction: 'US', incomeReliefPct: 0, annualCap: null, capCurrency: 'USD', minHoldMonths: 60, cgtExempt: true, lossRelief: false, certificateKind: 'QSBS' };

// 1. Basic relief: £50k @ 30% (KI-EIS) = £15k.
assert.equal(reliefFor(kiEis, 50000).reliefAmount, 15000);
assert.equal(reliefFor(seis, 50000).reliefAmount, 25000); // 50%
ok('relief = amount × income-relief rate');

// 2. Annual cap clips the eligible amount (SEIS £200k cap).
const capped = reliefFor(seis, 250000, 0);
assert.equal(capped.eligibleAmount, 200000);
assert.equal(capped.reliefAmount, 100000); // 50% of the capped 200k
assert.equal(capped.cappedByAnnualLimit, true);
ok('annual cap clips eligible amount and relief');

// 3. Prior claims this year reduce the remaining cap.
const afterPrior = reliefFor(seis, 100000, 150000); // 50k headroom left
assert.equal(afterPrior.eligibleAmount, 50000);
assert.equal(afterPrior.remainingCap, 50000);
assert.equal(afterPrior.reliefAmount, 25000);
ok('prior-year claims reduce remaining cap');

// 4. Uncapped scheme (QSBS) never caps and gives 0 upfront relief.
const q = reliefFor(qsbs, 1000000);
assert.equal(q.reliefAmount, 0);
assert.equal(q.remainingCap, null);
assert.equal(q.cappedByAnnualLimit, false);
ok('uncapped QSBS: no cap, 0 upfront relief (CGT benefit is later)');

// 5. bestScheme picks the highest-relief scheme with headroom (SEIS over KI-EIS).
assert.equal(bestScheme([kiEis, seis]).code, 'uk_seis');
// When SEIS cap is exhausted, fall back to KI-EIS.
assert.equal(bestScheme([kiEis, seis], { uk_seis: 200000 }).code, 'uk_ki_eis');
ok('bestScheme prefers highest relief, falls back when a cap is exhausted');

// 6. Tax year: UK runs 6 Apr; AU runs 1 Jul; US is calendar.
assert.equal(currentTaxYear('GB', new Date('2026-05-01T00:00:00Z')), '2026/27');
assert.equal(currentTaxYear('GB', new Date('2026-03-01T00:00:00Z')), '2025/26');
assert.equal(currentTaxYear('AU', new Date('2026-08-01T00:00:00Z')), '2026/27');
assert.equal(currentTaxYear('US', new Date('2026-08-01T00:00:00Z')), '2026');
ok('tax-year boundaries: UK 6 Apr, AU 1 Jul, US calendar');

console.log(`\n${passed} tax-relief assertions passed.`);
