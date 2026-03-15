-- ===================================================
-- RetailTalk – Migration v2: Cart, Delivery, Contacts
-- Run this on your Supabase SQL editor
-- ===================================================

-- 1. Create user_contacts table
CREATE TABLE IF NOT EXISTS user_contacts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    contact_number TEXT NOT NULL
);

-- 2. Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, product_id)
);

-- 3. Add delivery columns to product_transactions
ALTER TABLE product_transactions
    ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE product_transactions
    ADD COLUMN IF NOT EXISTS delivery_user_id UUID REFERENCES users(id);

-- 4. Update product_transactions status CHECK constraint
ALTER TABLE product_transactions DROP CONSTRAINT IF EXISTS product_transactions_status_check;
ALTER TABLE product_transactions ADD CONSTRAINT product_transactions_status_check
    CHECK (status IN ('ongoing', 'approved', 'ondeliver', 'delivered', 'undelivered', 'pending', 'completed', 'cancelled', 'refunded'));

-- 5. Update default status to 'ongoing'
ALTER TABLE product_transactions ALTER COLUMN status SET DEFAULT 'ongoing';

-- 6. Create delivery_earnings table
CREATE TABLE IF NOT EXISTS delivery_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID NOT NULL REFERENCES product_transactions(id),
    amount DECIMAL(12,2) NOT NULL DEFAULT 90.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add indexes
CREATE INDEX IF NOT EXISTS idx_product_transactions_status ON product_transactions(status);
CREATE INDEX IF NOT EXISTS idx_product_transactions_delivery ON product_transactions(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_buyer ON cart_items(buyer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_earnings_user ON delivery_earnings(delivery_user_id);

-- 8. Rename user_prompts.prompt to prompt_text if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_prompts' AND column_name = 'prompt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_prompts' AND column_name = 'prompt_text'
    ) THEN
        ALTER TABLE user_prompts RENAME COLUMN prompt TO prompt_text;
    END IF;
END $$;
