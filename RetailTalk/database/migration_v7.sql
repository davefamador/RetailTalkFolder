-- Migration V7: Department balances & Admin withdrawal system
-- Removes automatic admin commission; 100% of revenue goes to department balance.
-- Admin can manually withdraw from department balances.

-- 1. Store-level balance pool
CREATE TABLE IF NOT EXISTS department_balances (
    department_id UUID PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0
);

-- 2. Admin withdrawal audit trail
CREATE TABLE IF NOT EXISTS admin_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_withdrawals_department ON admin_withdrawals(department_id);
CREATE INDEX IF NOT EXISTS idx_admin_withdrawals_created ON admin_withdrawals(created_at);

-- 3. Seed existing departments with 0 balance
INSERT INTO department_balances (department_id, balance)
SELECT id, 0 FROM departments
ON CONFLICT (department_id) DO NOTHING;
