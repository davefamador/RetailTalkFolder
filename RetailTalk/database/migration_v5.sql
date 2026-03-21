-- ===================================================
-- RetailTalk – Migration v5: Add delivery_address
-- Stores buyer delivery address on user profile and per transaction
-- Run this on your Supabase SQL editor
-- ===================================================

-- 1. Add delivery_address to user_contacts (buyer's saved address)
ALTER TABLE user_contacts ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT '';

-- 2. Add delivery_address to product_transactions (address at time of purchase)
ALTER TABLE product_transactions ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT '';
