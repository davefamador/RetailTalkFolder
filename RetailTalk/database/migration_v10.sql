-- Migration V10: Change user FKs to ON DELETE SET NULL so deleting a user
-- preserves all financial/transaction history instead of cascading deletes.

-- product_transactions: buyer_id, seller_id (NOT NULL → nullable + SET NULL)
ALTER TABLE product_transactions DROP CONSTRAINT IF EXISTS product_transactions_buyer_id_fkey;
ALTER TABLE product_transactions ALTER COLUMN buyer_id DROP NOT NULL;
ALTER TABLE product_transactions ADD CONSTRAINT product_transactions_buyer_id_fkey
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE product_transactions DROP CONSTRAINT IF EXISTS product_transactions_seller_id_fkey;
ALTER TABLE product_transactions ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE product_transactions ADD CONSTRAINT product_transactions_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL;

-- product_transactions: delivery_user_id (already nullable, just add SET NULL)
ALTER TABLE product_transactions DROP CONSTRAINT IF EXISTS product_transactions_delivery_user_id_fkey;
ALTER TABLE product_transactions ADD CONSTRAINT product_transactions_delivery_user_id_fkey
    FOREIGN KEY (delivery_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- delivery_earnings: delivery_user_id (NOT NULL → nullable + SET NULL)
ALTER TABLE delivery_earnings DROP CONSTRAINT IF EXISTS delivery_earnings_delivery_user_id_fkey;
ALTER TABLE delivery_earnings ALTER COLUMN delivery_user_id DROP NOT NULL;
ALTER TABLE delivery_earnings ADD CONSTRAINT delivery_earnings_delivery_user_id_fkey
    FOREIGN KEY (delivery_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- restock_requests: staff_id (NOT NULL → nullable + SET NULL)
ALTER TABLE restock_requests DROP CONSTRAINT IF EXISTS restock_requests_staff_id_fkey;
ALTER TABLE restock_requests ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE restock_requests ADD CONSTRAINT restock_requests_staff_id_fkey
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL;

-- restock_requests: delivery_user_id (already nullable, just add SET NULL)
ALTER TABLE restock_requests DROP CONSTRAINT IF EXISTS restock_requests_delivery_user_id_fkey;
ALTER TABLE restock_requests ADD CONSTRAINT restock_requests_delivery_user_id_fkey
    FOREIGN KEY (delivery_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- salary_payments: recipient_id, admin_id (NOT NULL → nullable + SET NULL)
ALTER TABLE salary_payments DROP CONSTRAINT IF EXISTS salary_payments_recipient_id_fkey;
ALTER TABLE salary_payments ALTER COLUMN recipient_id DROP NOT NULL;
ALTER TABLE salary_payments ADD CONSTRAINT salary_payments_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE salary_payments DROP CONSTRAINT IF EXISTS salary_payments_admin_id_fkey;
ALTER TABLE salary_payments ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE salary_payments ADD CONSTRAINT salary_payments_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- admin_withdrawals: admin_id (NOT NULL → nullable + SET NULL)
ALTER TABLE admin_withdrawals DROP CONSTRAINT IF EXISTS admin_withdrawals_admin_id_fkey;
ALTER TABLE admin_withdrawals ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE admin_withdrawals ADD CONSTRAINT admin_withdrawals_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- products: seller_id — change from CASCADE to SET NULL so products survive seller deletion
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
ALTER TABLE products ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE products ADD CONSTRAINT products_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL;
