export type Vertical =
  | 'Fusion Energy'
  | 'Quantum Computing'
  | 'MedTech'
  | 'AI & Robotics'
  | 'Advanced Materials';

export type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming';

/**
 * Independent sign-off on a completed milestone: a TTO officer or third-party
 * reviewer signs the evidence bundle (Ed25519 over its SHA-256) with a key
 * from the platform's attestor registry. The stamp renders in the tracker.
 */
export interface MilestoneAttestation {
  verifierName: string;
  verifierOrg: string;
  role: 'tto' | 'independent_reviewer';
  /** ISO date of signature. */
  signedAt: string;
  /** Short fingerprint of the registered Ed25519 public key. */
  keyFingerprint: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  /** ISO date — target for upcoming, actual for completed. */
  date: string;
  hasVideoUpdate?: boolean;
  attestation?: MilestoneAttestation;
}

export type QARole = 'founder' | 'tto' | 'investor';

export interface QAAnswer {
  id: string;
  authorName: string;
  role: QARole;
  body: string;
  /** ISO date. */
  date: string;
}

export interface QAQuestion {
  id: string;
  authorName: string;
  role: QARole;
  body: string;
  /** ISO date. */
  date: string;
  upvotes: number;
  answers: QAAnswer[];
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  country: string;
  city: string;
  /** WGS84 coordinates for the Global Research Map. */
  latitude: number;
  longitude: number;
  activeDeals: number;
}

export interface Startup {
  id: string;
  name: string;
  university: University;
  vertical: Vertical;
  tagline: string;
  verified: boolean;
  targetAmount: number;
  raisedAmount: number;
  investorCount: number;
  minInvestment: number;
  daysLeft: number;
  leadInvestor: string;
  pitch: {
    plainEnglish: string;
    commercialization: string;
    labProof: string;
  };
  milestones: Milestone[];
  questions: QAQuestion[];
  dataRoom: DataRoomSnippet[];
}

/** Indexed extract from a data-room document, used by the Diligence Copilot. */
export interface DataRoomSnippet {
  id: string;
  docTitle: string;
  section: string;
  text: string;
  /** Retrieval index terms. */
  keywords: string[];
}

export interface NavPoint {
  /** ISO date of the NAV mark. */
  date: string;
  navPerUnit: number;
}

/** A settled SPV position with its quarterly NAV history. */
export interface PortfolioPosition {
  id: string;
  startupId: string;
  startupName: string;
  spvName: string;
  units: number;
  costBasis: number;
  /** ISO date capital was called. */
  investedOn: string;
  navSeries: NavPoint[];
}

export interface TaxDocument {
  id: string;
  taxYear: number;
  kind: string;
  spvName: string;
  issuedOn?: string;
  status: 'available' | 'pending';
}

export interface AuctionOrderInput {
  side: 'buy' | 'sell';
  units: number;
  limitPrice: number;
}

/** A batch-auction window over one SPV's units. */
export interface AuctionWindowData {
  id: string;
  spvName: string;
  startupId: string;
  /** ISO instant the window closes and clears. */
  closesAt: string;
  /** Clearing prices of past windows, oldest first. */
  history: { date: string; price: number }[];
  /** Resting orders in the current window. */
  book: AuctionOrderInput[];
}

export interface SyndicateInfo {
  id: string;
  name: string;
  thesis: string;
  verified: boolean;
}

/** A realized SPV exit with its distribution waterfall inputs. */
export interface ExitedPosition {
  id: string;
  startupName: string;
  spvName: string;
  exitKind: string;
  /** ISO date of the liquidity event. */
  exitedOn: string;
  units: number;
  costBasis: number;
  grossProceeds: number;
  /** Platform carry percentage applied to profit. */
  carryPct: number;
}

export type ActivityKind =
  | 'milestone_attested'
  | 'auction_cleared'
  | 'tax_document'
  | 'closing_soon'
  | 'distribution';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  body: string;
  /** ISO instant. */
  date: string;
}
