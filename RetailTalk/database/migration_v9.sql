-- Migration V9: Salary management system

-- 1. Add salary column to users (fixed monthly salary, default 0)
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(12,2) NOT NULL DEFAULT 0;

-- 2. Salary payments table (records every payment from admin to staff/manager)
CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    department_id UUID REFERENCES departments(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_month TEXT NOT NULL,  -- 'YYYY-MM' format
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_salary_payments_admin ON salary_payments(admin_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_recipient ON salary_payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_department ON salary_payments(department_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_month ON salary_payments(payment_month);
