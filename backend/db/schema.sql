-- ============================================================================
-- UniVest — PostgreSQL Schema
-- Coordinated Capital platform for university deep-tech spinouts.
--
-- Conventions
--   * All money stored as NUMERIC(18,2) in the currency of `currency_code`.
--   * Fee/carry percentages stored as NUMERIC(5,2) (e.g. 6.00 = 6%).
--   * Row-Level Security keyed on session settings set by the API layer:
--       SET app.current_user_id = '<uuid>';
--       SET app.user_role       = 'retail' | 'institutional' | 'tto' | 'admin';
--     ("user_role" rather than "current_role": CURRENT_ROLE is a reserved
--      word in PostgreSQL and cannot appear in a SET statement.)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive emails

-- ----------------------------------------------------------------------------
-- Enumerated types
-- ----------------------------------------------------------------------------
CREATE TYPE user_role          AS ENUM ('retail', 'institutional', 'tto', 'admin');
CREATE TYPE kyc_status         AS ENUM ('not_started', 'pending', 'approved', 'rejected', 'expired');
CREATE TYPE accreditation      AS ENUM ('none', 'accredited', 'qualified_purchaser');
CREATE TYPE campaign_status    AS ENUM ('draft', 'tto_review', 'live', 'funded', 'closed', 'cancelled');
CREATE TYPE deal_template      AS ENUM ('usit', 'us_bolt', 'custom');
CREATE TYPE milestone_status   AS ENUM ('upcoming', 'in_progress', 'completed', 'delayed');
CREATE TYPE investment_status  AS ENUM ('pending_kyc', 'pending_payment', 'escrowed', 'settled', 'refunded', 'cancelled');
CREATE TYPE spv_status         AS ENUM ('forming', 'active', 'exited', 'dissolved');
CREATE TYPE trade_status       AS ENUM ('listed', 'matched', 'in_escrow', 'settled', 'cancelled', 'expired');
CREATE TYPE ledger_entry_type  AS ENUM ('success_fee', 'admin_fee', 'carry', 'saas_subscription', 'refund');
CREATE TYPE saas_tier          AS ENUM ('starter', 'portfolio', 'enterprise');
CREATE TYPE mandate_status     AS ENUM ('active', 'paused', 'revoked');

-- ----------------------------------------------------------------------------
-- Users (retail investors, institutional leads, TTO officers, admins)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role                  user_role      NOT NULL,
    email                 CITEXT         NOT NULL UNIQUE,
    phone_e164            TEXT,
    full_name             TEXT           NOT NULL,
    country_code          CHAR(2)        NOT NULL,              -- ISO 3166-1 alpha-2
    password_hash         TEXT           NOT NULL,              -- argon2id
    mfa_totp_secret_enc   BYTEA,                                -- AES-256-GCM, key in KMS
    biometric_enabled     BOOLEAN        NOT NULL DEFAULT FALSE,

    -- KYC / AML (verification handled by Persona/Veriff; we store outcomes only)
    kyc_status            kyc_status     NOT NULL DEFAULT 'not_started',
    kyc_provider_ref      TEXT,                                 -- provider inquiry id
    kyc_approved_at       TIMESTAMPTZ,
    accreditation         accreditation  NOT NULL DEFAULT 'none',

    -- Suitability engine (Reg CF / ECSPR)
    suitability_score     SMALLINT CHECK (suitability_score BETWEEN 0 AND 100),
    suitability_quiz_at   TIMESTAMPTZ,
    annual_income         NUMERIC(18,2),                        -- self-reported, encrypted app-side
    net_worth             NUMERIC(18,2),
    invest_limit_annual   NUMERIC(18,2),                        -- computed cap for rolling 12 months
    invest_limit_currency CHAR(3)        NOT NULL DEFAULT 'USD',

    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    deactivated_at        TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- Universities & TTO membership
-- ----------------------------------------------------------------------------
CREATE TABLE universities (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL,
    short_name        TEXT,                                     -- "MIT", "ETH"
    country_code      CHAR(2)     NOT NULL,
    city              TEXT,
    latitude          DOUBLE PRECISION,                         -- global research map
    longitude         DOUBLE PRECISION,
    default_template  deal_template NOT NULL DEFAULT 'usit',
    equity_cap_pct    NUMERIC(5,2) NOT NULL DEFAULT 15.00       -- standardized university equity cap
                      CHECK (equity_cap_pct BETWEEN 0 AND 25.00),
    verified          BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, country_code)
);

-- TTO officers belong to a university
CREATE TABLE university_members (
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    title         TEXT,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (university_id, user_id)
);

-- University SaaS portal subscriptions (revenue stream 4)
CREATE TABLE tto_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id    UUID        NOT NULL REFERENCES universities(id),
    tier             saas_tier   NOT NULL DEFAULT 'starter',
    monthly_fee      NUMERIC(18,2) NOT NULL,
    currency_code    CHAR(3)     NOT NULL DEFAULT 'USD',
    stripe_sub_ref   TEXT,                                      -- Stripe subscription id
    active_from      DATE        NOT NULL,
    active_until     DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Startups (university spinouts)
-- ----------------------------------------------------------------------------
CREATE TABLE startups (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id      UUID        NOT NULL REFERENCES universities(id),
    name               TEXT        NOT NULL,
    slug               TEXT        NOT NULL UNIQUE,
    vertical           TEXT        NOT NULL,                    -- 'Fusion Energy', 'Quantum Computing', ...
    tagline            TEXT,
    founded_year       SMALLINT,
    founder_user_id    UUID        REFERENCES users(id),
    website_url        TEXT,
    logo_url           TEXT,

    -- AI Layman Pitch Deck (generated by the AI Translation Service)
    pitch_plain_english      TEXT,                              -- "Explain like I'm 5"
    pitch_commercialization  TEXT,                              -- "How this actually makes money"
    pitch_lab_proof          TEXT,                              -- "The core technical breakthrough"
    pitch_generated_at       TIMESTAMPTZ,
    source_paper_url         TEXT,

    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Campaigns (fundraising rounds; one live campaign per startup)
-- ----------------------------------------------------------------------------
CREATE TABLE campaigns (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id           UUID            NOT NULL REFERENCES startups(id),
    status               campaign_status NOT NULL DEFAULT 'draft',
    template             deal_template   NOT NULL DEFAULT 'usit',
    university_equity_pct NUMERIC(5,2)   CHECK (university_equity_pct BETWEEN 0 AND 25.00),

    target_amount        NUMERIC(18,2)   NOT NULL CHECK (target_amount > 0),
    max_amount           NUMERIC(18,2)   CHECK (max_amount >= target_amount),
    raised_amount        NUMERIC(18,2)   NOT NULL DEFAULT 0,    -- denormalized, trigger-maintained
    currency_code        CHAR(3)         NOT NULL DEFAULT 'USD',
    min_investment       NUMERIC(18,2)   NOT NULL DEFAULT 100.00,
    max_investment       NUMERIC(18,2)   NOT NULL DEFAULT 5000.00,
    price_per_unit       NUMERIC(18,6)   NOT NULL,              -- SPV unit price
    pre_money_valuation  NUMERIC(18,2),

    -- Revenue model (defaults per platform policy)
    success_fee_pct      NUMERIC(5,2)    NOT NULL DEFAULT 6.00,  -- charged to startup at close
    admin_fee_pct        NUMERIC(5,2)    NOT NULL DEFAULT 1.50,  -- charged to investor per transaction

    -- Syndicate anchor (institutional lead)
    lead_investor_id     UUID            REFERENCES users(id),
    lead_commitment      NUMERIC(18,2),
    retail_allocation_pct NUMERIC(5,2),                          -- % of round reserved for retail follow-on

    opens_at             TIMESTAMPTZ,
    closes_at            TIMESTAMPTZ,
    closed_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT chk_campaign_window CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);

-- Only one live campaign per startup at a time
CREATE UNIQUE INDEX uq_campaign_live_per_startup
    ON campaigns (startup_id) WHERE status = 'live';

-- ----------------------------------------------------------------------------
-- Milestones (the Visual Milestone Tracker / "Lab Progress Bar")
-- ----------------------------------------------------------------------------
CREATE TABLE milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id      UUID             NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    campaign_id     UUID             REFERENCES campaigns(id),
    position        SMALLINT         NOT NULL,                  -- ordering on the progress bar
    title           TEXT             NOT NULL,                  -- "Prototype Validation", "Phase I Trials"
    description     TEXT,
    status          milestone_status NOT NULL DEFAULT 'upcoming',
    target_date     DATE,
    completed_at    TIMESTAMPTZ,
    video_update_url TEXT,                                      -- founder micro-video pushed on completion
    UNIQUE (startup_id, position)
);

-- ----------------------------------------------------------------------------
-- SPVs (one nominee entity pools all retail capital per campaign)
-- ----------------------------------------------------------------------------
CREATE TABLE spvs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id        UUID          NOT NULL UNIQUE REFERENCES campaigns(id),
    legal_name         TEXT          NOT NULL,                  -- "UniVest SPV Series 042 LLC"
    jurisdiction       TEXT          NOT NULL DEFAULT 'DE-USA',
    status             spv_status    NOT NULL DEFAULT 'forming',
    custody_entity_ref TEXT,                                    -- custody provider entity id
    total_units        NUMERIC(24,6) NOT NULL DEFAULT 0,
    unit_price_initial NUMERIC(18,6) NOT NULL,
    carry_pct          NUMERIC(5,2)  NOT NULL DEFAULT 15.00,    -- platform carry on profits at exit
    formed_at          TIMESTAMPTZ,
    exited_at          TIMESTAMPTZ,
    exit_proceeds      NUMERIC(18,2),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Current unit holdings per investor per SPV (maintained by SPV Engine,
-- reconciled against the custody provider's securities ledger)
CREATE TABLE spv_holdings (
    spv_id        UUID          NOT NULL REFERENCES spvs(id),
    user_id       UUID          NOT NULL REFERENCES users(id),
    units         NUMERIC(24,6) NOT NULL CHECK (units >= 0),
    cost_basis    NUMERIC(18,2) NOT NULL DEFAULT 0,             -- for carry calculation
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (spv_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Investments (primary market subscriptions)
-- ----------------------------------------------------------------------------
CREATE TABLE investments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id         UUID              NOT NULL REFERENCES campaigns(id),
    investor_id         UUID              NOT NULL REFERENCES users(id),
    spv_id              UUID              REFERENCES spvs(id),
    status              investment_status NOT NULL DEFAULT 'pending_kyc',

    amount              NUMERIC(18,2)     NOT NULL CHECK (amount > 0),
    currency_code       CHAR(3)           NOT NULL DEFAULT 'USD',
    admin_fee_amount    NUMERIC(18,2)     NOT NULL DEFAULT 0,   -- amount * admin_fee_pct at time of order
    units_allocated     NUMERIC(24,6),

    -- Auto-invest provenance (NULL for manual orders)
    mandate_id          UUID,                                   -- FK added after auto_invest_mandates

    payment_intent_ref  TEXT,                                   -- Stripe payment intent id
    escrowed_at         TIMESTAMPTZ,
    settled_at          TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Smart Auto-Invest Syndicates
-- ----------------------------------------------------------------------------
CREATE TABLE syndicates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_user_id   UUID        NOT NULL REFERENCES users(id),   -- verified VC / university fund
    name           TEXT        NOT NULL,
    thesis         TEXT,
    verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retail pre-authorization: "automatically match my funds behind this lead"
CREATE TABLE auto_invest_mandates (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID           NOT NULL REFERENCES users(id),
    syndicate_id     UUID           NOT NULL REFERENCES syndicates(id),
    status           mandate_status NOT NULL DEFAULT 'active',
    per_deal_amount  NUMERIC(18,2)  NOT NULL CHECK (per_deal_amount > 0),
    monthly_cap      NUMERIC(18,2),
    verticals        TEXT[],                                    -- optional filter, e.g. '{Fusion Energy}'
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    revoked_at       TIMESTAMPTZ,
    UNIQUE (user_id, syndicate_id)
);

ALTER TABLE investments
    ADD CONSTRAINT fk_investments_mandate
    FOREIGN KEY (mandate_id) REFERENCES auto_invest_mandates(id);

-- ----------------------------------------------------------------------------
-- Secondary Trading Platform (Liquidity Engine)
-- ----------------------------------------------------------------------------
CREATE TABLE secondary_trades (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spv_id           UUID          NOT NULL REFERENCES spvs(id),
    seller_id        UUID          NOT NULL REFERENCES users(id),
    buyer_id         UUID          REFERENCES users(id),        -- NULL while merely listed
    status           trade_status  NOT NULL DEFAULT 'listed',

    units            NUMERIC(24,6) NOT NULL CHECK (units > 0),
    price_per_unit   NUMERIC(18,6) NOT NULL CHECK (price_per_unit > 0),
    total_price      NUMERIC(18,2) GENERATED ALWAYS AS (ROUND((units * price_per_unit)::numeric, 2)) STORED,
    currency_code    CHAR(3)       NOT NULL DEFAULT 'USD',
    admin_fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0,          -- buyer-side 1.5% admin fee

    listed_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ,
    matched_at       TIMESTAMPTZ,
    settled_at       TIMESTAMPTZ,
    custody_transfer_ref TEXT,                                  -- custody provider transfer id

    CONSTRAINT chk_no_self_trade CHECK (buyer_id IS NULL OR buyer_id <> seller_id)
);

-- ----------------------------------------------------------------------------
-- Revenue & carry ledgers
-- ----------------------------------------------------------------------------
-- Every platform fee event lands here (success fees, admin fees, SaaS, carry).
CREATE TABLE revenue_ledger (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type     ledger_entry_type NOT NULL,
    amount         NUMERIC(18,2)     NOT NULL,                  -- negative for refunds
    currency_code  CHAR(3)           NOT NULL DEFAULT 'USD',
    campaign_id    UUID REFERENCES campaigns(id),
    investment_id  UUID REFERENCES investments(id),
    trade_id       UUID REFERENCES secondary_trades(id),
    subscription_id UUID REFERENCES tto_subscriptions(id),
    memo           TEXT,
    occurred_at    TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- Carry tracking per investor position at liquidity events:
-- carry_due = max(proceeds - cost_basis, 0) * spvs.carry_pct / 100
CREATE TABLE carry_ledger (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spv_id        UUID          NOT NULL REFERENCES spvs(id),
    user_id       UUID          NOT NULL REFERENCES users(id),
    event_ref     TEXT          NOT NULL,                       -- exit / secondary-sale reference
    proceeds      NUMERIC(18,2) NOT NULL,
    cost_basis    NUMERIC(18,2) NOT NULL,
    profit        NUMERIC(18,2) GENERATED ALWAYS AS (GREATEST(proceeds - cost_basis, 0)) STORED,
    carry_pct     NUMERIC(5,2)  NOT NULL,
    carry_amount  NUMERIC(18,2) NOT NULL,
    occurred_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Triggers: keep updated_at and campaigns.raised_amount honest
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch       BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_startups_touch    BEFORE UPDATE ON startups    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_campaigns_touch   BEFORE UPDATE ON campaigns   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_investments_touch BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION refresh_campaign_raised() RETURNS trigger AS $$
BEGIN
    UPDATE campaigns c
       SET raised_amount = COALESCE((
               SELECT SUM(i.amount) FROM investments i
                WHERE i.campaign_id = c.id
                  AND i.status IN ('escrowed', 'settled')), 0)
     WHERE c.id = COALESCE(NEW.campaign_id, OLD.campaign_id);
    RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_investments_raised
    AFTER INSERT OR UPDATE OF status, amount OR DELETE ON investments
    FOR EACH ROW EXECUTE FUNCTION refresh_campaign_raised();

-- ----------------------------------------------------------------------------
-- Row-Level Security
-- The API sets: SET app.current_user_id = '<uuid>'; SET app.user_role = '<role>';
-- Service role (migrations/jobs) connects as table owner and bypasses RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_admin() RETURNS boolean AS $$
    SELECT current_setting('app.user_role', true) = 'admin'
$$ LANGUAGE sql STABLE;

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spv_holdings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondary_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_invest_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE carry_ledger     ENABLE ROW LEVEL SECURITY;

-- Users may see and edit only their own profile (admins see all).
CREATE POLICY users_self ON users
    USING (id = app_user_id() OR app_is_admin())
    WITH CHECK (id = app_user_id() OR app_is_admin());

-- Investors see only their own investments; inserts must be their own.
CREATE POLICY investments_own ON investments
    USING (investor_id = app_user_id() OR app_is_admin())
    WITH CHECK (investor_id = app_user_id() OR app_is_admin());

-- Holdings visible only to the holder.
CREATE POLICY holdings_own ON spv_holdings
    USING (user_id = app_user_id() OR app_is_admin());

-- Secondary market: anyone verified may browse open listings;
-- counterparties see their own trades end-to-end.
CREATE POLICY trades_browse ON secondary_trades FOR SELECT
    USING (status = 'listed'
           OR seller_id = app_user_id()
           OR buyer_id  = app_user_id()
           OR app_is_admin());
CREATE POLICY trades_list ON secondary_trades FOR INSERT
    WITH CHECK (seller_id = app_user_id() OR app_is_admin());
CREATE POLICY trades_update ON secondary_trades FOR UPDATE
    USING (seller_id = app_user_id() OR buyer_id = app_user_id() OR app_is_admin());

CREATE POLICY mandates_own ON auto_invest_mandates
    USING (user_id = app_user_id() OR app_is_admin())
    WITH CHECK (user_id = app_user_id() OR app_is_admin());

CREATE POLICY carry_own ON carry_ledger FOR SELECT
    USING (user_id = app_user_id() OR app_is_admin());

-- Public catalog tables (universities, startups, campaigns, milestones,
-- syndicates) intentionally have no RLS: they are read-mostly marketing data;
-- writes are restricted at the API layer to TTO/admin roles.

-- ----------------------------------------------------------------------------
-- Indexes for the hot paths
-- ----------------------------------------------------------------------------
CREATE INDEX idx_startups_university   ON startups (university_id);
CREATE INDEX idx_startups_vertical     ON startups (vertical);
CREATE INDEX idx_campaigns_status      ON campaigns (status) WHERE status = 'live';
CREATE INDEX idx_milestones_startup    ON milestones (startup_id, position);
CREATE INDEX idx_investments_campaign  ON investments (campaign_id);
CREATE INDEX idx_investments_investor  ON investments (investor_id, created_at DESC);
CREATE INDEX idx_trades_open_by_spv    ON secondary_trades (spv_id, listed_at DESC) WHERE status = 'listed';
CREATE INDEX idx_revenue_type_time     ON revenue_ledger (entry_type, occurred_at DESC);
CREATE INDEX idx_universities_geo      ON universities (latitude, longitude);
