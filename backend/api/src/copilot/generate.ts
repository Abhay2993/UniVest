/**
 * Answer generation for the diligence copilot.
 *
 * The contract is identical on both paths: answer ONLY from the supplied
 * evidence and cite it; never speculate beyond the data room and diligence
 * signals. When an Anthropic API key is configured we ground Claude on the
 * retrieved chunks and return its synthesis; otherwise a deterministic
 * grounded-synthesis fallback composes a cited answer from the same chunks, so
 * the endpoint is fully functional (and verifiable) without network egress.
 */
import { EvidenceKind, RankedChunk } from './retrieval';

export const GROUNDED_MODEL = 'grounded-retrieval/v1';
const CLAUDE_MODEL = 'claude-opus-5';

const KIND_LEAD: Record<EvidenceKind, string> = {
  document: 'From the data room',
  attestation: 'Per the signed milestone attestation',
  replication: 'From the independent replication record',
  fto: 'From the freedom-to-operate landscape',
  talent: 'From the talent-flow record',
  graph: 'From the knowledge graph',
};

export interface Generation {
  answer: string;
  model: string;
}

/** Deterministic, fully-grounded synthesis over the selected evidence. */
export function synthesizeGrounded(question: string, evidence: RankedChunk[]): Generation {
  if (evidence.length === 0) {
    return {
      answer:
        "The data room and diligence signals don't cover that yet. Try asking about the " +
        'patent estate, the competitive landscape, runway, independent replication, or the ' +
        'milestone attestations — or put the question to the team in Community Diligence below, ' +
        'where it becomes part of the offering record.',
      model: GROUNDED_MODEL,
    };
  }
  const lead = KIND_LEAD[evidence[0].chunk.kind];
  const body = evidence.map((e) => e.chunk.text).join('\n\n');
  return { answer: `${lead}: ${body}`, model: GROUNDED_MODEL };
}

function evidenceBlock(evidence: RankedChunk[]): string {
  return evidence
    .map(
      (e, i) =>
        `[${i + 1}] (${e.chunk.kind}) ${e.chunk.ref} — ${e.chunk.section}\n${e.chunk.text}`,
    )
    .join('\n\n');
}

/**
 * Try a real, grounded Claude call. Returns null when no key is configured or
 * the call fails for any reason (network, SDK missing, API error) — the caller
 * then falls back to deterministic synthesis. The SDK is imported through an
 * indirect specifier so the build does not require the package to be installed.
 */
export async function generateWithClaude(
  question: string,
  evidence: RankedChunk[],
): Promise<Generation | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || evidence.length === 0) return null;
  try {
    // Indirect specifier keeps tsc from resolving the optional dependency at
    // build time; it is loaded only when a key is actually present at runtime.
    const specifier = '@anthropic-ai/sdk';
    const mod: any = await import(specifier);
    const Anthropic = mod.default ?? mod.Anthropic;
    const client = new Anthropic({ apiKey });
    const system =
      'You are a diligence copilot for a deep-tech investment platform. Answer the ' +
      "investor's question using ONLY the numbered evidence provided. Cite the evidence " +
      'you use inline as [n]. If the evidence does not support an answer, say so plainly ' +
      'and do not speculate. Be concise and specific.';
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system,
      messages: [
        {
          role: 'user',
          content: `Question: ${question}\n\nEvidence:\n${evidenceBlock(evidence)}`,
        },
      ],
    });
    const final = await stream.finalMessage();
    const text = final.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim();
    if (!text) return null;
    return { answer: text, model: final.model ?? CLAUDE_MODEL };
  } catch {
    return null;
  }
}
