-- ============================================================================
-- UniVest — database assertions (run after schema.sql + seed.sql on a fresh DB)
--   psql -d univest -v ON_ERROR_STOP=1 -f backend/db/tests.sql
-- Any failed ASSERT aborts with a non-zero exit, failing CI.
-- ============================================================================

DO $$
DECLARE
    v_price   NUMERIC;
    v_units   NUMERIC;
    v_raised  NUMERIC;
    v_status  TEXT;
    v_blocked BOOLEAN := FALSE;
BEGIN
    ------------------------------------------------------------------
    -- 1. Batch-auction clearing on the seeded reference book
    ------------------------------------------------------------------
    SELECT o_price, o_units INTO v_price, v_units
      FROM clear_auction('00000000-0000-0000-0000-0000000000b0');
    ASSERT v_price = 12.375 AND v_units = 300,
        format('clear_auction mismatch: price=%s units=%s (want 12.375/300)', v_price, v_units);

    -- Fill pattern: aggressive orders filled, marginal orders untouched
    SELECT status INTO v_status FROM auction_orders
     WHERE window_id = '00000000-0000-0000-0000-0000000000b0'
       AND side = 'buy' AND limit_price = 12.00;
    ASSERT v_status = 'unfilled', 'marginal 12.00 bid should be unfilled, got ' || v_status;

    ------------------------------------------------------------------
    -- 2. Investment insert: fee-bearing row, raised_amount trigger,
    --    cooling-off stamp
    ------------------------------------------------------------------
    INSERT INTO investments (id, campaign_id, investor_id, status, amount, admin_fee_amount)
    VALUES ('00000000-0000-0000-0000-00000000dead',
            '00000000-0000-0000-0000-0000000000ac',
            '00000000-0000-0000-0000-000000000001', 'escrowed', 1000.00, 15.00);

    SELECT raised_amount INTO v_raised
      FROM campaigns WHERE id = '00000000-0000-0000-0000-0000000000ac';
    ASSERT v_raised = 1000.00, 'raised_amount trigger failed: ' || v_raised;

    PERFORM 1 FROM investments
      WHERE id = '00000000-0000-0000-0000-00000000dead' AND cancellable_until IS NOT NULL;
    ASSERT FOUND, 'cancellable_until was not stamped on insert';

    ------------------------------------------------------------------
    -- 3. Cooling-off: open-window cancel allowed, late cancel rejected
    ------------------------------------------------------------------
    UPDATE investments SET status = 'cancelled'
     WHERE id = '00000000-0000-0000-0000-00000000dead';
    SELECT status INTO v_status FROM investments
     WHERE id = '00000000-0000-0000-0000-00000000dead';
    ASSERT v_status = 'cancelled', 'open-window cancellation failed';

    -- Rewind into the closed window and try again
    UPDATE investments
       SET status = 'escrowed', cancelled_at = NULL,
           cancellable_until = now() - INTERVAL '1 hour'
     WHERE id = '00000000-0000-0000-0000-00000000dead';
    BEGIN
        UPDATE investments SET status = 'cancelled'
         WHERE id = '00000000-0000-0000-0000-00000000dead';
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'late cancellation was NOT rejected by the trigger';

    ------------------------------------------------------------------
    -- 4. Views exist and compute
    ------------------------------------------------------------------
    PERFORM 1 FROM university_leaderboard WHERE capital_raised IS NOT NULL;
    ASSERT FOUND, 'university_leaderboard returned nothing';

    ------------------------------------------------------------------
    -- 5. Verifiable-credential table + FK to attestations
    ------------------------------------------------------------------
    INSERT INTO attestation_credentials (attestation_id, credential, vc_hash, anchor_ref)
    SELECT id, '{"demo":true}'::jsonb, decode('aa','hex'), 'demo:0xtest'
      FROM milestone_attestations LIMIT 1;
    PERFORM 1 FROM attestation_credentials WHERE anchor_chain = 'demo-ledger';
    ASSERT FOUND, 'attestation_credentials default anchor_chain missing';

    ------------------------------------------------------------------
    -- 6. Prediction ledger + reliability view (the data flywheel)
    ------------------------------------------------------------------
    SELECT observed_freq INTO v_price
      FROM model_reliability
     WHERE model = 'slip' AND bucket = 9;  -- the 0.80 predictions
    -- 16 of 20 outcomes are 1 → observed 0.8 for the high-confidence band.
    ASSERT v_price = 0.80, 'reliability view mis-computed observed_freq: ' || COALESCE(v_price::text, 'NULL');

    ------------------------------------------------------------------
    -- 7. University OS: portfolio rollup + cap-table CHECK + consortia
    ------------------------------------------------------------------
    -- MIT: Helion 18.5M*12% + Photoniq 62M*8% + Aeon 21M*12%
    --      = 2.22M + 4.96M + 2.52M = 9.70M university equity value.
    SELECT university_equity_value INTO v_raised
      FROM university_portfolio_value
     WHERE university_id = '00000000-0000-0000-0000-0000000000aa';
    ASSERT v_raised = 9700000, 'university_equity_value wrong: ' || COALESCE(v_raised::text, 'NULL');

    -- Cap-table CHECK must reject a table that does not sum to 100.
    v_blocked := FALSE;
    BEGIN
        INSERT INTO tto_portfolio_companies
          (university_id, name, vertical, stage, pct_founders, pct_university, pct_option_pool, pct_investors)
        VALUES ('00000000-0000-0000-0000-0000000000aa','Bad Co','X','Seed',50,10,10,10); -- sums to 80
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'cap-table sum CHECK did not reject an invalid split';

    -- Consortium is genuinely cross-university (lead is a member).
    PERFORM 1 FROM consortium_members
      WHERE consortium_id = '00000000-0000-0000-0000-0000000000e1'
        AND university_id = '00000000-0000-0000-0000-0000000000aa';
    ASSERT FOUND, 'consortium lead is not recorded as a member';

    ------------------------------------------------------------------
    -- 8. Scientific diligence: FTO clearance view + replication
    ------------------------------------------------------------------
    -- Helion: 2 owned, 0 blocking, 1 adjacent → 100 − 0 − 6 = 94.
    SELECT clearance_score INTO v_raised
      FROM startup_fto_clearance WHERE startup_id = '00000000-0000-0000-0000-0000000000ab';
    ASSERT v_raised = 94, 'FTO clearance view wrong: ' || COALESCE(v_raised::text, 'NULL');

    -- At least one milestone independently replicated.
    PERFORM 1 FROM replication_studies
      WHERE startup_id = '00000000-0000-0000-0000-0000000000ab' AND status = 'replicated';
    ASSERT FOUND, 'expected a replicated study for Helion';

    ------------------------------------------------------------------
    -- 9. Investor passport: table + one-active-passport supersession
    ------------------------------------------------------------------
    INSERT INTO investor_passports (user_id, credential, vc_hash)
    VALUES ('00000000-0000-0000-0000-000000000001', '{"type":["InvestorPassportCredential"]}'::jsonb, decode('aa','hex'));
    -- Re-issue: supersede the prior active passport (mirror the service logic).
    UPDATE investor_passports SET revoked_at = now()
     WHERE user_id = '00000000-0000-0000-0000-000000000001' AND revoked_at IS NULL;
    INSERT INTO investor_passports (user_id, credential, vc_hash)
    VALUES ('00000000-0000-0000-0000-000000000001', '{"type":["InvestorPassportCredential"],"v":2}'::jsonb, decode('bb','hex'));
    SELECT COUNT(*) INTO v_raised FROM investor_passports
     WHERE user_id = '00000000-0000-0000-0000-000000000001' AND revoked_at IS NULL;
    ASSERT v_raised = 1, 'expected exactly one active passport, got ' || v_raised;

    ------------------------------------------------------------------
    -- 10. Embedded infrastructure: API-key lookup by digest + SPV
    --     partner scoping + external_ref uniqueness
    ------------------------------------------------------------------
    -- The guard authenticates by hashing the presented key — never a stored
    -- secret. The seeded 'sk_test_univest_demo' must resolve to Accelerate Labs.
    PERFORM 1 FROM platform_partners
      WHERE api_key_hash = digest('sk_test_univest_demo','sha256')
        AND name = 'Accelerate Labs' AND active;
    ASSERT FOUND, 'demo API key did not resolve to its partner';

    -- The seeded partner already owns exactly one SPV.
    SELECT COUNT(*) INTO v_raised FROM platform_spvs
     WHERE partner_id = '00000000-0000-0000-0000-0000000000f1';
    ASSERT v_raised = 1, 'expected one platform SPV for the demo partner, got ' || v_raised;

    -- external_ref is unique per partner: re-using it must be rejected.
    v_blocked := FALSE;
    BEGIN
        INSERT INTO platform_spvs (partner_id, external_ref, company_name, target_amount)
        VALUES ('00000000-0000-0000-0000-0000000000f1','cohort-24-photonics','Dup Co',1000000);
    EXCEPTION WHEN unique_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'duplicate (partner_id, external_ref) was not rejected';

    -- A positive target is enforced.
    v_blocked := FALSE;
    BEGIN
        INSERT INTO platform_spvs (partner_id, external_ref, company_name, target_amount)
        VALUES ('00000000-0000-0000-0000-0000000000f1','bad-target','Zero Co',0);
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'non-positive target_amount was not rejected';

    ------------------------------------------------------------------
    -- 11. Angel investors: accreditation, early-access window,
    --     lead uniqueness + carry bound
    ------------------------------------------------------------------
    -- The seeded angel is accredited and active.
    PERFORM 1 FROM angel_profiles p JOIN users u ON u.id = p.user_id
      WHERE p.user_id = '00000000-0000-0000-0000-000000000001'
        AND p.status = 'active' AND u.accreditation <> 'none';
    ASSERT FOUND, 'seeded angel is not active/accredited';

    -- The tto_review deal is inside its angel-only early-access window.
    PERFORM 1 FROM angel_deals
      WHERE campaign_id = '00000000-0000-0000-0000-0000000000b7'
        AND opens_to_angels_at <= now() AND public_opens_at > now();
    ASSERT FOUND, 'angel early-access window is not open on the seeded deal';

    -- One lead per (campaign, angel): a second lead by the same angel is rejected.
    v_blocked := FALSE;
    BEGIN
        INSERT INTO spv_leads (campaign_id, angel_user_id, committed_amount)
        VALUES ('00000000-0000-0000-0000-0000000000b7','00000000-0000-0000-0000-000000000001', 10000);
    EXCEPTION WHEN unique_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'duplicate (campaign, angel) lead was not rejected';

    -- Carry is bounded to [0, 30].
    v_blocked := FALSE;
    BEGIN
        INSERT INTO spv_leads (campaign_id, angel_user_id, committed_amount, carry_pct)
        VALUES ('00000000-0000-0000-0000-0000000000ac','00000000-0000-0000-0000-000000000001', 10000, 45);
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'out-of-range carry_pct was not rejected';

    ------------------------------------------------------------------
    -- 12. Secondary market: generated total_price, no self-trade,
    --     tender fill bound
    ------------------------------------------------------------------
    -- The seeded listing's total_price is generated (100 × 13.50).
    SELECT total_price INTO v_raised FROM secondary_trades
     WHERE id = '00000000-0000-0000-0000-0000000000f4';
    ASSERT v_raised = 1350.00, 'secondary total_price mis-generated: ' || COALESCE(v_raised::text, 'NULL');

    -- A buyer cannot be the seller.
    v_blocked := FALSE;
    BEGIN
        INSERT INTO secondary_trades (spv_id, seller_id, buyer_id, units, price_per_unit)
        VALUES ('00000000-0000-0000-0000-0000000000af',
                '00000000-0000-0000-0000-000000000001',
                '00000000-0000-0000-0000-000000000001', 10, 13.00);
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'self-trade was not rejected';

    -- A tender cannot be filled beyond its cap.
    v_blocked := FALSE;
    BEGIN
        UPDATE tender_offers SET filled_units = max_units + 1
         WHERE id = '00000000-0000-0000-0000-0000000000f5';
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'tender over-fill was not rejected';

    ------------------------------------------------------------------
    -- 13. Tax lots: sum to the holding, positive units, disposal order
    ------------------------------------------------------------------
    -- Alice's lots for the Vasca SPV sum to her 250-unit holding.
    SELECT SUM(units) INTO v_raised FROM tax_lots
     WHERE user_id = '00000000-0000-0000-0000-000000000001'
       AND spv_id = '00000000-0000-0000-0000-0000000000af';
    ASSERT v_raised = 250, 'tax lots do not sum to the holding: ' || COALESCE(v_raised::text, 'NULL');

    -- Zero-unit lot rejected.
    v_blocked := FALSE;
    BEGIN
        INSERT INTO tax_lots (user_id, spv_id, acquired_on, units, cost_basis)
        VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000af','2025-01-01',0,0);
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'zero-unit tax lot was not rejected';

    -- Disposal before acquisition rejected.
    v_blocked := FALSE;
    BEGIN
        INSERT INTO tax_lots (user_id, spv_id, acquired_on, units, cost_basis, disposed_on)
        VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000af','2025-06-01',10,100,'2025-01-01');
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'disposal-before-acquisition was not rejected';

    ------------------------------------------------------------------
    -- 14. Diligence copilot: data-room grounding corpus + cited exchange
    ------------------------------------------------------------------
    -- The Helion live campaign has an indexed data room to answer from.
    SELECT COUNT(*) INTO v_raised FROM data_room_documents
     WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac'
       AND excerpt IS NOT NULL AND array_length(keywords, 1) > 0;
    ASSERT v_raised = 4, 'expected 4 grounded data-room docs for Helion, got ' || COALESCE(v_raised::text, 'NULL');

    -- Keyword index is queryable (lexical retrieval boost source).
    SELECT COUNT(*) INTO v_raised FROM data_room_documents
     WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac'
       AND 'patent' = ANY (keywords);
    ASSERT v_raised = 1, 'expected 1 patent-tagged data-room doc, got ' || COALESCE(v_raised::text, 'NULL');

    -- A copilot exchange persists its answer with cited sources (JSONB).
    INSERT INTO copilot_exchanges (user_id, campaign_id, question, answer, citations, model)
    VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000ac',
            'What is the patent situation?',
            'From the data room: MIT grants an exclusive license to the 11-patent HTS coil family.',
            '[{"kind":"document","ref":"Exclusive License Agreement","section":"§2.1 Field of Use"},
              {"kind":"graph","ref":"Knowledge Graph","section":"Helion → MIT"}]'::jsonb,
            'grounded-retrieval/v1');
    SELECT jsonb_array_length(citations) INTO v_raised FROM copilot_exchanges
     WHERE user_id = '00000000-0000-0000-0000-000000000001'
       AND campaign_id = '00000000-0000-0000-0000-0000000000ac'
     ORDER BY created_at DESC LIMIT 1;
    ASSERT v_raised = 2, 'copilot exchange did not round-trip 2 citations, got ' || COALESCE(v_raised::text, 'NULL');

    ------------------------------------------------------------------
    -- 15. Milestone-tranched escrow: schedule integrity + gated release
    ------------------------------------------------------------------
    -- Helion's tranches partition the whole envelope.
    SELECT SUM(release_pct) INTO v_raised FROM escrow_tranches
     WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac';
    ASSERT v_raised = 100, 'escrow tranches do not sum to 100%: ' || COALESCE(v_raised::text, 'NULL');

    -- The summary view splits released vs held against the $2.5M envelope.
    SELECT released_amount INTO v_raised FROM campaign_escrow_summary
     WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac';
    ASSERT v_raised = 750000, 'released escrow amount wrong: ' || COALESCE(v_raised::text, 'NULL');
    SELECT held_amount INTO v_raised FROM campaign_escrow_summary
     WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac';
    ASSERT v_raised = 1750000, 'held escrow amount wrong: ' || COALESCE(v_raised::text, 'NULL');

    -- Releasing a tranche whose milestone is not attested is rejected.
    v_blocked := FALSE;
    BEGIN
        UPDATE escrow_tranches SET status = 'released'
         WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac' AND position = 2;
    EXCEPTION WHEN check_violation THEN
        v_blocked := TRUE;
    END;
    ASSERT v_blocked, 'escrow release of an unattested milestone was not rejected';

    -- The on-close (NULL-milestone) tranche releases freely and stamps its time.
    UPDATE escrow_tranches SET status = 'released', released_amount = 750000
     WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac' AND position = 3;
    SELECT COUNT(*) INTO v_raised FROM escrow_tranches
     WHERE campaign_id = '00000000-0000-0000-0000-0000000000ac'
       AND position = 3 AND status = 'released' AND released_at IS NOT NULL;
    ASSERT v_raised = 1, 'on-close tranche release did not stamp released_at';

    RAISE NOTICE 'ALL DATABASE ASSERTIONS PASSED';
END $$;
