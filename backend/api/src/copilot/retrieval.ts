/**
 * Grounded retrieval for the diligence copilot — pure, dependency-free so it can
 * be unit-tested in isolation (test/copilot-retrieval.spec.mjs) and shared by the
 * service regardless of whether generation runs on Claude or the deterministic
 * fallback. Lexical ranking over a unified evidence corpus assembled from the
 * data room, milestone attestations, replication studies, the FTO landscape,
 * talent flow, and knowledge-graph relationships.
 */

export type EvidenceKind =
  | 'document'
  | 'attestation'
  | 'replication'
  | 'fto'
  | 'talent'
  | 'graph';

export interface EvidenceChunk {
  kind: EvidenceKind;
  /** Human-readable source label, e.g. a document title or "Independent replication". */
  ref: string;
  /** Sub-locator within the source, e.g. "§2.1 Field of Use" or a milestone title. */
  section: string;
  /** The grounding text answered from and quoted in citations. */
  text: string;
  /** Retrieval index terms that boost this chunk's score. */
  keywords: string[];
}

export interface RankedChunk {
  chunk: EvidenceChunk;
  score: number;
}

export interface Citation {
  kind: EvidenceKind;
  ref: string;
  section: string;
  quote: string;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'whats', 'who', 'how',
  'does', 'do', 'did', 'will', 'would', 'can', 'could', 'this', 'that', 'its',
  'it', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'with', 'about', 'their',
  'there', 'your', 'you', 'they', 'long', 'much', 'many', 'any', 'has', 'have',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function scoreChunk(chunk: EvidenceChunk, tokens: string[]): number {
  let score = 0;
  const bodyTokens = new Set(tokenize(`${chunk.ref} ${chunk.section} ${chunk.text}`));
  const keys = chunk.keywords.map((k) => k.toLowerCase());
  for (const token of tokens) {
    if (keys.some((k) => k === token || token.startsWith(k) || k.startsWith(token))) {
      score += 3;
    }
    if (bodyTokens.has(token)) score += 1;
  }
  return score;
}

/** Rank the whole corpus against a question, highest score first. */
export function rankEvidence(corpus: EvidenceChunk[], question: string): RankedChunk[] {
  const tokens = tokenize(question);
  return corpus
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * The grounded evidence set for an answer: the top-scoring chunks above a
 * relevance floor. Empty when the corpus cannot ground the question — the
 * signal to decline rather than speculate.
 */
export function selectEvidence(ranked: RankedChunk[], max = 3): RankedChunk[] {
  const top = ranked[0];
  if (!top || top.score < 3) return [];
  return ranked.filter((r) => r.score >= Math.max(3, top.score * 0.55)).slice(0, max);
}

export function toCitation(chunk: EvidenceChunk): Citation {
  return { kind: chunk.kind, ref: chunk.ref, section: chunk.section, quote: chunk.text };
}
