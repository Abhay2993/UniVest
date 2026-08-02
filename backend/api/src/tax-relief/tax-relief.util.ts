/**
 * Tax-relief math — pure, dependency-free so it can be unit-tested in isolation
 * (test/tax-relief.spec.mjs) and shared by the service. Which scheme applies is
 * decided elsewhere (investor tax residency ∩ campaign schemes); here we compute
 * the relief for an amount, respecting the scheme's per-investor annual cap, and
 * the tax year an investment falls in.
 */

export interface SchemeParams {
  code: string;
  name: string;
  jurisdiction: string;
  incomeReliefPct: number;
  annualCap: number | null;
  capCurrency: string;
  minHoldMonths: number;
  cgtExempt: boolean;
  lossRelief: boolean;
  certificateKind: string;
}

export interface ReliefResult {
  /** The portion of the amount that qualifies, after the remaining annual cap. */
  eligibleAmount: number;
  /** eligibleAmount × the scheme's income-relief rate. */
  reliefAmount: number;
  /** True when the annual cap clipped the eligible amount. */
  cappedByAnnualLimit: boolean;
  /** Remaining annual cap before this claim (null = uncapped scheme). */
  remainingCap: number | null;
  /** relief ÷ amount, i.e. the realized rate after any capping. */
  effectiveReliefPct: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Relief for `amount`, given the scheme and what the investor already claimed this year. */
export function reliefFor(
  scheme: SchemeParams,
  amount: number,
  priorClaimedThisYear = 0,
): ReliefResult {
  const uncapped = scheme.annualCap == null;
  const remainingCap = uncapped ? null : Math.max(scheme.annualCap! - priorClaimedThisYear, 0);
  const eligibleAmount = uncapped ? amount : Math.min(amount, remainingCap as number);
  const reliefAmount = round2((eligibleAmount * scheme.incomeReliefPct) / 100);
  return {
    eligibleAmount: round2(eligibleAmount),
    reliefAmount,
    cappedByAnnualLimit: !uncapped && amount > (remainingCap as number),
    remainingCap: remainingCap == null ? null : round2(remainingCap),
    effectiveReliefPct: amount > 0 ? round2((reliefAmount / amount) * 100) : 0,
  };
}

/**
 * The most generous applicable scheme (highest income-relief rate that still has
 * cap headroom). Ties break toward the larger remaining cap.
 */
export function bestScheme(
  schemes: SchemeParams[],
  priorByCode: Record<string, number> = {},
): SchemeParams | null {
  const withRoom = schemes.filter(
    (s) => s.annualCap == null || s.annualCap - (priorByCode[s.code] ?? 0) > 0,
  );
  if (withRoom.length === 0) return null;
  return withRoom.sort((a, b) => {
    if (b.incomeReliefPct !== a.incomeReliefPct) return b.incomeReliefPct - a.incomeReliefPct;
    const ra = a.annualCap == null ? Infinity : a.annualCap - (priorByCode[a.code] ?? 0);
    const rb = b.annualCap == null ? Infinity : b.annualCap - (priorByCode[b.code] ?? 0);
    return rb - ra;
  })[0];
}

/** The tax year an investment falls in, per jurisdiction (UK 6 Apr, AU 1 Jul, else calendar). */
export function currentTaxYear(jurisdiction: string, now = new Date()): string {
  const fyStr = (start: number) => `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
  const y = now.getUTCFullYear();
  if (jurisdiction === 'GB') {
    return fyStr(now >= new Date(Date.UTC(y, 3, 6)) ? y : y - 1); // 6 April
  }
  if (jurisdiction === 'AU') {
    return fyStr(now >= new Date(Date.UTC(y, 6, 1)) ? y : y - 1); // 1 July
  }
  return String(y);
}
