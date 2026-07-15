# UniVest

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
| [`mobile/`](mobile/) | React Native (TypeScript, Expo) app — Global Discovery Feed + interactive Visual Milestone Tracker |

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

## Design Language

Institutional / private-wealth aesthetic: deep navy `#0A192F`, champagne gold
`#D4AF37` accents used sparingly, serif display headers, geometric sans-serif
body with tabular numerals for financial figures, 4–8px border radii, generous
whitespace. See [`mobile/src/theme/tokens.ts`](mobile/src/theme/tokens.ts).

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
