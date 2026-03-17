-- ============================================================
-- A² Compass — Phase 1 Week 3: Stripe Billing Schema
-- ============================================================

-- Stripe products linked to enrollment types
CREATE TABLE IF NOT EXISTS stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_type_id UUID NOT NULL REFERENCES enrollment_types(id),
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_price_id_one_time TEXT,
  price_monthly NUMERIC(10,2),
  price_yearly NUMERIC(10,2),
  price_one_time NUMERIC(10,2),
  currency TEXT DEFAULT 'usd',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stripe customer records
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Payment history
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id),
  student_enrollment_id UUID REFERENCES student_enrollments(id),
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  amount INTEGER NOT NULL,  -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook event log (for idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scholarships / free access overrides
CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id),
  granted_by UUID REFERENCES auth.users(id),
  reason TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_products_enrollment ON stripe_products(enrollment_type_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_parent ON payment_history(parent_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_enrollment ON payment_history(student_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_student ON scholarships(student_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_stripe_products_updated ON stripe_products;
CREATE TRIGGER set_stripe_products_updated BEFORE UPDATE ON stripe_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;

-- Stripe products: everyone can read active products
CREATE POLICY "Anyone can view active products"
  ON stripe_products FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage products"
  ON stripe_products FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Stripe customers: users see their own
CREATE POLICY "Users see own customer record"
  ON stripe_customers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages customers"
  ON stripe_customers FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Payment history: parents see their own, admins see all
CREATE POLICY "Parents see own payments"
  ON payment_history FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Admins see all payments"
  ON payment_history FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Webhook events: admin only
CREATE POLICY "Admins manage webhooks"
  ON stripe_webhook_events FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Scholarships: admins manage, teachers view
CREATE POLICY "Admins manage scholarships"
  ON scholarships FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Teachers view scholarships"
  ON scholarships FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher');

-- Seed placeholder Stripe products (prices TBD by Sandra)
INSERT INTO stripe_products (enrollment_type_id, price_monthly, price_yearly, price_one_time, is_active) 
SELECT et.id, 
  CASE et.slug 
    WHEN 'full-time' THEN 299.00
    WHEN 'tutoring' THEN 75.00
    WHEN 'summer-program' THEN NULL
    WHEN 'a-la-carte' THEN NULL
  END,
  CASE et.slug 
    WHEN 'full-time' THEN 2990.00
    WHEN 'tutoring' THEN 750.00
    WHEN 'summer-program' THEN NULL
    WHEN 'a-la-carte' THEN NULL
  END,
  CASE et.slug 
    WHEN 'full-time' THEN NULL
    WHEN 'tutoring' THEN 75.00
    WHEN 'summer-program' THEN 499.00
    WHEN 'a-la-carte' THEN 149.00
  END,
  true
FROM enrollment_types et
ON CONFLICT DO NOTHING;
