-- ===================================================
-- RetailTalk – Migration v4: Add 'pending' and 'approved'
--   statuses for delivery order preparation flow
-- Run this on your Supabase SQL editor
-- ===================================================

-- 1. Update product_transactions status CHECK to include 'pending' and 'approved'
--    New delivery flow: pending -> approved -> ondeliver -> delivered
ALTER TABLE product_transactions DROP CONSTRAINT IF EXISTS product_transactions_status_check;
ALTER TABLE product_transactions ADD CONSTRAINT product_transactions_status_check
    CHECK (status IN (
        'pending', 'approved',
        'ondeliver', 'delivered', 'undelivered', 'cancelled',
        'pending_walkin', 'inwork', 'ready', 'completed'
    ));

-- 2. Update default status from 'ondeliver' to 'pending'
ALTER TABLE product_transactions ALTER COLUMN status SET DEFAULT 'pending';
