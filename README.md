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
| [`mobile/`](mobile/) | React Native (TypeScript, Expo) app — Global Discovery Feed, interactive Research Map, Visual Milestone Tracker, watchlists with closing-soon alerts |

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
