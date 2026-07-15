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
}
