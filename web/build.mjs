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

// 1. Compile the app's data module and load it.
execSync(
  'npx tsc src/types.ts src/data/mock.ts --outDir .web-data --module commonjs --target es2020 --skipLibCheck',
  { cwd: mobileDir, stdio: 'inherit' },
);
const require = createRequire(import.meta.url);
const { STARTUPS, UNIVERSITIES } = require(path.join(mobileDir, '.web-data', 'data', 'mock.js'));

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

const page = (title, description, canonicalPath, body) => `<!doctype html>
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
<link rel="canonical" href="${esc(canonicalPath)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>${body}</body>
</html>`;

// 3. Deal pages.
fs.mkdirSync(path.join(outDir), { recursive: true });

for (const st of STARTUPS) {
  const slug = slugify(st.name);
  const progress = st.raisedAmount / st.targetAmount;
  const attested = st.milestones.filter((m) => m.attestation).length;
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
</main>
<footer>Securities offered via UniVest SPVs. Investing in early-stage companies involves risk, including total loss. Not investment advice.</footer>`;

  fs.writeFileSync(
    path.join(outDir, `${slug}.html`),
    page(
      `${st.name} — ${st.vertical} spinout from ${st.university.shortName} | UniVest`,
      description,
      `/deals/${slug}.html`,
      body,
    ),
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
  <a class="cta" href="/">Open the UniVest app</a>
</main>
<footer>Securities offered via UniVest SPVs. Investing in early-stage companies involves risk, including total loss. Not investment advice.</footer>`;

fs.writeFileSync(
  path.join(outDir, 'index.html'),
  page(
    'UniVest — invest in deep-tech university spinouts',
    'Browse open offerings from MIT, ETH Zürich, Oxford and more. Verified milestones, standardized terms, investing from $100.',
    '/deals/',
    indexBody,
  ),
);

console.log(`Web companion: ${STARTUPS.length} deal pages + index → ${outDir}`);
