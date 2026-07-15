/**
 * Investor Suitability Quiz — the comprehension gate Reg CF / ECSPR expect
 * before retail money enters illiquid private offerings. Passing (≥4/5)
 * plus the income/net-worth bands sets the investor's annual limit.
 */
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Index into options. */
  correctIndex: number;
  /** Shown after answering — teaches, never scolds. */
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'risk',
    prompt: 'If a spinout you invested in fails, what happens to your investment?',
    options: [
      'The platform refunds it',
      'I can lose the entire amount',
      'The university covers half',
    ],
    correctIndex: 1,
    explanation:
      'Early-stage deep-tech is high risk: total loss is a realistic outcome, which is why limits and diversification matter.',
  },
  {
    id: 'liquidity',
    prompt: 'How quickly can you typically sell a private spinout position?',
    options: [
      'Instantly, like a stock',
      'Within a day through the app',
      'Only at monthly liquidity windows — sometimes not at all',
    ],
    correctIndex: 2,
    explanation:
      'These are illiquid securities. UniVest runs monthly batch auctions, but a buyer is never guaranteed.',
  },
  {
    id: 'cancel',
    prompt: 'Until when can you cancel a commitment under Reg CF?',
    options: [
      'Any time before the campaign closes',
      'Up to 48 hours before the close',
      'Never — commitments are final',
    ],
    correctIndex: 1,
    explanation:
      'You may cancel until 48 hours before close. Inside that window the commitment becomes binding.',
  },
  {
    id: 'concentration',
    prompt: 'A prudent single-position size relative to your annual limit is…',
    options: [
      'All of it in the best idea',
      'A modest share, spread across several offerings',
      'Exactly half in two deals',
    ],
    correctIndex: 1,
    explanation:
      'Deep-tech timelines run a decade. Spreading commitments across offerings is how portfolios survive them.',
  },
  {
    id: 'spv',
    prompt: 'When you invest through UniVest, who appears on the startup\'s cap table?',
    options: [
      'You, personally',
      'A single SPV that pools all platform investors',
      'The university TTO',
    ],
    correctIndex: 1,
    explanation:
      'Your units are in a nominee SPV — the startup sees one clean line, and your economics flow through it.',
  },
];

export const PASS_SCORE = 4;

/** Representative values per band, fed into the Reg CF limit formula. */
export const INCOME_BANDS = [
  { label: 'Under $50K', value: 40_000 },
  { label: '$50–124K', value: 87_000 },
  { label: '$124–250K', value: 187_000 },
  { label: 'Over $250K', value: 350_000 },
] as const;

export const NET_WORTH_BANDS = [
  { label: 'Under $50K', value: 25_000 },
  { label: '$50–124K', value: 87_000 },
  { label: '$124–500K', value: 300_000 },
  { label: 'Over $500K', value: 750_000 },
] as const;
