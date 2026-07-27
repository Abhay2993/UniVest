import {
  answerFromEvidence,
  buildCorpus,
  kindLabel,
  suggestedQuestions,
} from '../copilot';
import { STARTUPS } from '../../data/mock';

const helion = STARTUPS.find((s) => s.id === 's1')!;

describe('diligence copilot — unified evidence corpus', () => {
  it('assembles evidence from every source, not just the data room', () => {
    const corpus = buildCorpus(helion);
    const kinds = new Set(corpus.map((c) => c.kind));
    // Helion has a data room, signed attestations, replication, FTO, talent, and a graph node.
    expect(kinds.has('document')).toBe(true);
    expect(kinds.has('attestation')).toBe(true);
    expect(kinds.has('replication')).toBe(true);
    expect(kinds.has('fto')).toBe(true);
    expect(kinds.has('talent')).toBe(true);
    expect(kinds.has('graph')).toBe(true);
    // Strictly richer than the data room alone.
    expect(corpus.length).toBeGreaterThan(helion.dataRoom.length);
  });
});

describe('diligence copilot — grounded answers', () => {
  it('grounds a patent question on the license/FTO evidence', () => {
    const a = answerFromEvidence(helion, 'What is the patent and license situation?');
    expect(a.grounded).toBe(true);
    expect(a.citations.length).toBeGreaterThan(0);
    const kinds = a.citations.map((c) => c.kind);
    expect(kinds.some((k) => k === 'document' || k === 'fto')).toBe(true);
  });

  it('grounds a competition question on the market memo and/or graph', () => {
    const a = answerFromEvidence(helion, 'Who are the competitors?');
    expect(a.grounded).toBe(true);
    expect(a.text.toLowerCase()).toContain('competitor');
  });

  it('surfaces replication/attestation evidence for a verification question', () => {
    const a = answerFromEvidence(helion, 'Has the prototype been independently replicated and attested?');
    expect(a.grounded).toBe(true);
    const kinds = a.citations.map((c) => c.kind);
    expect(kinds.some((k) => k === 'replication' || k === 'attestation')).toBe(true);
  });

  it('declines and routes out-of-scope questions to community diligence', () => {
    const a = answerFromEvidence(helion, 'What is the CEO favourite holiday destination?');
    expect(a.grounded).toBe(false);
    expect(a.citations).toHaveLength(0);
    expect(a.text.toLowerCase()).toContain('community diligence');
  });

  it('prefixes the synthesis with a source-appropriate lead', () => {
    const a = answerFromEvidence(helion, 'How long is the runway?');
    expect(a.grounded).toBe(true);
    expect(a.text.startsWith('From the data room')).toBe(true);
  });
});

describe('diligence copilot — presentation helpers', () => {
  it('offers deal-aware starter questions when evidence exists', () => {
    const qs = suggestedQuestions(helion);
    expect(qs).toContain('What is the patent situation?');
    // Helion has a replicated study and attested milestones.
    expect(qs).toContain('Has the result been independently replicated?');
    expect(qs).toContain('Which milestones are attested?');
  });

  it('maps every evidence kind to a short chip label', () => {
    expect(kindLabel('document')).toBe('Data room');
    expect(kindLabel('attestation')).toBe('Attestation');
    expect(kindLabel('graph')).toBe('Graph');
  });
});
