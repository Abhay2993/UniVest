import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Startup } from '../types';

const STORAGE_KEY = 'univest.portfolio.v1';

/**
 * Demo investor profile. In production the annual limit comes from the
 * suitability engine (users.invest_limit_annual, Reg CF / ECSPR rules).
 */
export const ANNUAL_INVESTMENT_LIMIT = 12_000;

/** Single-position share of the annual limit that triggers the calm nudge. */
export const CONCENTRATION_WARNING_PCT = 40;

/** Reg CF: cancellation allowed until 48 hours before campaign close. */
export const COOLING_OFF_HOURS = 48;

export interface Commitment {
  startupId: string;
  amount: number;
  /** ISO instants, derived from the offering's close date at commit time. */
  committedAt: string;
  closesAt: string;
  cancellableUntil: string;
}

interface PortfolioValue {
  commitments: Record<string, Commitment>;
  getCommitment: (startupId: string) => Commitment | undefined;
  /** Total currently committed across all offerings (rolling exposure). */
  totalCommitted: number;
  commit: (startup: Startup, amount: number) => void;
  cancel: (startupId: string) => void;
  /** Single-position exposure (existing + proposed) as % of the annual limit. */
  exposurePct: (startupId: string, proposedAmount: number) => number;
}

const PortfolioContext = createContext<PortfolioValue>({
  commitments: {},
  getCommitment: () => undefined,
  totalCommitted: 0,
  commit: () => {},
  cancel: () => {},
  exposurePct: () => 0,
});

function persist(commitments: Record<string, Commitment>): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(commitments)).catch(() => {});
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [commitments, setCommitments] = useState<Record<string, Commitment>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Record<string, Commitment>;
        if (stored && typeof stored === 'object') setCommitments(stored);
      })
      .catch(() => {});
  }, []);

  const commit = useCallback((startup: Startup, amount: number) => {
    const now = Date.now();
    const closesAt = now + startup.daysLeft * 86_400_000;
    const entry: Commitment = {
      startupId: startup.id,
      amount,
      committedAt: new Date(now).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
      cancellableUntil: new Date(closesAt - COOLING_OFF_HOURS * 3_600_000).toISOString(),
    };
    setCommitments((prev) => {
      const next = { ...prev, [startup.id]: entry };
      persist(next);
      return next;
    });
  }, []);

  const cancel = useCallback((startupId: string) => {
    setCommitments((prev) => {
      const target = prev[startupId];
      // Mirror the database trigger: no cancellation inside the 48h window.
      if (!target || Date.now() > Date.parse(target.cancellableUntil)) return prev;
      const next = { ...prev };
      delete next[startupId];
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<PortfolioValue>(() => {
    const totalCommitted = Object.values(commitments).reduce((sum, c) => sum + c.amount, 0);
    return {
      commitments,
      getCommitment: (startupId) => commitments[startupId],
      totalCommitted,
      commit,
      cancel,
      exposurePct: (startupId, proposedAmount) => {
        const existing = commitments[startupId]?.amount ?? 0;
        return ((existing + proposedAmount) / ANNUAL_INVESTMENT_LIMIT) * 100;
      },
    };
  }, [commitments, commit, cancel]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioValue {
  return useContext(PortfolioContext);
}
