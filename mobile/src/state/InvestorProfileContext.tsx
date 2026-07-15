import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'univest.investorProfile.v1';

export interface InvestorProfile {
  /** 'new' shows onboarding; 'browsing' skipped it; 'verified' completed it. */
  status: 'new' | 'browsing' | 'verified';
  fullName: string | null;
  country: string | null;
  kycStatus: 'not_started' | 'approved';
  /** Suitability quiz score, 0–5. */
  quizScore: number | null;
  /** Reg CF annual limit computed from income/net-worth bands. */
  annualLimit: number | null;
}

const DEFAULT_PROFILE: InvestorProfile = {
  status: 'new',
  fullName: null,
  country: null,
  kycStatus: 'not_started',
  quizScore: null,
  annualLimit: null,
};

interface ProfileValue {
  profile: InvestorProfile;
  /** True while the onboarding flow should be shown. */
  onboardingVisible: boolean;
  /** Re-open onboarding (e.g. a browsing guest taps "Verify to invest"). */
  requestOnboarding: () => void;
  /** Guest mode: browse without verification; investing stays gated. */
  skipOnboarding: () => void;
  completeOnboarding: (fields: {
    fullName: string;
    country: string;
    quizScore: number;
    annualLimit: number;
  }) => void;
}

const InvestorProfileContext = createContext<ProfileValue>({
  profile: DEFAULT_PROFILE,
  onboardingVisible: true,
  requestOnboarding: () => {},
  skipOnboarding: () => {},
  completeOnboarding: () => {},
});

function persist(profile: InvestorProfile): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
}

export function InvestorProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<InvestorProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setProfile({ ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<InvestorProfile>) });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const skipOnboarding = useCallback(() => {
    setReopened(false);
    setProfile((cur) => {
      const next: InvestorProfile = { ...cur, status: 'browsing' };
      persist(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(
    (fields: { fullName: string; country: string; quizScore: number; annualLimit: number }) => {
      setReopened(false);
      setProfile(() => {
        const next: InvestorProfile = {
          status: 'verified',
          fullName: fields.fullName,
          country: fields.country,
          kycStatus: 'approved',
          quizScore: fields.quizScore,
          annualLimit: fields.annualLimit,
        };
        persist(next);
        return next;
      });
    },
    [],
  );

  const value = useMemo<ProfileValue>(
    () => ({
      profile,
      onboardingVisible: hydrated && (profile.status === 'new' || reopened),
      requestOnboarding: () => setReopened(true),
      skipOnboarding,
      completeOnboarding,
    }),
    [profile, hydrated, reopened, skipOnboarding, completeOnboarding],
  );

  return <InvestorProfileContext.Provider value={value}>{children}</InvestorProfileContext.Provider>;
}

export function useInvestorProfile(): ProfileValue {
  return useContext(InvestorProfileContext);
}
