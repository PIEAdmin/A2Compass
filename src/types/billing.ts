// ============================================================
// A² Compass — Billing & Pricing Types
// ============================================================

export type BillingType = 'recurring' | 'one_time' | 'package';
export type BillingInterval = 'month' | 'year' | null;

export interface PricingPackage {
  id: string;
  enrollment_type_id: string;
  name: string;
  slug: string;
  billing_type: BillingType;
  billing_interval: BillingInterval;
  price: number;
  unit_label: string | null;
  unit_count: number | null;
  effective_rate: number | null;
  stripe_price_id: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface FoundersAccount {
  id: string;
  parent_id: string;
  family_name: string;
  founders_number: number;
  rate_locked_at: string;
  rate_lock_pricing: Record<string, number>;
  is_active: boolean;
  continuous_since: string;
  notes: string | null;
  granted_by: string | null;
}

export interface FamilyDiscount {
  id: string;
  family_parent_id: string;
  student_id: string;
  child_order: number;
  discount_percent: number;
  is_active: boolean;
}

export interface PricingDisplayItem {
  enrollmentType: string;
  enrollmentSlug: string;
  packages: PricingPackage[];
  includes: string[];
}

// Sandra's finalized pilot pricing
export const PILOT_PRICING: PricingDisplayItem[] = [
  {
    enrollmentType: 'Full-Time Academy',
    enrollmentSlug: 'full-time',
    packages: [] as PricingPackage[], // loaded from DB
    includes: [
      'Daily attendance tracking',
      'Full subject load (all 6 domains)',
      'Teacher check-ins',
      '6-week report cards',
      'All platform features',
    ],
  },
  {
    enrollmentType: 'Tutoring Support',
    enrollmentSlug: 'tutoring',
    packages: [],
    includes: [
      'Targeted subject support',
      'Progress tracking',
      'Teacher feedback',
    ],
  },
  {
    enrollmentType: 'Summer Enrichment',
    enrollmentSlug: 'summer',
    packages: [],
    includes: [
      'Light, engaging playlist',
      'Gamified challenges',
      'Progress monitoring',
    ],
  },
  {
    enrollmentType: 'A La Carte Courses',
    enrollmentSlug: 'a-la-carte',
    packages: [],
    includes: [
      'Full access to one subject/course',
      'One full term duration',
    ],
  },
];

export const FAMILY_DISCOUNT_RULES = {
  appliesTo: 'full-time' as const,
  tiers: [
    { childOrder: 1, discount: 0, label: 'First child — full price' },
    { childOrder: 2, discount: 25, label: 'Second child — 25% off' },
    { childOrder: 3, discount: 50, label: 'Third+ child — 50% off' },
  ],
};

export const FOUNDERS_RATE_CONFIG = {
  maxFamilies: 10,
  description: 'First 10 families lock in pilot pricing indefinitely as long as enrollment stays continuous.',
};
