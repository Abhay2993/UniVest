-- ============================================================================
-- UniVest — demo seed
-- Creates the API role, grants (RLS still applies — univest_api owns nothing),
-- and a working data set: one live campaign, one exited-into-SPV campaign
-- with holdings/valuations, an open auction window, Q&A, and attestations.
--   psql -d univest -f backend/db/seed.sql
-- ============================================================================

-- API role: least-privilege login the NestJS service connects as.
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'univest_api') THEN
        CREATE ROLE univest_api LOGIN PASSWORD 'univest';
    END IF;
END $$;
GRANT USAGE ON SCHEMA public TO univest_api;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO univest_api;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO univest_api;

-- ----------------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------------
INSERT INTO users (id, role, email, full_name, country_code, password_hash, kyc_status, kyc_approved_at, invest_limit_annual, suitability_score, suitability_quiz_at)
VALUES
  ('00000000-0000-0000-0000-000000000001','retail','alice@example.com','Alice Chen','US','demo','approved',now(),12000,80,now()),
  ('00000000-0000-0000-0000-000000000002','retail','bob@example.com','Bob Rao','US','demo','approved',now(),2500,80,now()),
  ('00000000-0000-0000-0000-000000000003','institutional','founder@heliondynamics.com','Dr. Sofia Reyes','US','demo','approved',now(),NULL,NULL,NULL),
  ('00000000-0000-0000-0000-000000000004','tto','kbrennan@mit.edu','K. Brennan','US','demo','approved',now(),NULL,NULL,NULL),
  ('00000000-0000-0000-0000-000000000005','retail','carol@example.com','Carol Diaz','US','demo','not_started',NULL,NULL,NULL,NULL),
  ('00000000-0000-0000-0000-000000000006','admin','ops@univest.io','UniVest Ops','US','demo','approved',now(),NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- University, startups
-- ----------------------------------------------------------------------------
INSERT INTO universities (id, name, short_name, country_code, city, latitude, longitude, verified)
VALUES ('00000000-0000-0000-0000-0000000000aa','Massachusetts Institute of Technology','MIT','US','Cambridge',42.3601,-71.0942,TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO university_members (university_id, user_id, title, is_admin)
VALUES ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000000004','Licensing Officer',TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO startups (id, university_id, name, slug, vertical, tagline, founder_user_id,
                      pitch_plain_english, pitch_commercialization, pitch_lab_proof, pitch_generated_at)
VALUES
  ('00000000-0000-0000-0000-0000000000ab','00000000-0000-0000-0000-0000000000aa','Helion Dynamics','helion-dynamics','Fusion Energy',
   'Compact stellarator magnets for grid-scale fusion.','00000000-0000-0000-0000-000000000003',
   'Fusion is how the sun makes energy. Helion builds the magnets strong enough to bottle a star — smaller, colder, and far cheaper than anything before.',
   'Every fusion pilot plant announced for 2028–2032 needs HTS magnets. Helion sells the picks and shovels of the fusion gold rush.',
   'A 21-tesla field sustained for 48 hours in a rare-earth-free HTS coil — peer-reviewed in Nature Energy (2025).', now()),
  ('00000000-0000-0000-0000-0000000000ae','00000000-0000-0000-0000-0000000000aa','Vasca Bio','vasca-bio','MedTech',
   'Bio-resorbable stents grown from patient cells.',NULL,NULL,NULL,NULL,NULL)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Live campaign (Helion) with milestones, attestation, Q&A
-- ----------------------------------------------------------------------------
INSERT INTO campaigns (id, startup_id, status, template, university_equity_pct, target_amount,
                       raised_amount, min_investment, max_investment, price_per_unit, opens_at, closes_at,
                       lead_investor_id)
VALUES ('00000000-0000-0000-0000-0000000000ac','00000000-0000-0000-0000-0000000000ab','live','usit',12.00,
        2500000, 0, 100, 5000, 10.00, now() - interval '30 days', now() + interval '18 days',
        '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

INSERT INTO milestones (id, startup_id, campaign_id, position, title, description, status, completed_at)
VALUES
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000ab','00000000-0000-0000-0000-0000000000ac',1,
   'Prototype Validation','21T full-scale coil, 48-hour continuous operation at 20 K.','completed', now() - interval '160 days'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000ab','00000000-0000-0000-0000-0000000000ac',2,
   'Pilot Manufacturing Line','First 10 production coils delivered to pilot-plant customers.','in_progress', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO attestor_keys (key_id, owner_name, owner_user_id, university_id, ed25519_pubkey, fingerprint)
VALUES ('mit-tlo-2026','K. Brennan','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000aa',
        decode('8f3a22c1000000000000000000000000000000000000000000000000000000aa','hex'),'8F3A-22C1')
ON CONFLICT DO NOTHING;

INSERT INTO milestone_attestations (milestone_id, attestor_name, attestor_org, attestor_role, key_id, evidence_hash, signature)
VALUES ('00000000-0000-0000-0000-0000000000b1','K. Brennan','MIT Technology Licensing Office','tto','mit-tlo-2026',
        decode('bb','hex'), decode('cc','hex'))
ON CONFLICT DO NOTHING;

INSERT INTO deal_questions (id, campaign_id, author_id, body, upvotes)
VALUES ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000ac','00000000-0000-0000-0000-000000000001',
        'What keeps the coil superconducting if the cryoplant loses power mid-operation?', 41)
ON CONFLICT DO NOTHING;

INSERT INTO deal_answers (question_id, author_id, body)
VALUES ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000003',
        'The coil quenches safely by design: a copper stabilizer matrix absorbs the stored energy while dump resistors shed the field in under two seconds.')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Closed campaign (Vasca) → SPV with holdings, valuations, tax doc, auction
-- ----------------------------------------------------------------------------
INSERT INTO campaigns (id, startup_id, status, target_amount, raised_amount, price_per_unit, opens_at, closes_at, closed_at)
VALUES ('00000000-0000-0000-0000-0000000000ad','00000000-0000-0000-0000-0000000000ae','closed',
        900000, 900000, 10.00, now() - interval '400 days', now() - interval '340 days', now() - interval '340 days')
ON CONFLICT DO NOTHING;

INSERT INTO spvs (id, campaign_id, legal_name, status, unit_price_initial, total_units, formed_at)
VALUES ('00000000-0000-0000-0000-0000000000af','00000000-0000-0000-0000-0000000000ad',
        'UniVest SPV Series 019 LLC','active',10.00, 90000, now() - interval '335 days')
ON CONFLICT DO NOTHING;

INSERT INTO spv_holdings (spv_id, user_id, units, cost_basis)
VALUES ('00000000-0000-0000-0000-0000000000af','00000000-0000-0000-0000-000000000001',250,2500)
ON CONFLICT DO NOTHING;

INSERT INTO spv_valuations (spv_id, as_of, nav_per_unit)
VALUES
  ('00000000-0000-0000-0000-0000000000af','2026-03-31',11.80),
  ('00000000-0000-0000-0000-0000000000af','2026-06-30',13.25)
ON CONFLICT DO NOTHING;

INSERT INTO tax_documents (user_id, spv_id, tax_year, kind, issued_at)
VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000af',2025,'schedule_k1', now() - interval '120 days')
ON CONFLICT DO NOTHING;

-- A raise awaiting platform review (admin console approval queue)
INSERT INTO campaigns (id, startup_id, status, template, university_equity_pct, target_amount,
                       raised_amount, min_investment, max_investment, price_per_unit, closes_at)
VALUES ('00000000-0000-0000-0000-0000000000b7','00000000-0000-0000-0000-0000000000ae','tto_review','usit',15.00,
        3200000, 0, 100, 5000, 10.00, now() + interval '60 days')
ON CONFLICT DO NOTHING;

INSERT INTO auction_windows (id, spv_id, opens_at, closes_at, status)
VALUES ('00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-0000000000af',
        now() - interval '5 days', now() + interval '2 days', 'open')
ON CONFLICT DO NOTHING;

-- Reference order book (clears at 12.375 / 300u — see clear_auction tests)
INSERT INTO auction_orders (window_id, user_id, side, units, limit_price, created_at)
VALUES
  ('00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-000000000001','buy', 100,13.00, now() - interval '4 days'),
  ('00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-000000000001','buy', 200,12.50, now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-000000000005','buy', 150,12.00, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-000000000002','sell',120,11.50, now() - interval '4 days'),
  ('00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-000000000002','sell',180,12.25, now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000b0','00000000-0000-0000-0000-000000000002','sell',200,12.75, now() - interval '2 days');
