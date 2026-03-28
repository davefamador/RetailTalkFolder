-- Migration V8: Remove store balance flow, add admin earnings, add product pending_removal

-- 1. Add 'pending_removal' to product status constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
    CHECK (status IN ('pending', 'approved', 'unapproved', 'pending_removal'));

-- 2. Removal tracking columns on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS removal_requested_by UUID REFERENCES users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS removal_requested_at TIMESTAMPTZ;

-- 3. Admin earnings table (credited when transactions succeed)
CREATE TABLE IF NOT EXISTS admin_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES product_transactions(id),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_earnings_created ON admin_earnings(created_at);
