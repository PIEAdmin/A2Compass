-- ============================================================
-- A² Compass — Migration 003: Finalized Pricing, Founders' Rate & Family Discounts
-- ============================================================

-- ============================================================
-- 1. PRICING PACKAGES TABLE (handles hourly, packages, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_type_id UUID NOT NULL REFERENCES enrollment_types(id),
  name TEXT NOT NULL,               -- e.g. "Monthly", "Annual", "5-Hour Package"
  slug TEXT NOT NULL UNIQUE,        -- e.g. "fulltime-monthly", "tutoring-5hr"
  billing_type TEXT NOT NULL CHECK (billing_type IN ('recurring', 'one_time', 'package')),
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year', NULL)),
  price NUMERIC(10,2) NOT NULL,     -- price in dollars
  unit_label TEXT,                   -- e.g. "per hour", "per course", "per student"
  unit_count INTEGER,                -- e.g. 5 for 5-hour package
  effective_rate NUMERIC(10,2),      -- e.g. $28/hr for the 5-hour package
  stripe_price_id TEXT,              -- will be set when Stripe is connected
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_packages_enrollment ON pricing_packages(enrollment_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_packages_slug ON pricing_packages(slug);

DROP TRIGGER IF EXISTS set_pricing_packages_updated ON pricing_packages;
CREATE TRIGGER set_pricing_packages_updated BEFORE UPDATE ON pricing_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pricing_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active packages" ON pricing_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage packages" ON pricing_packages FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- 2. FOUNDERS' RATE SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS founders_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  founders_number INTEGER NOT NULL,  -- 1-10, order they signed up
  rate_locked_at TIMESTAMPTZ DEFAULT now(),
  rate_lock_pricing JSONB NOT NULL,  -- snapshot of prices at lock time
  is_active BOOLEAN DEFAULT true,    -- false = enrollment lapsed, rate lost
  continuous_since DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id),
  CONSTRAINT founders_limit CHECK (founders_number BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_founders_parent ON founders_accounts(parent_id);

DROP TRIGGER IF EXISTS set_founders_updated ON founders_accounts;
CREATE TRIGGER set_founders_updated BEFORE UPDATE ON founders_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE founders_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents see own founders status" ON founders_accounts FOR SELECT
  USING (parent_id = auth.uid());
CREATE POLICY "Admins manage founders" ON founders_accounts FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- 3. FAMILY DISCOUNT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS family_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id),
  child_order INTEGER NOT NULL,       -- 1 = first child (no discount), 2 = second, 3+ = third
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0, 25, or 50
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_family_discounts_parent ON family_discounts(family_parent_id);

DROP TRIGGER IF EXISTS set_family_discounts_updated ON family_discounts;
CREATE TRIGGER set_family_discounts_updated BEFORE UPDATE ON family_discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE family_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents see own discounts" ON family_discounts FOR SELECT
  USING (family_parent_id = auth.uid());
CREATE POLICY "Admins manage discounts" ON family_discounts FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- 4. FUNCTION: Calculate family discount for a child
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_family_discount(
  p_parent_id UUID,
  p_student_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_child_count INTEGER;
  v_child_order INTEGER;
  v_discount NUMERIC(5,2);
BEGIN
  -- Count existing full-time enrolled children for this parent
  SELECT COUNT(*) INTO v_child_count
  FROM student_enrollments se
  JOIN student_profiles sp ON se.student_id = sp.id
  JOIN enrollment_types et ON se.enrollment_type_id = et.id
  WHERE sp.parent_id = p_parent_id
    AND et.slug = 'full-time'
    AND se.status = 'active';
  
  -- This child would be next in line
  v_child_order := v_child_count + 1;
  
  -- Apply discount tiers (Full-Time only)
  IF v_child_order = 1 THEN
    v_discount := 0;
  ELSIF v_child_order = 2 THEN
    v_discount := 25;
  ELSE
    v_discount := 50;
  END IF;
  
  -- Insert/update the family_discounts record
  INSERT INTO family_discounts (family_parent_id, student_id, child_order, discount_percent)
  VALUES (p_parent_id, p_student_id, v_child_order, v_discount)
  ON CONFLICT (family_parent_id, student_id) 
  DO UPDATE SET child_order = v_child_order, discount_percent = v_discount, updated_at = now();
  
  RETURN v_discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. FUNCTION: Check if account is Founders and get locked price
-- ============================================================
CREATE OR REPLACE FUNCTION get_effective_price(
  p_parent_id UUID,
  p_package_slug TEXT,
  p_child_order INTEGER DEFAULT 1
) RETURNS NUMERIC AS $$
DECLARE
  v_base_price NUMERIC;
  v_founders_price NUMERIC;
  v_discount NUMERIC;
  v_final_price NUMERIC;
BEGIN
  -- Check for Founders' rate first
  SELECT (fa.rate_lock_pricing ->> p_package_slug)::NUMERIC
  INTO v_founders_price
  FROM founders_accounts fa
  WHERE fa.parent_id = p_parent_id
    AND fa.is_active = true;
  
  -- Get standard price
  SELECT pp.price INTO v_base_price
  FROM pricing_packages pp
  WHERE pp.slug = p_package_slug AND pp.is_active = true;
  
  -- Use founders' rate if available, otherwise standard
  v_final_price := COALESCE(v_founders_price, v_base_price);
  
  -- Apply family discount (Full-Time only)
  IF p_package_slug LIKE 'fulltime-%' AND p_child_order >= 2 THEN
    IF p_child_order = 2 THEN
      v_discount := 0.25;
    ELSE
      v_discount := 0.50;
    END IF;
    v_final_price := v_final_price * (1 - v_discount);
  END IF;
  
  RETURN ROUND(v_final_price, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. UPDATE EXISTING STRIPE PRODUCTS WITH REAL PRICING
-- ============================================================
UPDATE stripe_products SET
  price_monthly = 175.00,
  price_yearly = 1750.00,
  price_one_time = NULL
WHERE enrollment_type_id = (SELECT id FROM enrollment_types WHERE slug = 'full-time');

UPDATE stripe_products SET
  price_monthly = NULL,
  price_yearly = NULL,
  price_one_time = 30.00
WHERE enrollment_type_id = (SELECT id FROM enrollment_types WHERE slug = 'tutoring');

UPDATE stripe_products SET
  price_monthly = 125.00,
  price_yearly = NULL,
  price_one_time = 450.00
WHERE enrollment_type_id = (SELECT id FROM enrollment_types WHERE slug = 'summer-program');

UPDATE stripe_products SET
  price_monthly = NULL,
  price_yearly = NULL,
  price_one_time = 60.00
WHERE enrollment_type_id = (SELECT id FROM enrollment_types WHERE slug = 'a-la-carte');

-- ============================================================
-- 7. SEED DETAILED PRICING PACKAGES
-- ============================================================

-- Full-Time packages
INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, description, sort_order)
SELECT et.id, 'Monthly', 'fulltime-monthly', 'recurring', 'month', 175.00, 'per student/month',
  'Full daily attendance, all subjects, teacher check-ins, 6-week report cards, all platform features', 1
FROM enrollment_types et WHERE et.slug = 'full-time'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, description, sort_order)
SELECT et.id, 'Annual (2 months free)', 'fulltime-annual', 'recurring', 'year', 1750.00, 'per student/year',
  'Full annual enrollment — save $350 (2 months free)', 2
FROM enrollment_types et WHERE et.slug = 'full-time'
ON CONFLICT (slug) DO NOTHING;

-- Tutoring packages
INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, unit_count, effective_rate, description, sort_order)
SELECT et.id, 'Single Session', 'tutoring-hourly', 'one_time', NULL, 30.00, 'per hour', 1, 30.00,
  'One hour of targeted subject support with progress tracking', 1
FROM enrollment_types et WHERE et.slug = 'tutoring'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, unit_count, effective_rate, description, sort_order)
SELECT et.id, '5-Hour Package', 'tutoring-5hr', 'package', NULL, 140.00, 'per package', 5, 28.00,
  '5 hours of tutoring — save $10 ($28/hour)', 2
FROM enrollment_types et WHERE et.slug = 'tutoring'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, unit_count, effective_rate, description, sort_order)
SELECT et.id, '10-Hour Package', 'tutoring-10hr', 'package', NULL, 250.00, 'per package', 10, 25.00,
  '10 hours of tutoring — save $50 ($25/hour)', 3
FROM enrollment_types et WHERE et.slug = 'tutoring'
ON CONFLICT (slug) DO NOTHING;

-- Summer Enrichment packages
INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, description, sort_order)
SELECT et.id, 'Full Summer (8 weeks)', 'summer-full', 'one_time', NULL, 450.00, 'per student',
  '8-week summer program with gamified challenges and progress monitoring', 1
FROM enrollment_types et WHERE et.slug = 'summer-program'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, description, sort_order)
SELECT et.id, 'Monthly Summer', 'summer-monthly', 'recurring', 'month', 125.00, 'per student/month',
  'Month-by-month summer enrollment', 2
FROM enrollment_types et WHERE et.slug = 'summer-program'
ON CONFLICT (slug) DO NOTHING;

-- A La Carte
INSERT INTO pricing_packages (enrollment_type_id, name, slug, billing_type, billing_interval, price, unit_label, description, sort_order)
SELECT et.id, 'Single Course', 'alacarte-course', 'one_time', NULL, 60.00, 'per course',
  'Full access to one subject/course for one term', 1
FROM enrollment_types et WHERE et.slug = 'a-la-carte'
ON CONFLICT (slug) DO NOTHING;

