/**
 * Diligence Copilot — grounded Q&A over a deal's data room.
 *
 * Demo implementation: lexical retrieval over the indexed snippets with
 * citations. Production swaps `answerFromDataRoom` for the AI Translation
 * Service, which runs retrieval + generation against the Claude API and
 * stores every exchange (with citations) in `copilot_exchanges` for audit.
 * Both paths obey the same contract: answers cite data-room sources or
 * decline — the copilot never speculates beyond the documents.
 */
import { DataRoomSnippet, Startup } from '../types';

export interface CopilotCitation {
  docTitle: string;
  section: string;
}

export interface CopilotAnswer {
  text: string;
  citations: CopilotCitation[];
  grounded: boolean;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'whats', 'who', 'how',
  'does', 'do', 'did', 'will', 'would', 'can', 'could', 'this', 'that', 'its',
  'it', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'with', 'about', 'their',
  'there', 'your', 'you', 'they', 'long', 'much', 'many',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function scoreSnippet(snippet: DataRoomSnippet, tokens: string[]): number {
  let score = 0;
  const bodyTokens = new Set(tokenize(`${snippet.docTitle} ${snippet.section} ${snippet.text}`));
  for (const token of tokens) {
    if (snippet.keywords.some((k) => k === token || token.startsWith(k) || k.startsWith(token))) {
      score += 3;
    }
    if (bodyTokens.has(token)) score += 1;
  }
  return score;
}

export function answerFromDataRoom(startup: Startup, question: string): CopilotAnswer {
  const tokens = tokenize(question);
  const ranked = startup.dataRoom
    .map((snippet) => ({ snippet, score: scoreSnippet(snippet, tokens) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 3) {
    return {
      text:
        `The data room doesn't cover that yet. Try asking about the patent estate, ` +
        `the competitive landscape, or runway — or put the question to the team in ` +
        `Community Diligence below and it becomes part of the offering record.`,
      citations: [],
      grounded: false,
    };
  }

  const selected = ranked
    .filter((r) => r.score >= Math.max(3, top.score * 0.6))
    .slice(0, 2);

  return {
    text: selected.map((r) => r.snippet.text).join('\n\n'),
    citations: selected.map((r) => ({
      docTitle: r.snippet.docTitle,
      section: r.snippet.section,
    })),
    grounded: true,
  };
}

export const SUGGESTED_QUESTIONS = [
  'What is the patent situation?',
  'Who are the competitors?',
  'How long is the runway?',
] as const;
