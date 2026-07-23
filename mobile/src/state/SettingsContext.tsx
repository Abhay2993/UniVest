import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurrencyCode, setActiveCurrency } from '../utils/format';
import { JurisdictionId, REGIMES } from '../utils/compliance';

const STORAGE_KEY = 'univest.settings.v2';

/** The active regulatory regime drives cooling-off, limits, consent, currency. */
export type Jurisdiction = JurisdictionId;

/** Countries onboarding maps to the EU/ECSPR regime (kept for compatibility). */
export const EU_COUNTRIES = ['NLD', 'DEU', 'FRA', 'CHE'];

interface SettingsValue {
  jurisdiction: Jurisdiction;
  currency: CurrencyCode;
  /** Switching jurisdiction also switches to its regime's currency. */
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

function isJurisdiction(x: unknown): x is Jurisdiction {
  return typeof x === 'string' && x in REGIMES;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [jurisdiction, setJurisdictionState] = useState<Jurisdiction>('US');
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Partial<{ jurisdiction: Jurisdiction; currency: CurrencyCode }>;
        if (isJurisdiction(stored.jurisdiction)) setJurisdictionState(stored.jurisdiction);
        if (stored.currency) {
          setCurrencyState(stored.currency);
          setActiveCurrency(stored.currency);
        }
      })
      .catch(() => {});
  }, []);

  const setJurisdiction = useCallback((j: Jurisdiction) => {
    const regimeCurrency = REGIMES[j].currency;
    setJurisdictionState(j);
    setCurrencyState(regimeCurrency);
    setActiveCurrency(regimeCurrency);
    persist(j, regimeCurrency);
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
