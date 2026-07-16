/**
 * UniVest Academy — the investor-education layer Reg CF expects.
 * Completing modules progressively unlocks the investor's full annual limit:
 * everyone starts at 60% of their statutory limit, and each module releases
 * another 10% (4 modules → 100%). Compliance that pays the learner.
 */
export interface AcademyModule {
  id: string;
  title: string;
  minutes: number;
  lessons: string[];
  check: {
    prompt: string;
    options: string[];
    correctIndex: number;
  };
}

export const BASE_UNLOCK = 0.6;
export const UNLOCK_PER_MODULE = 0.1;

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: 'spv',
    title: 'How SPVs Work',
    minutes: 3,
    lessons: [
      'When you invest through UniVest you don\'t appear on the startup\'s cap table. Your capital pools with every other investor into a Special Purpose Vehicle — a nominee entity that holds the shares and appears as a single clean line.',
      'You own units of the SPV, in proportion to your investment. Economics flow through: if the startup exits at 3x, your units are worth 3x their cost (before carry). The startup, meanwhile, negotiates its Series A without three thousand names on its register.',
      'The SPV is also what makes the secondary market possible: units can transfer between verified investors inside the vehicle without touching the startup\'s cap table at all.',
    ],
    check: {
      prompt: 'Who appears on the startup\'s cap table after a UniVest raise?',
      options: ['Every individual investor', 'A single SPV entity', 'The platform\'s CEO'],
      correctIndex: 1,
    },
  },
  {
    id: 'timelines',
    title: 'Why Deep-Tech Takes a Decade',
    minutes: 4,
    lessons: [
      'A software startup can find product-market fit in 18 months. A fusion-magnet company must validate physics, qualify manufacturing, pass certifications, and win conservative industrial customers — each stage measured in years, not sprints.',
      'This is why milestones matter more than revenue in early deep-tech: "21-tesla coil ran for 48 hours" is the deep-tech equivalent of a growth chart. It\'s also why UniVest requires independent attestation of those milestones.',
      'The corollary: capital committed here should be capital you won\'t need for 7–10 years. Diversification across offerings — not conviction in one — is how portfolios survive the timeline.',
    ],
    check: {
      prompt: 'What is the prudent time horizon for a deep-tech position?',
      options: ['6–12 months', '2–3 years', '7–10 years'],
      correctIndex: 2,
    },
  },
  {
    id: 'attestation',
    title: 'Reading a Milestone Attestation',
    minutes: 3,
    lessons: [
      'A gold ✦ on a milestone means someone with a registered signing key — a university TTO officer or an independent reviewer — examined the evidence bundle and cryptographically signed its hash.',
      'The stamp tells you four things: who signed, in what capacity (TTO vs independent review), when, and with which key. Anyone can verify the signature against the public attestor registry.',
      'A completed milestone without a stamp isn\'t necessarily false — but the difference between "the founder says so" and "Oxford\'s TTO signed it" is exactly the difference the stamp exists to mark.',
    ],
    check: {
      prompt: 'What does the ✦ attestation stamp certify?',
      options: [
        'The startup will succeed',
        'A registered verifier signed the milestone evidence',
        'The platform guarantees the milestone',
      ],
      correctIndex: 1,
    },
  },
  {
    id: 'liquidity',
    title: 'Liquidity: Windows, Not Exits on Demand',
    minutes: 3,
    lessons: [
      'Private units don\'t trade like public stocks. UniVest runs monthly batch auctions: buy and sell orders accumulate during a window, then everything crosses at one uniform clearing price.',
      'One price per window means thin trading can\'t whipsaw the mark — and every clearing price becomes an honest NAV reference for the whole SPV.',
      'But a window needs both sides. If no buyers show up at your price, your units simply don\'t sell that month. Liquidity here is a feature of patience, never a guarantee.',
    ],
    check: {
      prompt: 'What happens if no buyer matches your price in a liquidity window?',
      options: [
        'The platform buys your units',
        'Your units don\'t sell that window',
        'The price drops until someone buys',
      ],
      correctIndex: 1,
    },
  },
];
