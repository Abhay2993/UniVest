#!/usr/bin/env node
/**
 * UniVest web companion — static, SEO-friendly deal pages generated from the
 * app's own data (mobile/src/data/mock.ts; swap for the API at build time in
 * production). Output mounts under the SPA at /deals/, so one Vercel deploy
 * serves both: crawlable pages for acquisition, the app for everything else.
 *
 *   node web/build.mjs --out mobile/dist/deals
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.join(__dirname, '..', 'mobile');

const outFlag = process.argv.indexOf('--out');
if (outFlag === -1 || !process.argv[outFlag + 1]) {
  console.error('usage: node build.mjs --out <dir>');
  process.exit(1);
}
const outDir = path.resolve(process.cwd(), process.argv[outFlag + 1]);

// 1. Compile the app's data modules and load them.
execSync(
  'npx tsc src/types.ts src/data/mock.ts src/data/graph.ts --outDir .web-data --module commonjs --target es2020 --skipLibCheck',
  { cwd: mobileDir, stdio: 'inherit' },
);
const require = createRequire(import.meta.url);
const { STARTUPS, UNIVERSITIES } = require(path.join(mobileDir, '.web-data', 'data', 'mock.js'));
const { GRAPH_NODES, GRAPH_EDGES } = require(path.join(mobileDir, '.web-data', 'data', 'graph.js'));

// Every crawlable URL we emit, collected for sitemap.xml.
const SITE = process.env.SITE_ORIGIN || 'https://univest.co';
const urls = [];
const track = (p) => {
  urls.push(p);
  return p;
};

// 2. Rendering helpers.
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const money = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${Math.round(n / 1_000)}K`;
const pct = (r) => `${(r * 100).toFixed(1)}%`;

const CSS = `
:root{--navy:#0A192F;--gold:#D4AF37;--bronze:#C5A059;--bg:#F9F9FB;--ink:#0A192F;--muted:#5B6B7E;--faint:#8B97A6;--hair:#E3E7EC;--emerald:#1B7A55}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:15px/1.6 -apple-system,'Segoe UI',Roboto,sans-serif}
.serif{font-family:'Playfair Display',Georgia,serif}
header{background:var(--navy);color:#F5F7FA;padding:56px 24px 40px}
.wrap{max-width:760px;margin:0 auto;padding:0 4px}
.brand{color:var(--gold);font-size:11px;letter-spacing:4px;margin-bottom:20px}
.brand a{color:var(--gold);text-decoration:none}
h1{font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:500;line-height:1.2}
.sub{color:rgba(245,247,250,.64);font-size:14px;margin-top:8px}
.chip{display:inline-block;border:1px solid var(--gold);color:var(--bronze);font-size:10px;letter-spacing:1.2px;padding:2px 8px;border-radius:4px;margin-top:14px}
main{max-width:760px;margin:24px auto 64px;padding:0 24px}
.card{background:#fff;border:1px solid var(--hair);border-radius:6px;padding:24px;margin-bottom:16px}
.overline{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
.stats{display:flex;gap:24px;flex-wrap:wrap}
.stat b{display:block;font-size:18px}
.stat span{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--faint)}
.bar{height:4px;background:#ECEFF1;border-radius:2px;overflow:hidden;margin:14px 0 6px}
.bar i{display:block;height:100%;background:var(--emerald)}
h2{font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:500;margin-bottom:8px}
p.body{color:var(--muted);font-size:14px}
.m{border-top:1px solid var(--hair);padding:12px 0}
.m b{font-size:14px}
.m small{color:var(--faint);float:right}
.m .att{display:inline-block;border:1px solid var(--gold);background:#FBF7EC;color:var(--bronze);font-size:10px;padding:2px 8px;border-radius:4px;margin-top:6px}
.status{font-size:11px;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:13px}
td,th{text-align:left;padding:10px 8px;border-top:1px solid var(--hair)}
th{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--faint);border:none}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.rank{font-family:'Playfair Display',Georgia,serif;color:var(--bronze)}
.gold{color:var(--bronze);font-weight:600}
.cta{display:block;text-align:center;background:var(--gold);color:var(--navy);font-weight:700;text-decoration:none;padding:14px;border-radius:4px;margin-top:8px}
.deal{display:block;text-decoration:none;color:inherit}
.deal:hover h2{color:var(--bronze)}
footer{max-width:760px;margin:0 auto 48px;padding:0 24px;color:var(--faint);font-size:11px}
`;

const page = (title, description, canonicalPath, body, jsonLd) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="UniVest">
<link rel="canonical" href="${esc(SITE + canonicalPath)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap" rel="stylesheet">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<style>${CSS}</style>
</head>
<body>${body}</body>
</html>`;

// ---------------------------------------------------------------------------
// The public knowledge graph — "Crunchbase-for-university-science". Resolve the
// graph's founders / topics / patents / papers for each spinout so the static
// directory can cross-link spinouts that share a topic (the SEO discovery play:
// "who else is working on rare-earth-free HTS magnets?").
// ---------------------------------------------------------------------------
const nodeById = new Map(GRAPH_NODES.map((n) => [n.id, n]));
const startupNodeByStartupId = new Map(
  GRAPH_NODES.filter((n) => n.kind === 'startup' && n.startupId).map((n) => [n.startupId, n]),
);

/** Founders/topics/patents/papers/competitors linked to a startup graph node. */
function graphFacetsForStartup(startupId) {
  const node = startupNodeByStartupId.get(startupId);
  const facets = { founders: [], topics: [], patents: [], papers: [] };
  if (!node) return facets;
  // Direct neighbours of the startup node.
  const direct = GRAPH_EDGES.flatMap((e) => {
    if (e.from === node.id) return [nodeById.get(e.to)];
    if (e.to === node.id) return [nodeById.get(e.from)];
    return [];
  }).filter(Boolean);
  for (const n of direct) {
    if (n.kind === 'founder') facets.founders.push(n);
    if (n.kind === 'topic') facets.topics.push(n);
    if (n.kind === 'patent') facets.patents.push(n);
  }
  // Papers hang off founders, not the startup, so hop one more edge.
  for (const f of facets.founders) {
    for (const e of GRAPH_EDGES) {
      if (e.kind !== 'published') continue;
      const other = e.from === f.id ? nodeById.get(e.to) : e.to === f.id ? nodeById.get(e.from) : null;
      if (other && other.kind === 'paper') facets.papers.push(other);
    }
  }
  return facets;
}

/** Startups that "work on" a given topic node id. */
function startupsForTopic(topicId) {
  const ids = new Set();
  for (const e of GRAPH_EDGES) {
    if (e.kind !== 'works on') continue;
    if (e.to === topicId) ids.add(e.from);
    else if (e.from === topicId) ids.add(e.to);
  }
  return STARTUPS.filter((s) => {
    const node = startupNodeByStartupId.get(s.id);
    return node && ids.has(node.id);
  });
}

/** Competing labs that "compete on" a given topic node id. */
function competitorsForTopic(topicId) {
  const labs = [];
  for (const e of GRAPH_EDGES) {
    if (e.kind !== 'competes on') continue;
    const other = e.to === topicId ? nodeById.get(e.from) : e.from === topicId ? nodeById.get(e.to) : null;
    if (other && other.kind === 'lab') labs.push(other);
  }
  return labs;
}

const TOPIC_NODES = GRAPH_NODES.filter((n) => n.kind === 'topic');
const FOUNDER_NODES = GRAPH_NODES.filter((n) => n.kind === 'founder');
/** Startup for a founder node (via the "founded by" edge). */
function startupForFounder(founderId) {
  for (const e of GRAPH_EDGES) {
    if (e.kind !== 'founded by') continue;
    const stNode = e.to === founderId ? nodeById.get(e.from) : e.from === founderId ? nodeById.get(e.to) : null;
    if (stNode && stNode.startupId) return STARTUPS.find((s) => s.id === stNode.startupId);
  }
  return null;
}

// 3. Deal pages.
fs.mkdirSync(path.join(outDir), { recursive: true });

for (const st of STARTUPS) {
  const slug = slugify(st.name);
  const progress = st.raisedAmount / st.targetAmount;
  const attested = st.milestones.filter((m) => m.attestation).length;
  const facets = graphFacetsForStartup(st.id);
  const description = `${st.tagline} ${st.vertical} spinout from ${st.university.name} — ${money(st.raisedAmount)} of ${money(st.targetAmount)} raised (${pct(progress)}), ${attested} independently attested milestones. Invest from $${st.minInvestment} on UniVest.`;

  const milestones = st.milestones
    .map(
      (m) => `<div class="m">
  <small>${esc(m.date)}</small>
  <b>${esc(m.title)}</b>
  <div class="status">${m.status === 'completed' ? (m.attestation ? 'Completed · Attested ✦' : 'Completed') : m.status === 'in_progress' ? 'In progress' : 'Projected'}</div>
  <p class="body">${esc(m.description)}</p>
  ${m.attestation ? `<span class="att">✦ ${m.attestation.role === 'tto' ? 'TTO ATTESTATION' : 'INDEPENDENT REVIEW'} — ${esc(m.attestation.verifierName)}, ${esc(m.attestation.verifierOrg)} · Ed25519 ${esc(m.attestation.keyFingerprint)}</span>` : ''}
</div>`,
    )
    .join('');

  const body = `
<header><div class="wrap">
  <div class="brand"><a href="/deals/">UNIVEST</a></div>
  <div class="sub">${esc(st.vertical.toUpperCase())}</div>
  <h1>${esc(st.name)}</h1>
  <div class="sub">${esc(st.university.name)} · ${esc(st.university.country)}</div>
  ${st.verified ? '<span class="chip">✦ TTO VERIFIED</span>' : ''}
</div></header>
<main>
  <div class="card">
    <div class="overline">Offering</div>
    <div class="stats">
      <div class="stat"><b>${money(st.raisedAmount)}</b><span>Raised of ${money(st.targetAmount)}</span></div>
      <div class="stat"><b>${st.investorCount.toLocaleString('en-US')}</b><span>Investors</span></div>
      <div class="stat"><b>$${st.minInvestment}</b><span>Min. ticket</span></div>
      <div class="stat"><b>${st.daysLeft}d</b><span>Closes in</span></div>
    </div>
    <div class="bar"><i style="width:${Math.min(progress * 100, 100).toFixed(1)}%"></i></div>
    <p class="body">${pct(progress)} subscribed · anchored by ${esc(st.leadInvestor)}</p>
    <a class="cta" href="/">Invest from $${st.minInvestment} — open UniVest</a>
  </div>
  <div class="card"><div class="overline">Plain English</div><p class="body">${esc(st.pitch.plainEnglish)}</p></div>
  <div class="card"><div class="overline">Commercialization Pathway</div><p class="body">${esc(st.pitch.commercialization)}</p></div>
  <div class="card"><div class="overline">The Lab Proof</div><p class="body">${esc(st.pitch.labProof)}</p></div>
  <div class="card">
    <div class="overline">Lab Progress — ${attested} of ${st.milestones.length} milestones independently attested</div>
    ${milestones}
  </div>
  <div class="card">
    <div class="overline">Knowledge Graph</div>
    <table>
      <tr><th>Relation</th><th>Entity</th></tr>
      <tr><td>Spun out of</td><td><a href="/deals/directory.html#${slugify(st.university.shortName)}">${esc(st.university.name)}</a></td></tr>
      ${facets.founders.map((f) => `<tr><td>Founded by</td><td><a href="/deals/people/${slugify(f.label)}.html">${esc(f.label)}</a></td></tr>`).join('')}
      ${facets.topics.map((t) => `<tr><td>Works on</td><td><a href="/deals/topics/${slugify(t.label)}.html">${esc(t.label)}</a></td></tr>`).join('')}
      ${facets.patents.map((p) => `<tr><td>Protected by</td><td>${esc(p.label)}</td></tr>`).join('')}
      ${facets.papers.map((p) => `<tr><td>Published</td><td>${esc(p.label)}</td></tr>`).join('')}
    </table>
    <p class="body" style="margin-top:12px">The authoritative public record for this spinout — lineage, people, and IP, cross-linked to every other company in the category.</p>
  </div>
</main>
<footer>Securities offered via UniVest SPVs. Investing in early-stage companies involves risk, including total loss. Not investment advice.</footer>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: st.name,
    description: st.tagline,
    url: `${SITE}/deals/${slug}.html`,
    industry: st.vertical,
    foundingLocation: st.university.name,
    founder: facets.founders.map((f) => ({ '@type': 'Person', name: f.label })),
    parentOrganization: { '@type': 'CollegeOrUniversity', name: st.university.name },
    knowsAbout: facets.topics.map((t) => t.label),
  };

  fs.writeFileSync(
    path.join(outDir, `${slug}.html`),
    page(
      `${st.name} — ${st.vertical} spinout from ${st.university.shortName} | UniVest`,
      description,
      track(`/deals/${slug}.html`),
      body,
      jsonLd,
    ),
  );
}

// ---------------------------------------------------------------------------
// Founder pages — one crawlable profile per researcher-founder.
// ---------------------------------------------------------------------------
fs.mkdirSync(path.join(outDir, 'people'), { recursive: true });
for (const f of FOUNDER_NODES) {
  const st = startupForFounder(f.id);
  if (!st) continue;
  const fslug = slugify(f.label);
  const facets = graphFacetsForStartup(st.id);
  const description = `${f.label} — founder of ${st.name}, a ${st.vertical} spinout from ${st.university.name}. Research topics: ${facets.topics.map((t) => t.label).join(', ')}.`;
  const body = `
<header><div class="wrap">
  <div class="brand"><a href="/deals/directory.html">UNIVEST DIRECTORY</a></div>
  <div class="sub">FOUNDER</div>
  <h1>${esc(f.label)}</h1>
  <div class="sub">${esc(st.vertical)} · ${esc(st.university.name)}</div>
</div></header>
<main>
  <div class="card">
    <div class="overline">Building</div>
    <a class="deal" href="/deals/${slugify(st.name)}.html"><h2>${esc(st.name)}</h2></a>
    <p class="body">${esc(st.tagline)}</p>
  </div>
  <div class="card">
    <div class="overline">Research Topics</div>
    ${facets.topics.map((t) => `<a class="deal m" href="/deals/topics/${slugify(t.label)}.html"><b>${esc(t.label)}</b></a>`).join('') || '<p class="body">—</p>'}
  </div>
  ${facets.papers.length ? `<div class="card"><div class="overline">Publications</div>${facets.papers.map((p) => `<div class="m"><b>${esc(p.label)}</b></div>`).join('')}</div>` : ''}
  <a class="cta" href="/deals/directory.html">Browse the full directory</a>
</main>
<footer>A public directory of deep-tech university spinouts. Profiles are compiled from disclosed offering data.</footer>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: f.label,
    worksFor: { '@type': 'Organization', name: st.name },
    knowsAbout: facets.topics.map((t) => t.label),
  };
  fs.writeFileSync(
    path.join(outDir, 'people', `${fslug}.html`),
    page(`${f.label} — founder of ${st.name} | UniVest Directory`, description, track(`/deals/people/${fslug}.html`), body, jsonLd),
  );
}

// ---------------------------------------------------------------------------
// Topic pages — the "who else works on X" discovery + SEO surface.
// ---------------------------------------------------------------------------
fs.mkdirSync(path.join(outDir, 'topics'), { recursive: true });
for (const t of TOPIC_NODES) {
  const tslug = slugify(t.label);
  const companies = startupsForTopic(t.id);
  if (companies.length === 0) continue;
  const competitors = competitorsForTopic(t.id);
  const description = `Deep-tech spinouts working on ${t.label}: ${companies.map((c) => c.name).join(', ')}. The public map of who is building what in university science.`;
  const body = `
<header><div class="wrap">
  <div class="brand"><a href="/deals/directory.html">UNIVEST DIRECTORY</a></div>
  <div class="sub">RESEARCH TOPIC</div>
  <h1>${esc(t.label)}</h1>
  <div class="sub">${companies.length} spinout${companies.length > 1 ? 's' : ''} · ${competitors.length} tracked competing lab${competitors.length === 1 ? '' : 's'}</div>
</div></header>
<main>
  <div class="card">
    <div class="overline">Spinouts working on this</div>
    ${companies
      .map(
        (c) => `<a class="deal m" href="/deals/${slugify(c.name)}.html">
        <small>${money(c.raisedAmount)}</small>
        <h2>${esc(c.name)}</h2>
        <div class="status">${esc(c.vertical)} · ${esc(c.university.shortName)}</div>
      </a>`,
      )
      .join('')}
  </div>
  ${
    competitors.length
      ? `<div class="card"><div class="overline">Also active in this space</div>${competitors.map((l) => `<div class="m"><b>${esc(l.label)}</b><div class="status">Competing lab · tracked for freedom-to-operate</div></div>`).join('')}</div>`
      : ''
  }
  <a class="cta" href="/deals/directory.html">Browse the full directory</a>
</main>
<footer>A public directory of deep-tech university spinouts. Competing labs are tracked for freedom-to-operate signals.</footer>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t.label,
    about: t.label,
    hasPart: companies.map((c) => ({ '@type': 'Organization', name: c.name })),
  };
  fs.writeFileSync(
    path.join(outDir, 'topics', `${tslug}.html`),
    page(`${t.label} — spinouts & labs | UniVest Directory`, description, track(`/deals/topics/${tslug}.html`), body, jsonLd),
  );
}

// 4. Directory + leaderboard index.
const leaderboard = UNIVERSITIES.map((u) => {
  const spinouts = STARTUPS.filter((s) => s.university.id === u.id);
  const milestones = spinouts.flatMap((s) => s.milestones);
  const completed = milestones.filter((m) => m.status === 'completed').length;
  const attested = milestones.filter((m) => m.attestation).length;
  return {
    name: u.shortName,
    country: u.country,
    deals: spinouts.length,
    raised: spinouts.reduce((sum, s) => sum + s.raisedAmount, 0),
    rate: completed === 0 ? 0 : attested / completed,
  };
}).sort((a, b) => b.raised - a.raised);

const indexBody = `
<header><div class="wrap">
  <div class="brand">UNIVEST</div>
  <h1>Deep-tech spinouts,<br>open for investment.</h1>
  <div class="sub">Equity in university research companies — verified milestones, one clean SPV, from $100.</div>
</div></header>
<main>
  <div class="card">
    <div class="overline">Open Offerings</div>
    ${STARTUPS.map(
      (st) => `<a class="deal m" href="/deals/${slugify(st.name)}.html">
        <small>${money(st.raisedAmount)} · ${pct(st.raisedAmount / st.targetAmount)}</small>
        <h2>${esc(st.name)}</h2>
        <div class="status">${esc(st.vertical)} · ${esc(st.university.shortName)} · closes in ${st.daysLeft}d</div>
      </a>`,
    ).join('')}
  </div>
  <div class="card">
    <div class="overline">University Leaderboard</div>
    <table>
      <tr><th>#</th><th>University</th><th class="num">Deals</th><th class="num">Raised</th><th class="num">Attested</th></tr>
      ${leaderboard
        .map(
          (row, i) =>
            `<tr><td class="rank">${i + 1}</td><td>${esc(row.name)} · ${esc(row.country)}</td><td class="num">${row.deals}</td><td class="num gold">${money(row.raised)}</td><td class="num">${Math.round(row.rate * 100)}%</td></tr>`,
        )
        .join('')}
    </table>
  </div>
  <a class="cta" href="/deals/directory.html">Explore the deep-tech spinout directory →</a>
  <a class="cta" href="/">Open the UniVest app</a>
</main>
<footer>Securities offered via UniVest SPVs. Investing in early-stage companies involves risk, including total loss. Not investment advice.</footer>`;

fs.writeFileSync(
  path.join(outDir, 'index.html'),
  page(
    'UniVest — invest in deep-tech university spinouts',
    'Browse open offerings from MIT, ETH Zürich, Oxford and more. Verified milestones, standardized terms, investing from $100.',
    track('/deals/'),
    indexBody,
  ),
);

// ---------------------------------------------------------------------------
// 5. The directory — "Crunchbase-for-university-science". The authoritative
// public database of the category: every spinout with its university, founders,
// and research topics, plus topic and university facets. Owns top-of-funnel/SEO.
// ---------------------------------------------------------------------------
const directoryRows = STARTUPS.map((st) => {
  const facets = graphFacetsForStartup(st.id);
  return `<tr id="${slugify(st.university.shortName)}">
    <td><a href="/deals/${slugify(st.name)}.html">${esc(st.name)}</a><div class="status">${esc(st.tagline)}</div></td>
    <td>${esc(st.vertical)}</td>
    <td>${esc(st.university.shortName)}</td>
    <td>${facets.founders.map((f) => `<a href="/deals/people/${slugify(f.label)}.html">${esc(f.label)}</a>`).join(', ') || '—'}</td>
    <td>${facets.topics.map((t) => `<a href="/deals/topics/${slugify(t.label)}.html">${esc(t.label)}</a>`).join(', ') || '—'}</td>
  </tr>`;
}).join('');

const directoryBody = `
<header><div class="wrap">
  <div class="brand">UNIVEST DIRECTORY</div>
  <h1>The deep-tech<br>spinout directory.</h1>
  <div class="sub">The public database of university science companies — ${STARTUPS.length} spinouts across ${UNIVERSITIES.length} universities and ${TOPIC_NODES.length} research topics, cross-linked by founder, topic, and IP.</div>
</div></header>
<main>
  <div class="card">
    <div class="overline">Browse by research topic</div>
    ${TOPIC_NODES.filter((t) => startupsForTopic(t.id).length)
      .map((t) => `<a class="chip" style="text-decoration:none;margin:4px 6px 4px 0" href="/deals/topics/${slugify(t.label)}.html">${esc(t.label)}</a>`)
      .join('')}
  </div>
  <div class="card">
    <div class="overline">All spinouts</div>
    <table>
      <tr><th>Company</th><th>Vertical</th><th>University</th><th>Founders</th><th>Topics</th></tr>
      ${directoryRows}
    </table>
  </div>
  <a class="cta" href="/">Open the UniVest app</a>
</main>
<footer>A public directory of deep-tech university spinouts. Profiles are compiled from disclosed offering data; competing labs are fictional demo entities. Not investment advice.</footer>`;

const directoryJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'UniVest Deep-Tech Spinout Directory',
  description: 'A public directory of deep-tech university spinouts, cross-linked by founder, research topic, and intellectual property.',
  url: `${SITE}/deals/directory.html`,
  creator: { '@type': 'Organization', name: 'UniVest' },
  hasPart: STARTUPS.map((st) => ({ '@type': 'Organization', name: st.name, url: `${SITE}/deals/${slugify(st.name)}.html` })),
};

fs.writeFileSync(
  path.join(outDir, 'directory.html'),
  page(
    'Deep-tech spinout directory — Crunchbase for university science | UniVest',
    'The authoritative public directory of deep-tech university spinouts: browse by company, university, founder, or research topic. Compiled from disclosed offering data.',
    track('/deals/directory.html'),
    directoryBody,
    directoryJsonLd,
  ),
);

// ---------------------------------------------------------------------------
// 6. sitemap.xml + robots.txt — make the directory crawlable.
// ---------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(SITE + u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(
  path.join(outDir, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE}/deals/sitemap.xml\n`,
);

console.log(
  `Web companion: ${STARTUPS.length} deal pages, ${FOUNDER_NODES.length} founder pages, ` +
    `${TOPIC_NODES.filter((t) => startupsForTopic(t.id).length).length} topic pages, directory, ` +
    `sitemap (${urls.length} urls) + robots → ${outDir}`,
);
