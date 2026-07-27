/**
 * Seeded endorsements (web-of-trust) per deal. Endorsers are the fictional TTOs
 * and reviewers consistent with the app's universe — a named actor vouching for
 * a founder, mirroring the backend `endorsements` table. Feeds the founder trust
 * profile on the deal page and the reputation score.
 */
export interface FounderEndorsement {
  endorserName: string;
  endorserRole: string;
  note: string;
}

export const FOUNDER_ENDORSEMENTS: Record<string, FounderEndorsement[]> = {
  s1: [
    {
      endorserName: 'K. Brennan',
      endorserRole: 'MIT TLO',
      note: 'Rigorous evidence packages — every milestone we attested held up under independent replication.',
    },
  ],
  s2: [
    {
      endorserName: 'Dr. L. Baumann',
      endorserRole: 'ETH transfer',
      note: 'Deep photonics expertise; the logical-qubit result reproduced on our metrology bench.',
    },
  ],
  s3: [
    {
      endorserName: 'Prof. E. Osei',
      endorserRole: 'Oxford',
      note: 'Careful pre-clinical work — the zero-thrombosis finding replicated in a blinded study.',
    },
  ],
};
