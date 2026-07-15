export type Vertical =
  | 'Fusion Energy'
  | 'Quantum Computing'
  | 'MedTech'
  | 'AI & Robotics'
  | 'Advanced Materials';

export type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  /** ISO date — target for upcoming, actual for completed. */
  date: string;
  hasVideoUpdate?: boolean;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  country: string;
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
}
