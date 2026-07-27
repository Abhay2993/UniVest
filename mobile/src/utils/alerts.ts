/**
 * Material-event alerts — pure, unit-tested. Derives a holder's alert feed from
 * their portfolio positions, filtered by category preferences. Mirrors the
 * backend `GET /alerts/feed` (holdings-scoped + preference-filtered): attested
 * milestones on held deals, and open governance votes on held SPVs.
 */
import { PortfolioPosition } from '../types';
import { STARTUPS } from '../data/mock';
import { PROPOSALS } from '../data/governance';

export type AlertKind = 'attestation' | 'escrow' | 'governance' | 'secondary' | 'closing';

export interface AlertItem {
  kind: AlertKind;
  title: string;
  detail: string;
}

export interface AlertPrefs {
  attestation: boolean;
  escrow: boolean;
  governance: boolean;
  secondary: boolean;
  closing: boolean;
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  attestation: true,
  escrow: true,
  governance: true,
  secondary: true,
  closing: true,
};

export const ALERT_CATEGORIES: { key: AlertKind; label: string }[] = [
  { key: 'attestation', label: 'Attestations' },
  { key: 'escrow', label: 'Escrow' },
  { key: 'governance', label: 'Governance' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'closing', label: 'Closing' },
];

/** Build the holder's alert feed from their positions, filtered by preferences. */
export function buildAlerts(positions: PortfolioPosition[], prefs: AlertPrefs): AlertItem[] {
  const items: AlertItem[] = [];

  for (const pos of positions) {
    const startup = STARTUPS.find((s) => s.id === pos.startupId);

    // Attested milestones on a held deal.
    if (prefs.attestation && startup) {
      for (const m of startup.milestones) {
        if (m.status === 'completed' && m.attestation) {
          items.push({
            kind: 'attestation',
            title: `${startup.name}: "${m.title}" attested`,
            detail: `Independently verified by ${m.attestation.verifierOrg}.`,
          });
        }
      }
    }

    // Open governance votes on a held SPV.
    if (prefs.governance) {
      for (const p of PROPOSALS.filter((pr) => pr.spvName === pos.spvName)) {
        items.push({
          kind: 'governance',
          title: `Vote open: ${p.title}`,
          detail: `${pos.spvName} — voting closes in ${p.closesInDays} days.`,
        });
      }
    }
  }

  // De-duplicate (a deal can appear once per identical alert).
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = `${it.kind}|${it.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
