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
CREATE TYPE attestor_role      AS ENUM ('tto', 'independent_reviewer');
CREATE TYPE ack_kind           AS ENUM ('concentration_warning', 'risk_disclosure');
CREATE TYPE mandate_mode       AS ENUM ('per_deal', 'monthly_budget');
CREATE TYPE auction_status     AS ENUM ('scheduled', 'open', 'cleared', 'settled', 'cancelled');
CREATE TYPE order_side         AS ENUM ('buy', 'sell');
CREATE TYPE order_status       AS ENUM ('open', 'filled', 'partially_filled', 'unfilled', 'cancelled');

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
-- Independent milestone attestation (trust layer)
-- A completed milestone becomes "independently verified" only when a TTO
-- officer or third-party reviewer signs the evidence bundle. Verification =
-- Ed25519 signature over the evidence hash, checked against the registered
-- key. The stamp (attestor name, role, signed date, key fingerprint) is
-- rendered in the app's Visual Milestone Tracker.
-- ----------------------------------------------------------------------------
CREATE TABLE attestor_keys (
    key_id          TEXT PRIMARY KEY,                           -- e.g. 'oxford-tto-2026-01'
    owner_name      TEXT        NOT NULL,
    owner_user_id   UUID        REFERENCES users(id),
    university_id   UUID        REFERENCES universities(id),
    ed25519_pubkey  BYTEA       NOT NULL,                       -- 32-byte public key
    fingerprint     TEXT        NOT NULL UNIQUE,                -- short display form
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);

CREATE TABLE milestone_attestations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id    UUID          NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    attestor_name   TEXT          NOT NULL,
    attestor_org    TEXT          NOT NULL,                     -- "Oxford University Innovation"
    attestor_role   attestor_role NOT NULL,
    key_id          TEXT          NOT NULL REFERENCES attestor_keys(key_id),
    evidence_hash   BYTEA         NOT NULL,                     -- SHA-256 of the evidence bundle
    signature       BYTEA         NOT NULL,                     -- Ed25519 over evidence_hash
    signed_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (milestone_id, key_id)
);

-- W3C Verifiable Credential per attestation: the full signed credential JSON
-- plus an anchor reference, so ANYONE — not just the app — can independently
-- verify that the named attestor key signed this milestone. Public read is
-- the point (no RLS). Production anchors the hash to a public ledger; the
-- demo records a deterministic anchor reference.
CREATE TABLE attestation_credentials (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attestation_id UUID        NOT NULL UNIQUE REFERENCES milestone_attestations(id) ON DELETE CASCADE,
    credential     JSONB       NOT NULL,                        -- signed W3C VC (incl. proof)
    vc_hash        BYTEA       NOT NULL,                        -- SHA-256 of canonical payload
    anchor_chain   TEXT        NOT NULL DEFAULT 'demo-ledger',
    anchor_ref     TEXT,                                        -- tx / merkle reference
    issued_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Deal Q&A (community diligence; the public discussion channel Reg CF expects)
-- Author badges (founder / TTO / investor) derive from users.role and
-- university_members at read time. Moderation hides rather than deletes,
-- preserving the audit trail.
-- ----------------------------------------------------------------------------
CREATE TABLE deal_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id   UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    author_id     UUID        NOT NULL REFERENCES users(id),
    body          TEXT        NOT NULL CHECK (char_length(body) BETWEEN 10 AND 4000),
    upvotes       INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    hidden_at     TIMESTAMPTZ,
    hidden_reason TEXT
);

CREATE TABLE deal_answers (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id   UUID        NOT NULL REFERENCES deal_questions(id) ON DELETE CASCADE,
    author_id     UUID        NOT NULL REFERENCES users(id),
    body          TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    hidden_at     TIMESTAMPTZ,
    hidden_reason TEXT
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

    -- Reg CF cooling-off: investors may cancel until 48h before campaign
    -- close. Stamped by trigger from campaigns.closes_at; cancellation after
    -- this instant is rejected at the database layer.
    cancellable_until   TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,

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

-- Retail pre-authorization. Two modes:
--   per_deal       — "match my funds behind this lead, $X per qualifying deal"
--   monthly_budget — deep-tech DCA: a fixed monthly budget spread evenly
--                    across all new qualifying deals (syndicate optional)
CREATE TABLE auto_invest_mandates (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID           NOT NULL REFERENCES users(id),
    syndicate_id     UUID           REFERENCES syndicates(id),  -- NULL = platform-wide DCA
    status           mandate_status NOT NULL DEFAULT 'active',
    mode             mandate_mode   NOT NULL DEFAULT 'per_deal',
    per_deal_amount  NUMERIC(18,2)  CHECK (per_deal_amount > 0),
    monthly_budget   NUMERIC(18,2)  CHECK (monthly_budget > 0),
    monthly_cap      NUMERIC(18,2),
    verticals        TEXT[],                                    -- optional filter, e.g. '{Fusion Energy}'
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    revoked_at       TIMESTAMPTZ,
    UNIQUE (user_id, syndicate_id),
    CONSTRAINT chk_mandate_mode CHECK (
        (mode = 'per_deal'       AND per_deal_amount IS NOT NULL) OR
        (mode = 'monthly_budget' AND monthly_budget  IS NOT NULL)
    )
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
-- Batch auctions (Liquidity Engine v2)
-- Thin continuous order books gap wildly; instead, orders accumulate inside a
-- window and clear at one uniform price that maximizes executed volume
-- (midpoint of the max-volume price range on ties). Fairer marks, less
-- volatility, cleaner carry accounting. Settlement writes secondary_trades
-- rows and instructs the custody provider, as in the continuous flow.
-- ----------------------------------------------------------------------------
CREATE TABLE auction_windows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spv_id          UUID           NOT NULL REFERENCES spvs(id),
    opens_at        TIMESTAMPTZ    NOT NULL,
    closes_at       TIMESTAMPTZ    NOT NULL,
    status          auction_status NOT NULL DEFAULT 'scheduled',
    clearing_price  NUMERIC(18,6),
    cleared_units   NUMERIC(24,6),
    cleared_at      TIMESTAMPTZ,
    CONSTRAINT chk_auction_window CHECK (closes_at > opens_at)
);

CREATE TABLE auction_orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id     UUID          NOT NULL REFERENCES auction_windows(id) ON DELETE CASCADE,
    user_id       UUID          NOT NULL REFERENCES users(id),
    side          order_side    NOT NULL,
    units         NUMERIC(24,6) NOT NULL CHECK (units > 0),
    limit_price   NUMERIC(18,6) NOT NULL CHECK (limit_price > 0),
    filled_units  NUMERIC(24,6) NOT NULL DEFAULT 0,
    status        order_status  NOT NULL DEFAULT 'open',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Uniform-price clearing: picks the price maximizing min(demand, supply),
-- midpoint of the max-volume plateau on ties, then fills eligible orders in
-- price-time priority. Returns (clearing price, cleared units).
CREATE OR REPLACE FUNCTION clear_auction(p_window_id UUID)
RETURNS TABLE (o_price NUMERIC, o_units NUMERIC) AS $$
DECLARE
    v_best_volume NUMERIC := 0;
    v_price_lo    NUMERIC;
    v_price_hi    NUMERIC;
    v_price       NUMERIC;
    v_demand      NUMERIC;
    v_supply      NUMERIC;
    v_fill        NUMERIC;
    v_remaining   NUMERIC;
    cand          RECORD;
    r             RECORD;
BEGIN
    PERFORM 1 FROM auction_windows w WHERE w.id = p_window_id AND w.status = 'open';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'auction window % is not open', p_window_id;
    END IF;

    FOR cand IN
        SELECT DISTINCT ao.limit_price AS p
          FROM auction_orders ao
         WHERE ao.window_id = p_window_id AND ao.status = 'open'
         ORDER BY 1
    LOOP
        SELECT COALESCE(SUM(ao.units), 0) INTO v_demand
          FROM auction_orders ao
         WHERE ao.window_id = p_window_id AND ao.status = 'open'
           AND ao.side = 'buy' AND ao.limit_price >= cand.p;
        SELECT COALESCE(SUM(ao.units), 0) INTO v_supply
          FROM auction_orders ao
         WHERE ao.window_id = p_window_id AND ao.status = 'open'
           AND ao.side = 'sell' AND ao.limit_price <= cand.p;

        IF LEAST(v_demand, v_supply) > v_best_volume THEN
            v_best_volume := LEAST(v_demand, v_supply);
            v_price_lo := cand.p;
            v_price_hi := cand.p;
        ELSIF LEAST(v_demand, v_supply) = v_best_volume AND v_best_volume > 0 THEN
            v_price_hi := cand.p;   -- max-volume plateau is contiguous
        END IF;
    END LOOP;

    IF v_best_volume = 0 THEN
        UPDATE auction_orders SET status = 'unfilled'
         WHERE window_id = p_window_id AND status = 'open';
        UPDATE auction_windows
           SET status = 'cleared', clearing_price = NULL, cleared_units = 0, cleared_at = now()
         WHERE id = p_window_id;
        RETURN QUERY SELECT NULL::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;

    v_price := ROUND((v_price_lo + v_price_hi) / 2, 6);

    -- Buy side: best price first, then time priority.
    v_remaining := v_best_volume;
    FOR r IN
        SELECT ao.id, ao.units FROM auction_orders ao
         WHERE ao.window_id = p_window_id AND ao.status = 'open'
           AND ao.side = 'buy' AND ao.limit_price >= v_price
         ORDER BY ao.limit_price DESC, ao.created_at
    LOOP
        EXIT WHEN v_remaining <= 0;
        v_fill := LEAST(r.units, v_remaining);
        UPDATE auction_orders
           SET filled_units = v_fill,
               status = CASE WHEN v_fill = r.units THEN 'filled' ELSE 'partially_filled' END::order_status
         WHERE id = r.id;
        v_remaining := v_remaining - v_fill;
    END LOOP;

    -- Sell side: lowest price first, then time priority.
    v_remaining := v_best_volume;
    FOR r IN
        SELECT ao.id, ao.units FROM auction_orders ao
         WHERE ao.window_id = p_window_id AND ao.status = 'open'
           AND ao.side = 'sell' AND ao.limit_price <= v_price
         ORDER BY ao.limit_price ASC, ao.created_at
    LOOP
        EXIT WHEN v_remaining <= 0;
        v_fill := LEAST(r.units, v_remaining);
        UPDATE auction_orders
           SET filled_units = v_fill,
               status = CASE WHEN v_fill = r.units THEN 'filled' ELSE 'partially_filled' END::order_status
         WHERE id = r.id;
        v_remaining := v_remaining - v_fill;
    END LOOP;

    UPDATE auction_orders SET status = 'unfilled'
     WHERE window_id = p_window_id AND status = 'open';
    UPDATE auction_windows
       SET status = 'cleared', clearing_price = v_price,
           cleared_units = v_best_volume, cleared_at = now()
     WHERE id = p_window_id;

    RETURN QUERY SELECT v_price, v_best_volume;
END $$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Portfolio analytics & tax center
-- ----------------------------------------------------------------------------
-- Periodic NAV marks per SPV (quarterly 409A-style or event-driven).
CREATE TABLE spv_valuations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spv_id        UUID          NOT NULL REFERENCES spvs(id),
    as_of         DATE          NOT NULL,
    nav_per_unit  NUMERIC(18,6) NOT NULL CHECK (nav_per_unit >= 0),
    source        TEXT          NOT NULL DEFAULT 'quarterly_mark',
    UNIQUE (spv_id, as_of)
);

-- K-1s and friends: generated by the fund administrator each March,
-- surfaced in the app's Tax Document Center.
CREATE TABLE tax_documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id),
    spv_id       UUID        REFERENCES spvs(id),
    tax_year     SMALLINT    NOT NULL,
    kind         TEXT        NOT NULL DEFAULT 'schedule_k1',
    storage_url  TEXT,
    issued_at    TIMESTAMPTZ,
    UNIQUE (user_id, spv_id, tax_year, kind)
);

-- Unrealized position metrics from the latest NAV mark (IRR/TVPI with
-- distributions are computed by the analytics service, which also has the
-- cash-flow dates). security_invoker: spv_holdings RLS must filter for the
-- querying user rather than the view owner.
CREATE VIEW investor_position_metrics WITH (security_invoker = true) AS
SELECT h.user_id,
       h.spv_id,
       h.units,
       h.cost_basis,
       v.nav_per_unit,
       v.as_of                                          AS marked_as_of,
       ROUND(h.units * v.nav_per_unit, 2)               AS current_value,
       ROUND(h.units * v.nav_per_unit / NULLIF(h.cost_basis, 0), 2) AS unrealized_multiple
  FROM spv_holdings h
  JOIN LATERAL (
        SELECT sv.nav_per_unit, sv.as_of
          FROM spv_valuations sv
         WHERE sv.spv_id = h.spv_id
         ORDER BY sv.as_of DESC
         LIMIT 1
       ) v ON TRUE;

-- ----------------------------------------------------------------------------
-- Diligence Copilot (data room + grounded Q&A)
-- ----------------------------------------------------------------------------
CREATE TABLE data_room_documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title        TEXT        NOT NULL,                          -- "Exclusive License Agreement"
    kind         TEXT        NOT NULL,                          -- 'license' | 'financials' | 'technical' | ...
    storage_url  TEXT,
    sha256       BYTEA,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every copilot exchange is stored with its citations so answers are
-- auditable: [{document_id, section, quote}]. The AI Translation Service
-- performs the retrieval + generation (Claude API) and refuses questions the
-- data room cannot ground.
CREATE TABLE copilot_exchanges (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id),
    campaign_id  UUID        NOT NULL REFERENCES campaigns(id),
    question     TEXT        NOT NULL,
    answer       TEXT        NOT NULL,
    citations    JSONB       NOT NULL DEFAULT '[]',
    model        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Model prediction ledger (the data flywheel)
-- Every valuation/slip prediction the platform makes is logged here; when the
-- referenced subject resolves (milestone hit/missed, exit, total loss) the
-- outcome is stamped. The join of predicted vs realized is the proprietary
-- deep-tech outcome dataset that calibrates the models over time.
-- ----------------------------------------------------------------------------
CREATE TYPE model_name AS ENUM ('valuation', 'slip');

CREATE TABLE model_predictions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model          model_name  NOT NULL,
    subject_kind   TEXT        NOT NULL,                        -- 'milestone' | 'spv' | 'campaign'
    subject_id     UUID        NOT NULL,
    -- Predicted probability of the positive event, 0..1.
    predicted_prob NUMERIC(5,4) NOT NULL CHECK (predicted_prob BETWEEN 0 AND 1),
    made_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Resolution (NULL until the outcome is known).
    outcome        SMALLINT    CHECK (outcome IN (0, 1)),
    resolved_at    TIMESTAMPTZ
);

-- Reliability curve straight from SQL: predicted-probability deciles vs the
-- observed frequency of the positive outcome. Feeds the calibration endpoint.
CREATE VIEW model_reliability AS
SELECT model,
       width_bucket(predicted_prob, 0, 1, 10) AS bucket,
       COUNT(*)                               AS n,
       AVG(predicted_prob)                    AS mean_predicted,
       AVG(outcome::numeric)                  AS observed_freq
  FROM model_predictions
 WHERE outcome IS NOT NULL
 GROUP BY model, width_bucket(predicted_prob, 0, 1, 10);

-- ----------------------------------------------------------------------------
-- University leaderboard (public marketing surface + SaaS upsell)
-- ----------------------------------------------------------------------------
CREATE VIEW university_leaderboard AS
SELECT u.id,
       u.name,
       u.country_code,
       (SELECT COUNT(*) FROM startups s
         JOIN campaigns c ON c.startup_id = s.id AND c.status IN ('live', 'funded', 'closed')
        WHERE s.university_id = u.id)                                        AS spinouts_funded,
       (SELECT COALESCE(SUM(c.raised_amount), 0) FROM startups s
         JOIN campaigns c ON c.startup_id = s.id
        WHERE s.university_id = u.id)                                        AS capital_raised,
       (SELECT COUNT(*) FROM startups s
         JOIN milestones m ON m.startup_id = s.id AND m.status = 'completed'
        WHERE s.university_id = u.id)                                        AS milestones_completed,
       (SELECT COUNT(*) FROM startups s
         JOIN milestones m ON m.startup_id = s.id
         JOIN milestone_attestations a ON a.milestone_id = m.id
        WHERE s.university_id = u.id)                                        AS milestones_attested
  FROM universities u;

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

-- Suitability acknowledgements: an audit trail proving the investor saw and
-- accepted each concentration warning / risk disclosure before committing.
CREATE TABLE suitability_acknowledgements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id),
    campaign_id     UUID        REFERENCES campaigns(id),
    kind            ack_kind    NOT NULL,
    exposure_pct    NUMERIC(5,1),                               -- % of annual limit at time of warning
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rolling single-position exposure as % of each investor's annual limit —
-- the concentration-warning engine reads this before accepting an order.
-- security_invoker: RLS on investments must apply to the querying user,
-- not the view owner (who would bypass it).
CREATE VIEW investor_concentration WITH (security_invoker = true) AS
SELECT i.investor_id,
       i.campaign_id,
       SUM(i.amount)                                        AS committed,
       u.invest_limit_annual,
       ROUND(100 * SUM(i.amount) / NULLIF(u.invest_limit_annual, 0), 1) AS pct_of_annual_limit
  FROM investments i
  JOIN users u ON u.id = i.investor_id
 WHERE i.status IN ('pending_payment', 'escrowed', 'settled')
   AND i.created_at > now() - INTERVAL '365 days'
 GROUP BY i.investor_id, i.campaign_id, u.invest_limit_annual;

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

-- Stamp the Reg CF cooling-off deadline (48h before campaign close) on every
-- new investment, and refuse cancellations once the window has passed.
CREATE OR REPLACE FUNCTION stamp_cancellation_window() RETURNS trigger AS $$
BEGIN
    SELECT c.closes_at - INTERVAL '48 hours' INTO NEW.cancellable_until
      FROM campaigns c WHERE c.id = NEW.campaign_id;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_investments_cancel_window
    BEFORE INSERT ON investments
    FOR EACH ROW EXECUTE FUNCTION stamp_cancellation_window();

CREATE OR REPLACE FUNCTION enforce_cancellation_window() RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status IN ('pending_kyc', 'pending_payment', 'escrowed') THEN
        IF OLD.cancellable_until IS NOT NULL AND now() > OLD.cancellable_until THEN
            RAISE EXCEPTION 'cancellation window closed at % (Reg CF 48h rule)', OLD.cancellable_until
                USING ERRCODE = 'check_violation';
        END IF;
        NEW.cancelled_at = now();
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_investments_enforce_cancel
    BEFORE UPDATE OF status ON investments
    FOR EACH ROW EXECUTE FUNCTION enforce_cancellation_window();

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

-- Deal Q&A: public read while unmoderated; authors write as themselves.
ALTER TABLE deal_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_answers   ENABLE ROW LEVEL SECURITY;

CREATE POLICY questions_read ON deal_questions FOR SELECT
    USING (hidden_at IS NULL OR author_id = app_user_id() OR app_is_admin());
CREATE POLICY questions_write ON deal_questions FOR INSERT
    WITH CHECK (author_id = app_user_id() OR app_is_admin());
CREATE POLICY answers_read ON deal_answers FOR SELECT
    USING (hidden_at IS NULL OR author_id = app_user_id() OR app_is_admin());
CREATE POLICY answers_write ON deal_answers FOR INSERT
    WITH CHECK (author_id = app_user_id() OR app_is_admin());

-- Moderation (audit-preserving hides) is an UPDATE and needs its own policy;
-- without it, RLS default-deny silently blocks even admins.
CREATE POLICY questions_moderate ON deal_questions FOR UPDATE
    USING (app_is_admin())
    WITH CHECK (app_is_admin());
CREATE POLICY answers_moderate ON deal_answers FOR UPDATE
    USING (app_is_admin())
    WITH CHECK (app_is_admin());

-- Acknowledgements are the investor's own audit trail.
ALTER TABLE suitability_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY acks_own ON suitability_acknowledgements
    USING (user_id = app_user_id() OR app_is_admin())
    WITH CHECK (user_id = app_user_id() OR app_is_admin());

-- Auction orders: own rows only (book depth is served aggregated by the API).
ALTER TABLE auction_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY auction_orders_own ON auction_orders
    USING (user_id = app_user_id() OR app_is_admin())
    WITH CHECK (user_id = app_user_id() OR app_is_admin());

-- Tax documents and copilot history are private to the investor.
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tax_docs_own ON tax_documents FOR SELECT
    USING (user_id = app_user_id() OR app_is_admin());

ALTER TABLE copilot_exchanges ENABLE ROW LEVEL SECURITY;
CREATE POLICY copilot_own ON copilot_exchanges
    USING (user_id = app_user_id() OR app_is_admin())
    WITH CHECK (user_id = app_user_id() OR app_is_admin());

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
CREATE INDEX idx_attestations_milestone ON milestone_attestations (milestone_id);
CREATE INDEX idx_questions_campaign    ON deal_questions (campaign_id, created_at DESC) WHERE hidden_at IS NULL;
CREATE INDEX idx_answers_question      ON deal_answers (question_id, created_at);
CREATE INDEX idx_acks_user             ON suitability_acknowledgements (user_id, acknowledged_at DESC);
CREATE INDEX idx_auction_windows_spv   ON auction_windows (spv_id, closes_at DESC);
CREATE INDEX idx_auction_orders_book   ON auction_orders (window_id, side, limit_price);
CREATE INDEX idx_valuations_spv        ON spv_valuations (spv_id, as_of DESC);
CREATE INDEX idx_tax_docs_user         ON tax_documents (user_id, tax_year DESC);
CREATE INDEX idx_dataroom_campaign     ON data_room_documents (campaign_id);
CREATE INDEX idx_copilot_user          ON copilot_exchanges (user_id, created_at DESC);
CREATE INDEX idx_predictions_model     ON model_predictions (model) WHERE outcome IS NOT NULL;
CREATE INDEX idx_predictions_subject   ON model_predictions (subject_kind, subject_id);
