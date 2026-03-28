-- Migration V6: Add wishlist_items table
-- Allows buyers to save products to their wishlist

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_buyer ON wishlist_items(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items(product_id);
