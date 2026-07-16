import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InvestPanel } from '../InvestPanel';
import { STARTUPS } from '../../data/mock';
import { ACADEMY_MODULES } from '../../data/academy';
import { ThemeProvider } from '../../theme/ThemeContext';
import { EducationProvider } from '../../state/EducationContext';
import { InvestorProfileProvider } from '../../state/InvestorProfileContext';
import { PortfolioProvider } from '../../state/PortfolioContext';

const helion = STARTUPS[0]; // min ticket $100, 18 days left

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <InvestorProfileProvider>
        <EducationProvider>
          <PortfolioProvider>{children}</PortfolioProvider>
        </EducationProvider>
      </InvestorProfileProvider>
    </ThemeProvider>
  );
}

/** Seed persisted state the providers hydrate from. */
async function seedVerifiedProfile(annualLimit = 12_000) {
  await AsyncStorage.setItem(
    'univest.investorProfile.v1',
    JSON.stringify({
      status: 'verified',
      fullName: 'Test Investor',
      country: 'USA',
      kycStatus: 'approved',
      quizScore: 5,
      annualLimit,
    }),
  );
  // Complete the academy so the full statutory limit is unlocked.
  await AsyncStorage.setItem(
    'univest.academy.v1',
    JSON.stringify(ACADEMY_MODULES.map((m) => m.id)),
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('InvestPanel — KYC gate', () => {
  it('asks unverified users to verify instead of invest', async () => {
    const { findByText, queryByText } = render(<InvestPanel startup={helion} />, {
      wrapper: Providers,
    });
    expect(await findByText('Verify Identity to Invest')).toBeTruthy();
    expect(queryByText(/Invest — from/)).toBeNull();
  });
});

describe('InvestPanel — concentration warning threshold', () => {
  it('interrupts with the nudge when a ticket is ≥40% of the annual limit', async () => {
    await seedVerifiedProfile(12_000);
    const { findByText, getByText } = render(<InvestPanel startup={helion} />, {
      wrapper: Providers,
    });

    fireEvent.press(await findByText(/Invest — from/));
    fireEvent.press(getByText('$5,000')); // 5,000 / 12,000 = 41.7%
    fireEvent.press(getByText('Reserve $5,000'));

    expect(await findByText('A measured note on concentration')).toBeTruthy();
    // 5,000 / 12,000 = 41.7% → rendered rounded to 42%
    expect(getByText(/42% of your \$12,000 annual/)).toBeTruthy();
  });

  it('goes straight to the subscription agreement below the threshold', async () => {
    await seedVerifiedProfile(12_000);
    const { findByText, getByText } = render(<InvestPanel startup={helion} />, {
      wrapper: Providers,
    });

    fireEvent.press(await findByText(/Invest — from/));
    fireEvent.press(getByText('$1,000')); // 8.3% — no nudge
    fireEvent.press(getByText('Reserve $1,000'));

    expect(await findByText('Subscription Agreement')).toBeTruthy();
  });
});

describe('InvestPanel — cooling-off states', () => {
  const baseCommitment = {
    startupId: helion.id,
    amount: 1_000,
    committedAt: new Date().toISOString(),
    signerName: 'Test Investor',
  };

  it('shows the countdown and one-tap cancel while the window is open', async () => {
    await seedVerifiedProfile();
    await AsyncStorage.setItem(
      'univest.portfolio.v1',
      JSON.stringify({
        [helion.id]: {
          ...baseCommitment,
          closesAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
          cancellableUntil: new Date(Date.now() + 8 * 86_400_000).toISOString(),
        },
      }),
    );
    const { findByText, getByText } = render(<InvestPanel startup={helion} />, {
      wrapper: Providers,
    });

    expect(await findByText('Commitment Reserved')).toBeTruthy();
    expect(getByText('left to cancel')).toBeTruthy();
    expect(getByText('Cancel Commitment')).toBeTruthy();
  });

  it('locks the commitment once inside the 48h window', async () => {
    await seedVerifiedProfile();
    await AsyncStorage.setItem(
      'univest.portfolio.v1',
      JSON.stringify({
        [helion.id]: {
          ...baseCommitment,
          closesAt: new Date(Date.now() + 86_400_000).toISOString(),
          cancellableUntil: new Date(Date.now() - 3_600_000).toISOString(),
        },
      }),
    );
    const { findByText, queryByText } = render(<InvestPanel startup={helion} />, {
      wrapper: Providers,
    });

    expect(await findByText('Window closed')).toBeTruthy();
    expect(queryByText('Cancel Commitment')).toBeNull();
  });
});
