ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'RAZORPAY';
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('RAZORPAY','CASH'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES admin_users(id) ON DELETE SET NULL;
