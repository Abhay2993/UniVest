import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurrencyCode, setActiveCurrency } from '../utils/format';

const STORAGE_KEY = 'univest.settings.v1';

/**
 * US → Reg CF regime: 48h-before-close cancellation, statutory annual limits.
 * EU → ECSPR regime: 4-day reflection period, express-consent nudge, EUR.
 */
export type Jurisdiction = 'US' | 'EU';

/** Countries onboarding maps to the EU/ECSPR regime. */
export const EU_COUNTRIES = ['NLD', 'DEU'];

interface SettingsValue {
  jurisdiction: Jurisdiction;
  currency: CurrencyCode;
  /** Switching jurisdiction also switches to its default currency. */
  setJurisdiction: (j: Jurisdiction) => void;
  setCurrency: (c: CurrencyCode) => void;
}

const SettingsContext = createContext<SettingsValue>({
  jurisdiction: 'US',
  currency: 'USD',
  setJurisdiction: () => {},
  setCurrency: () => {},
});

function persist(jurisdiction: Jurisdiction, currency: CurrencyCode): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ jurisdiction, currency })).catch(() => {});
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdictionState] = useState<Jurisdiction>('US');
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Partial<{ jurisdiction: Jurisdiction; currency: CurrencyCode }>;
        if (stored.jurisdiction === 'US' || stored.jurisdiction === 'EU') {
          setJurisdictionState(stored.jurisdiction);
        }
        if (stored.currency === 'USD' || stored.currency === 'EUR') {
          setCurrencyState(stored.currency);
          setActiveCurrency(stored.currency);
        }
      })
      .catch(() => {});
  }, []);

  const setJurisdiction = useCallback((j: Jurisdiction) => {
    const defaultCurrency: CurrencyCode = j === 'EU' ? 'EUR' : 'USD';
    setJurisdictionState(j);
    setCurrencyState(defaultCurrency);
    setActiveCurrency(defaultCurrency);
    persist(j, defaultCurrency);
  }, []);

  const setCurrency = useCallback(
    (c: CurrencyCode) => {
      setCurrencyState(c);
      setActiveCurrency(c);
      persist(jurisdiction, c);
    },
    [jurisdiction],
  );

  const value = useMemo<SettingsValue>(
    () => ({ jurisdiction, currency, setJurisdiction, setCurrency }),
    [jurisdiction, currency, setJurisdiction, setCurrency],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
