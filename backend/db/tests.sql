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

    RAISE NOTICE 'ALL DATABASE ASSERTIONS PASSED';
END $$;
