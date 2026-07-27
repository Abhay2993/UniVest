/**
 * Diligence Copilot — grounded Q&A over a deal's full evidence bundle.
 *
 * Retrieval runs over a unified corpus assembled from the data room, the signed
 * milestone attestations, independent replication studies, the freedom-to-
 * operate landscape, talent flow, and the knowledge graph — not the data room
 * alone. Every answer cites its sources by kind; questions the evidence cannot
 * ground are declined and routed to Community Diligence rather than speculated
 * on. This mirrors the backend `POST /copilot/ask` contract (retrieval + the
 * grounded-synthesis fallback); production swaps the synthesis step for the
 * Claude API and persists each exchange to `copilot_exchanges` for audit.
 */
import { Startup } from '../types';
import { FTO_PATENTS, REPLICATION_STUDIES, TALENT_MOVES } from '../data/diligence';
import { ftoAssessment } from '../utils/diligence';
import { GRAPH_EDGES, GRAPH_NODES, neighborsOf } from '../data/graph';

export type EvidenceKind =
  | 'document'
  | 'attestation'
  | 'replication'
  | 'fto'
  | 'talent'
  | 'graph';

export interface CopilotCitation {
  kind: EvidenceKind;
  /** Human-readable source label (document title, attestor, lab, …). */
  ref: string;
  section: string;
}

export interface EvidenceChunk extends CopilotCitation {
  text: string;
  keywords: string[];
}

export interface CopilotAnswer {
  text: string;
  citations: CopilotCitation[];
  grounded: boolean;
}

const KIND_LEAD: Record<EvidenceKind, string> = {
  document: 'From the data room',
  attestation: 'Per the signed milestone attestation',
  replication: 'From the independent replication record',
  fto: 'From the freedom-to-operate landscape',
  talent: 'From the talent-flow record',
  graph: 'From the knowledge graph',
};

const KIND_LABEL: Record<EvidenceKind, string> = {
  document: 'Data room',
  attestation: 'Attestation',
  replication: 'Replication',
  fto: 'FTO',
  talent: 'Talent',
  graph: 'Graph',
};

export function kindLabel(kind: EvidenceKind): string {
  return KIND_LABEL[kind];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'whats', 'who', 'how',
  'does', 'do', 'did', 'will', 'would', 'can', 'could', 'this', 'that', 'its',
  'it', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'with', 'about', 'their',
  'there', 'your', 'you', 'they', 'long', 'much', 'many', 'any', 'has', 'have',
]);

function tokenize(text: string): string[] {
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
    if (keys.some((k) => k === token || token.startsWith(k) || k.startsWith(token))) score += 3;
    if (bodyTokens.has(token)) score += 1;
  }
  return score;
}

/** The startup's graph relationships as a single evidence chunk. */
function graphChunk(startup: Startup): EvidenceChunk | null {
  const node = GRAPH_NODES.find((n) => n.kind === 'startup' && n.startupId === startup.id);
  if (!node) return null;
  const neighbors = neighborsOf(node.id);
  const topicIds = neighbors.filter((n) => n.edge === 'works on').map((n) => n.node.id);
  const topics = neighbors.filter((n) => n.edge === 'works on').map((n) => n.node.label);

  const competitors = new Set<string>();
  for (const e of GRAPH_EDGES) {
    if (e.kind === 'competes on' && topicIds.includes(e.to)) {
      const lab = GRAPH_NODES.find((n) => n.id === e.from);
      if (lab) competitors.add(lab.label);
    }
  }
  const compText = competitors.size
    ? ` Competing labs on shared topics: ${[...competitors].join(', ')}.`
    : ' No competing lab shares its topics in the graph.';
  const topicText = topics.length ? ` Works on ${topics.join(', ')}.` : '';

  return {
    kind: 'graph',
    ref: 'Knowledge Graph',
    section: `${startup.name} → ${startup.university.shortName}`,
    text:
      `${startup.name} is a ${startup.vertical} spinout of ${startup.university.name} ` +
      `(${startup.university.country}).${topicText}${compText}`,
    keywords: ['university', 'spinout', 'competitor', 'competitors', 'graph', 'relationship', 'lab'],
  };
}

/** Assemble the full grounding corpus for a deal from every evidence source. */
export function buildCorpus(startup: Startup): EvidenceChunk[] {
  const corpus: EvidenceChunk[] = [];

  // 1. Data room
  for (const d of startup.dataRoom) {
    corpus.push({
      kind: 'document',
      ref: d.docTitle,
      section: d.section,
      text: d.text,
      keywords: d.keywords,
    });
  }

  // 2. Signed milestone attestations
  for (const m of startup.milestones) {
    if (!m.attestation) continue;
    const a = m.attestation;
    corpus.push({
      kind: 'attestation',
      ref: `Attestation · ${a.verifierOrg}`,
      section: m.title,
      text:
        `Milestone "${m.title}" (${m.description}) is attested by ${a.verifierName}, ` +
        `${a.role === 'tto' ? 'TTO' : 'independent reviewer'} at ${a.verifierOrg}, under registered ` +
        `Ed25519 key ${a.keyFingerprint}. The signature verifies against the evidence bundle.`,
      keywords: ['attestation', 'attested', 'verified', 'signed', 'milestone', 'proof', 'independent'],
    });
  }

  // 3. Independent replication studies
  for (const r of REPLICATION_STUDIES[startup.id] ?? []) {
    const done = r.status === 'replicated';
    corpus.push({
      kind: 'replication',
      ref: `Replication · ${r.labName}`,
      section: r.milestoneTitle,
      text: done
        ? `Independently replicated at ${r.labName}: ${r.result ?? 'result confirmed.'}`
        : `A replication of "${r.milestoneTitle}" at ${r.labName} is ${r.status.replace('_', ' ')}.`,
      keywords: ['replication', 'replicated', 'independent', 'reproduce', 'verified', 'milestone'],
    });
  }

  // 4. Freedom-to-operate landscape + clearance score
  const patents = FTO_PATENTS[startup.id] ?? [];
  if (patents.length) {
    const fto = ftoAssessment(patents);
    const list = patents
      .map((p) => `${p.title} (${p.assignee}, ${p.relation}, ${p.jurisdiction})`)
      .join('; ');
    corpus.push({
      kind: 'fto',
      ref: 'Freedom-to-Operate Landscape',
      section: `Clearance ${fto.clearanceScore}/100 · ${fto.band}`,
      text:
        `FTO landscape: ${fto.owned} owned/licensed, ${fto.blocking} blocking, ${fto.adjacent} adjacent. ` +
        `Clearance score ${fto.clearanceScore}/100 (${fto.band}). Patents: ${list}.`,
      keywords: ['patent', 'patents', 'fto', 'freedom', 'operate', 'ip', 'blocking', 'clearance', 'license'],
    });
  }

  // 5. Talent flow
  for (const t of TALENT_MOVES[startup.id] ?? []) {
    corpus.push({
      kind: 'talent',
      ref: `Talent · ${t.name}`,
      section: t.role,
      text: `${t.name} joined as ${t.role} from ${t.fromOrg} (${t.pedigree} pedigree).`,
      keywords: ['talent', 'team', 'hire', 'hires', 'people', 'engineer', 'poached', 'joined'],
    });
  }

  // 6. Knowledge graph
  const g = graphChunk(startup);
  if (g) corpus.push(g);

  return corpus;
}

/**
 * Answer a question grounded in the deal's evidence bundle. Returns a cited
 * synthesis, or a decline when nothing in the corpus is relevant.
 */
export function answerFromEvidence(startup: Startup, question: string): CopilotAnswer {
  const corpus = buildCorpus(startup);
  const tokens = tokenize(question);
  const ranked = corpus
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, tokens) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 3) {
    return {
      text:
        "The data room and diligence signals don't cover that yet. Try asking about the patent " +
        'estate, the competitive landscape, runway, independent replication, or the milestone ' +
        'attestations — or put the question to the team in Community Diligence below, where it ' +
        'becomes part of the offering record.',
      citations: [],
      grounded: false,
    };
  }

  const selected = ranked
    .filter((r) => r.score >= Math.max(3, top.score * 0.55))
    .slice(0, 3);

  const lead = KIND_LEAD[selected[0].chunk.kind];
  return {
    text: `${lead}: ${selected.map((r) => r.chunk.text).join('\n\n')}`,
    citations: selected.map((r) => ({
      kind: r.chunk.kind,
      ref: r.chunk.ref,
      section: r.chunk.section,
    })),
    grounded: true,
  };
}

/** Back-compat alias for the previous data-room-only entry point. */
export const answerFromDataRoom = answerFromEvidence;

/** Deal-aware starter questions, tuned to the strongest evidence the deal has. */
export function suggestedQuestions(startup: Startup): string[] {
  const qs = ['What is the patent situation?', 'Who are the competitors?', 'How long is the runway?'];
  if ((REPLICATION_STUDIES[startup.id] ?? []).some((r) => r.status === 'replicated')) {
    qs.push('Has the result been independently replicated?');
  }
  if (startup.milestones.some((m) => m.attestation)) {
    qs.push('Which milestones are attested?');
  }
  return qs;
}

export const SUGGESTED_QUESTIONS = [
  'What is the patent situation?',
  'Who are the competitors?',
  'How long is the runway?',
] as const;
