/**
 * Standalone verification of the copilot's grounded-retrieval layer (no Nest/DB).
 * Run against the compiled output after `npm run build`:
 *   node test/copilot-retrieval.spec.mjs
 * Exits non-zero on any failed assertion — CI gate for the RAG ranking contract.
 */
import assert from 'node:assert/strict';
import {
  rankEvidence,
  selectEvidence,
  tokenize,
  toCitation,
} from '../dist/copilot/retrieval.js';

let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const corpus = [
  {
    kind: 'document',
    ref: 'Exclusive License Agreement',
    section: '§2.1 Field of Use',
    text: 'MIT grants an exclusive license to the 11-patent HTS coil family; the university holds 12% equity.',
    keywords: ['patent', 'patents', 'license', 'ip', 'university'],
  },
  {
    kind: 'document',
    ref: 'Market & Competition Memo',
    section: '§3 Competitive Landscape',
    text: 'Direct competitors depend on rare-earth REBCO tape; no competitor exceeds 15T without rare-earth.',
    keywords: ['competitor', 'competitors', 'competition', 'market'],
  },
  {
    kind: 'attestation',
    ref: 'Attestation · MIT TLO',
    section: 'Prototype Validation',
    text: 'Milestone is attested by K. Brennan, TTO at MIT, under registered Ed25519 key 8F3A-22C1.',
    keywords: ['attestation', 'verified', 'signed', 'milestone'],
  },
  {
    kind: 'replication',
    ref: 'Replication · National High-Field Magnet Facility',
    section: 'Prototype Validation',
    text: 'Independently replicated: reproduced 20.7T sustained for 46h.',
    keywords: ['replication', 'replicated', 'independent', 'reproduce'],
  },
];

// 1. tokenize drops stop words and short tokens.
assert.deepEqual(tokenize('What is the runway?'), ['runway']);
ok('tokenize strips stop words and punctuation');

// 2. A patent question ranks the license doc first.
const patentRanked = rankEvidence(corpus, 'What is the patent and license situation?');
assert.equal(patentRanked[0].chunk.ref, 'Exclusive License Agreement');
assert.ok(patentRanked[0].score >= 3);
ok('patent question retrieves the license agreement');

// 3. A competition question ranks the competition memo first.
const compRanked = rankEvidence(corpus, 'Who are the competitors?');
assert.equal(compRanked[0].chunk.ref, 'Market & Competition Memo');
ok('competition question retrieves the competition memo');

// 4. An attestation question surfaces the signed-attestation chunk.
const attRanked = rankEvidence(corpus, 'Is the milestone independently verified?');
const attTop = selectEvidence(attRanked);
assert.ok(attTop.some((r) => r.chunk.kind === 'attestation' || r.chunk.kind === 'replication'));
ok('verification question grounds on attestation/replication evidence');

// 5. Out-of-scope questions select no evidence (the decline signal).
const offRanked = rankEvidence(corpus, 'What is the founder favourite colour?');
assert.equal(selectEvidence(offRanked).length, 0);
ok('out-of-scope question selects no evidence (declines)');

// 6. Citations carry kind, ref, section, and the quoted text.
const cite = toCitation(corpus[0]);
assert.equal(cite.kind, 'document');
assert.equal(cite.ref, 'Exclusive License Agreement');
assert.ok(cite.quote.includes('exclusive license'));
ok('toCitation preserves kind, ref, section, and quote');

console.log(`\n${passed} copilot-retrieval assertions passed.`);
