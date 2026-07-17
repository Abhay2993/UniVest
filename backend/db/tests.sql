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

    RAISE NOTICE 'ALL DATABASE ASSERTIONS PASSED';
END $$;
