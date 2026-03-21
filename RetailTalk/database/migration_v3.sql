-- ===================================================
-- RetailTalk – Migration v3: Departments, Manager Role,
--   Restock Requests, Walk-in Purchase Type
-- Run this on your Supabase SQL editor
-- ===================================================

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add 'manager' to users role CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('buyer', 'seller', 'admin', 'delivery', 'manager'));

-- 3. Add department_id and manager_id columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID;

-- Add foreign keys (use DO block to avoid errors if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_department' AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_department
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_manager' AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_manager
            FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Add purchase_type to product_transactions
ALTER TABLE product_transactions ADD COLUMN IF NOT EXISTS purchase_type TEXT NOT NULL DEFAULT 'delivery';

-- Add CHECK constraint for purchase_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE column_name = 'purchase_type' AND table_name = 'product_transactions'
        AND constraint_name = 'product_transactions_purchase_type_check'
    ) THEN
        ALTER TABLE product_transactions ADD CONSTRAINT product_transactions_purchase_type_check
            CHECK (purchase_type IN ('walkin', 'delivery'));
    END IF;
END $$;

-- 5. Update product_transactions status CHECK to include walk-in statuses
ALTER TABLE product_transactions DROP CONSTRAINT IF EXISTS product_transactions_status_check;
ALTER TABLE product_transactions ADD CONSTRAINT product_transactions_status_check
    CHECK (status IN (
        'pending', 'approved', 'ondeliver', 'delivered', 'undelivered', 'cancelled',
        'pending_walkin', 'inwork', 'ready', 'picked_up', 'completed'
    ));

-- 6. Create restock_requests table
CREATE TABLE IF NOT EXISTS restock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    product_id UUID NOT NULL REFERENCES products(id),
    requested_quantity INT NOT NULL CHECK (requested_quantity > 0),
    approved_quantity INT,
    notes TEXT DEFAULT '',
    manager_notes TEXT DEFAULT '',
    delivery_notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending_manager'
        CHECK (status IN (
            'pending_manager',
            'approved_manager',
            'rejected_manager',
            'accepted_delivery',
            'in_transit',
            'delivered',
            'cancelled'
        )),
    delivery_user_id UUID REFERENCES users(id),
    manager_approved_at TIMESTAMPTZ,
    delivery_accepted_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. New indexes
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_staff ON restock_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_department ON restock_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);
CREATE INDEX IF NOT EXISTS idx_restock_requests_delivery ON restock_requests(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_product_transactions_purchase_type ON product_transactions(purchase_type);
