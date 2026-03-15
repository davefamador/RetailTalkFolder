-- ===================================================
-- RetailTalk – Database Schema (Supabase / PostgreSQL)
-- ===================================================

-- 0. Enable pgvector for embedding search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin', 'delivery')),
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Balances (wallet)
CREATE TABLE IF NOT EXISTS user_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0
);

-- 3. User Contacts (phone numbers for buyers and delivery users)
CREATE TABLE IF NOT EXISTS user_contacts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    contact_number TEXT NOT NULL
);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    stock INT NOT NULL DEFAULT 0,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    images TEXT[] DEFAULT '{}',
    embedding vector(768),
    is_active BOOLEAN DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'unapproved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tracking_number TEXT DEFAULT NULL
);

-- 5. Cart Items (buyer shopping cart)
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, product_id)
);

-- 6. Product Transactions (purchases)
CREATE TABLE IF NOT EXISTS product_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    amount DECIMAL(12,2) NOT NULL,
    seller_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    admin_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    delivery_user_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'ondeliver' CHECK (status IN ('ondeliver', 'delivered', 'undelivered', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Delivery Earnings (delivery user income per delivery)
CREATE TABLE IF NOT EXISTS delivery_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID NOT NULL REFERENCES product_transactions(id),
    amount DECIMAL(12,2) NOT NULL DEFAULT 90.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Stored Value Facility (deposit/withdrawal history)
CREATE TABLE IF NOT EXISTS stored_value (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. User Prompts (for search AI Insights & dynamically collected queries)
CREATE TABLE IF NOT EXISTS user_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    prompt_text TEXT NOT NULL,
    source TEXT DEFAULT 'search',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- INDEXES
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_product_transactions_buyer ON product_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_product_transactions_seller ON product_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_transactions_product ON product_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_transactions_status ON product_transactions(status);
CREATE INDEX IF NOT EXISTS idx_product_transactions_delivery ON product_transactions(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_buyer ON cart_items(buyer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_earnings_user ON delivery_earnings(delivery_user_id);
