# UniVest

![CI](https://github.com/Abhay2993/UniVest/actions/workflows/ci.yml/badge.svg)

**Democratizing equity investment in deep-tech academic spinouts.**

UniVest is a cross-platform mobile platform (iOS & Android) that bridges retail
investors, institutional co-investors, and university Tech Transfer Offices
(TTOs) under a "Coordinated Capital" structure — with automated SPV creation,
standardized university deal templates, and a built-in secondary liquidity
framework.

---

## Repository Layout

| Path | Contents |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture diagrams (component + investment sequence flow) and security model |
| [`backend/db/schema.sql`](backend/db/schema.sql) | PostgreSQL schema — users, startups, campaigns, investments, SPVs, secondary trades, revenue ledger, Row-Level Security policies |
| [`backend/db/seed.sql`](backend/db/seed.sql) | Demo seed: API role + grants, live campaign, SPV with holdings/valuations, open auction window |
| [`backend/api/`](backend/api/) | NestJS API — offerings, investments (with Reg CF limit + cooling-off), portfolio, batch auctions, Q&A, KYC webhook; every query runs under the caller's RLS identity |
| [`mobile/`](mobile/) | React Native (TypeScript, Expo) app — onboarding/KYC/suitability, Discovery + Research Map, Milestone Tracker, Portfolio analytics, Markets, Tools, TTO Portal |

## Core Modules

1. **Coordinated Capital & Global Discovery** — browse active spinouts by
   university or academic vertical; smart auto-invest syndicates behind
   verified leads; automated KYC/AML + investor suitability engine
   (Reg CF / ECSPR limits).
2. **Accessibility & Scientific Translation** — AI Layman Pitch Deck
   (*Plain English / Commercialization Pathway / The Lab Proof*) and the
   Visual Milestone Tracker ("Lab Progress Bar") with founder micro-video
   updates.
3. **Financial & Legal Infrastructure (SPV Shield)** — automated SPV pooling
   keeps the startup cap table clean; peer-to-peer secondary market for
   fractional SPV holdings.
4. **TTO Standardizer** — click-and-agree standardized deal templates
   (USIT / US-BOLT) with pre-cleared university equity caps.

## Revenue Model (encoded in the schema)

| Stream | Default | Where |
| --- | --- | --- |
| Platform success fee | 6% of capital raised, charged to startup at close | `campaigns.success_fee_pct`, `revenue_ledger` |
| Investor SPV setup/admin fee | 1.5% per transaction | `campaigns.admin_fee_pct`, `investments.admin_fee_amount` |
| Carried interest | 15% of investor capital profits at exit | `spvs.carry_pct`, `carry_ledger` |
| University SaaS portal | Monthly tiered subscription | `tto_subscriptions` |

## Mobile App Features

- **Global Discovery Feed** — active spinout offerings filterable by academic
  vertical, university, and watchlist, with animated funding progress.
- **Global Research Map** — interactive world map (`react-native-maps`) with
  university pins sized by active deal volume; tap a pin for the university's
  raising volume and a route into its filtered offerings; follow universities
  for new-deal alerts.
- **Visual Milestone Tracker** — the "Lab Progress Bar": expandable milestone
  timeline with verified/in-progress/projected states and founder video-update
  chips.
- **AI Layman Pitch tabs** — *Plain English / Commercialization / The Lab Proof*.
- **Watchlist + closing-soon alerts** — star any offering to persist it
  (AsyncStorage) and schedule a local "closes in 48h" notification
  (`expo-notifications`); unstarring cancels the alert.
- **Independent milestone attestation** — completed milestones carry a
  verification stamp (attestor name, TTO / independent-reviewer role, signing
  date, Ed25519 key fingerprint) backed by the `attestor_keys` registry and
  `milestone_attestations` table.
- **Community Diligence Q&A** — threaded public questions on every deal with
  FOUNDER / TTO / INVESTOR role badges and an ask-a-question composer
  (`deal_questions` / `deal_answers` with moderation-preserving hides).
- **Reg CF cooling-off flow** — commitments show a live countdown and one-tap
  cancel until 48h before close; the same rule is enforced by a database
  trigger on `investments`.
- **Concentration nudge** — committing ≥40% of the annual suitability limit
  to a single position surfaces a calm diversification note (audit-trailed in
  `suitability_acknowledgements`, exposure computed by the
  `investor_concentration` view).
- **Diligence Copilot** — grounded Q&A over each deal's data room with
  source citations on every answer; ungrounded questions are declined and
  routed to Community Diligence (`data_room_documents`, `copilot_exchanges`).
- **Portfolio analytics** — paid-in vs current value, TVPI, and true XIRR
  from cash-flow dates; quarterly NAV line chart (validated emerald); Tax
  Document Center for Schedule K-1s (`spv_valuations`, `tax_documents`).
- **Batch-auction liquidity windows** — monthly uniform-price auctions
  replace the thin continuous book; the `clear_auction()` SQL function and
  its TypeScript mirror pick the volume-maximizing price (plateau midpoint)
  with price-time priority fills.
- **Auto-Invest DCA** — a monthly budget spread across qualifying deals with
  vertical filters and verified-lead matching (`auto_invest_mandates` with
  `monthly_budget` mode).
- **Cap Table Simulator** — founders preview post-money ownership and
  dilution under standardized template terms, with a validated categorical
  stacked bar.
- **University Leaderboard** — institutions ranked by on-platform capital
  with milestone attestation rates (`university_leaderboard` view).
- **Spinout Directory** — a read-only, factual reference of ~29 notable real
  spinouts from Oxford, MIT, and Harvard (name, sector, public listing status,
  and an accurate description of the actual science). Deliberately carries no
  fundraising, attestation, or invest actions — it is educational reference
  material, kept separate from the app's fictional investable offerings so no
  real company is depicted with fabricated financial data.

### Quant engine (built for deep-tech, not borrowed from equities)

Illiquid, milestone-driven science bets need different quant than public
equities — no price series, so no technical indicators. All models live in
[`mobile/src/utils/quant.ts`](mobile/src/utils/quant.ts) (pure, seedable,
unit-tested) and present distributions with explicit uncertainty, never
false-precision point estimates.

- **Probabilistic milestone-tree valuation** (deal page) — a seeded Monte
  Carlo over each startup's remaining milestones: every unhit milestone has a
  completion probability (raised by independent attestation) and a valuation
  step-up on success; a miss returns residual value. Renders as a histogram
  with expected multiple, P10/P50/P90 bands, and an explicit probability of
  total loss.
- **TRL + Science-Risk score** (deal page) — NASA Technology Readiness Level
  (1–9) derived from sector start + completed milestones, TRL velocity, and a
  0–100 science-risk score blending TRL gap, sector prior, and attestation
  rate.
- **Factor-based portfolio analytics** (Portfolio tab) — exposure by vertical,
  TRL band, time-to-liquidity, and university with a plain-English
  concentration note and weighted science-risk, all from cost-basis weights
  (no return series required).
- **Scenario stress testing** (Portfolio tab) — sector shocks (fusion slip,
  quantum winter, broad drawdown) applied to the milestone model, revaluing
  the book's expected multiple and loss probability vs. baseline.
- **Liquidity analytics** (Markets tab) — batch-auction microstructure: bid/ask
  depth, implied spread, price impact of selling into the book, clearing-price
  volatility, and a 0–100 liquidity score.
- **Predictive milestone-slip model** — a logistic model of the probability a
  forward milestone lands late (sector base rate, sequence depth, execution
  pace, horizon). Feeds a slip-aware variant of the valuation Monte Carlo and
  shows per-milestone slip risk in the tracker.

### Intelligence & provenance layer

- **AI science-monitoring agent** (deal page + inbox) — surfaces arXiv/PubMed/
  USPTO/conference results relevant to a company, each classified by stance
  (supportive / competitive / neutral). Demo shows curated examples over the
  fictional portfolio; production runs the agent server-side and pushes new
  signals to the activity inbox.
- **Deep-tech knowledge graph** (Discovery) — an ego-graph browser linking
  startups ↔ founders ↔ papers ↔ patents ↔ universities ↔ topics ↔ competing
  labs. Tap any node to walk the graph ("who else works on rare-earth-free
  magnets?" surfaces the investable startup *and* the competing lab).
- **On-chain verifiable attestations** (`backend/api/src/credentials/`) —
  milestone attestations published as **W3C Verifiable Credentials signed with
  real Ed25519** (`node:crypto`). `POST /credentials/attestations/:id/issue`
  builds and signs the VC; `GET /credentials/attestations/:id` returns it;
  `POST /credentials/verify` checks the proof against the public attestor
  registry — no auth required, so anyone can verify independently. Tampering
  with any field fails verification (proven by a CI crypto test and a live
  end-to-end tamper test). Demo keys are deterministic; production keys live
  in the officer's secure enclave and the VC hash anchors to a public ledger.

### Data flywheel — the compounding moat

- **Outcome-calibrated models** ("Our Models, Scored", from Discovery) — every
  valuation/slip prediction is logged and scored against the realized outcome.
  The transparency page plots the reliability curve against the
  perfect-calibration diagonal with Brier score, Expected Calibration Error,
  and sample size. The models are honestly modeled as mildly optimistic, so
  the curve sits *near* the diagonal, not on it. Pure math in
  [`mobile/src/utils/calibration.ts`](mobile/src/utils/calibration.ts)
  (unit-tested); backend `model_predictions` ledger + `model_reliability` SQL
  view + `GET /models/:model/calibration` compute the same metrics live. This
  is the moat that compounds: a cold-start entrant has no deep-tech outcome
  data and cannot buy this history.
- **UniVest Deep-Tech Index** ("Deep-Tech Index", from Discovery) — an "S&P
  for university spinouts": an equal-weight composite plus per-vertical
  sub-indices (base 100 at inception) computed from aggregate NAV progress,
  with total and annualized returns. If the category cites it as the reference
  rate, that's a brand + data moat.

### Supply-side lock-in — University OS

- **University OS** (Tools → University Portal) — the TTO portal deepened from
  a launch tool into an operating system for the whole tech-transfer office: a
  **Portfolio desk** managing every spinout the university holds a stake in,
  *including ones it didn't fund on UniVest* (TRACKED vs UNIVEST), with
  per-company cap tables (university stake highlighted), an aggregate
  university-equity-value rollup, exposure-by-vertical, and an exportable
  LP/stakeholder report. Once a TTO runs its whole book here, switching cost is
  enormous. Pure aggregation in
  [`mobile/src/utils/tto.ts`](mobile/src/utils/tto.ts) (unit-tested); backend
  `tto_portfolio_companies` table (with a cap-table-sum CHECK constraint) +
  `university_portfolio_value` view + `GET /universities/:id/portfolio`.
- **Cross-university consortia** — themed vehicles co-sponsored by multiple
  universities (e.g. a Global Fusion Consortium led by MIT with Oxford and
  ETH), with pooled capital, shared deal flow, and member lists. Institutional
  entanglement that's hard to unwind. Backend `consortia` + `consortium_members`
  tables + `GET /universities/:id/consortia`.

### Scientific-diligence moat (deal page)

- **Independent replication marketplace** — beyond attestation: third-party
  labs reproduce a milestone's result for a fee, earning a "✓✓ Verified by
  Replication" badge (the strongest trust signal in science), with a
  commission-replication action on open studies.
- **Freedom-to-operate** — an auto-generated patent-landscape clearance score
  (100 − 25·blocking − 6·adjacent) with owned/licensed/blocking/adjacent
  breakdown and a Clear/Moderate/Contested band.
- **Talent flow** — which star researchers are joining, weighted into a 0–100
  signal — a leading quality indicator retail never gets.
- Scoring is pure and unit-tested
  ([`mobile/src/utils/diligence.ts`](mobile/src/utils/diligence.ts));
  backend `replication_studies` / `fto_patents` / `talent_moves` tables, a
  `startup_fto_clearance` SQL view, and `GET /diligence/startups/:id`. All
  labs, patent assignees, and hires are fictional so no real party is placed
  in a fabricated relationship.
- **Onboarding, KYC & suitability quiz** — welcome flow → simulated identity
  verification (Persona-style) → 5-question suitability quiz (pass ≥4, retake
  with explanations) → income/net-worth bands compute the real Reg CF annual
  limit that gates investing; guests may browse but the invest CTA requires
  verification.
- **TTO/University Portal** (Tools tab) — click-and-agree USIT / US-BOLT
  launch wizard, milestone update composer with micro-video attach, and the
  Attestation Desk: review the evidence bundle and sign completed milestones
  with the officer's registered key.
- **Distribution waterfall** — realized exits show gross proceeds → return of
  capital → profit → 15% carry → net-to-you, with net multiple.
- **Activity Inbox** — persistent feed of attestations, auction clearings,
  K-1s, closing reminders, and distributions, with unread tracking.
- **Deal comparison** — up to three offerings side-by-side (subscription,
  attestation rate, leads, timing) with per-metric leaders marked.
- **Subscription e-signature** — the commitment flow ends by signing the
  agreement (type-to-sign; Dropbox Sign in production); signed agreements
  file into the Document Vault beside the K-1s.
- **UniVest Academy** — four education modules with knowledge checks; each
  completion unlocks another 10% of the statutory Reg CF limit (60% → 100%),
  enforced in the commitment flow.
- **Fee transparency** — a tappable per-deal breakdown of all three revenue
  streams with net-to-you math at 2x/3x/5x exit multiples.
- **Platform Ops console** — campaign approval queue, KYC exceptions, and
  Q&A moderation with audit-preserving hides, backed by `/api/v1/admin/*`
  endpoints (admin role verified from the database; a dedicated RLS
  moderation policy allows the hide).
- **Web build (Vercel-ready)** — `react-native-web` target with a
  `ResearchMap.web.tsx` fallback for the native-only map; `vercel.json`
  builds `mobile/` and serves `mobile/dist` zero-config.
- **Multi-currency + jurisdiction regimes** — USD/EUR display everywhere via
  locale-aware formatters; the Region setting (or onboarding residence)
  selects Reg CF (48h-before-close cancellation) or ECSPR (4-day reflection
  period + express-consent nudge).
- **Web companion (SEO)** — `web/build.mjs` generates static, crawlable deal
  pages and a leaderboard at `/deals/*` from the app's data, served from the
  same Vercel deploy as the SPA.

## Testing & CI

- `mobile`: `npm test` — Jest (jest-expo + React Native Testing Library):
  finance math (XIRR closed-form, TVPI, auction clearing vs the SQL engine,
  Reg CF limits) and InvestPanel behavior (KYC gate, 40% concentration
  threshold, cooling-off open/closed states).
- `backend/db/tests.sql` — database assertions: clearing engine on the
  reference book (12.375/300 with correct fills), raised-amount trigger,
  cooling-off stamp, late-cancel rejection, views.
- `.github/workflows/ci.yml` — on every push: mobile typecheck + tests + web
  bundle + companion build; backend build; schema + seed + assertions against
  a real PostgreSQL 16 service.
- `mobile/.maestro/invest-happy-path.yaml` — device E2E scaffold
  (onboarding → quiz → invest → sign → cooling-off) for local/device-farm runs.

## Backend API

NestJS over the schema; every request runs in a transaction with
`app.current_user_id` / `app.user_role` set, so Row-Level Security applies
end-to-end (the API connects as the non-owner `univest_api` role).

```bash
createdb univest
psql -d univest -f backend/db/schema.sql
psql -d univest -f backend/db/seed.sql
cd backend/api && npm install && npm run build && npm start
# GET  /api/v1/offerings                    · catalog
# GET  /api/v1/offerings/:id                · detail + attestations + Q&A
# POST /api/v1/offerings/:id/questions      · community diligence
# POST /api/v1/investments                  · Reg CF limit + 1.5% fee + cooling-off stamp
# DELETE /api/v1/investments/:id            · cancel (DB trigger enforces 48h window)
# GET  /api/v1/portfolio                    · positions, commitments, tax docs (RLS)
# GET  /api/v1/auctions/active              · window + indicative clearing price
# POST /api/v1/auctions/:id/orders          · place bid/offer
# POST /api/v1/auctions/:id/clear           · run the uniform-price engine
# GET  /api/v1/users/me · POST /api/v1/users/me/suitability · POST /api/v1/webhooks/kyc
```

Demo auth passes the user id in `x-user-id` (stands in for the verified JWT
subject); roles are resolved from the database, never from the client.
- **Dark mode** — full light/dark theming (`#050C16` charcoal per spec) that
  follows the system, with an in-app AUTO → LIGHT → DARK override, persisted.
- **Playfair Display serifs** — loaded via `expo-font` for display headers.

## Design Language

Institutional / private-wealth aesthetic: deep navy `#0A192F`, champagne gold
`#D4AF37` accents used sparingly, serif display headers (Playfair Display),
geometric sans-serif body with tabular numerals for financial figures, 4–8px
border radii, generous whitespace. Both light and dark palettes live in
[`mobile/src/theme/tokens.ts`](mobile/src/theme/tokens.ts).

## Running the Mobile App

```bash
cd mobile
npm install
npx expo start        # then press i (iOS simulator) or a (Android emulator)
```

## Provisioning the Database

```bash
createdb univest
psql -d univest -f backend/db/schema.sql
```
