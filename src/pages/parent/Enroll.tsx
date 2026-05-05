import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { billingService } from '../../services/billing.service';
import { stripeService } from '../../services/stripe';
import { supabase } from '../../services/supabase';
import type { PricingPackage, FoundersAccount, FamilyDiscount } from '../../types/billing';

/* ── Plan category metadata ──────────────────────────────────── */
interface PlanMeta {
  name: string;
  slug: string;
  icon: string;
  headerBg: string;       // Solid dark bg for header
  headerText: string;      // Always white on dark bg
  cardBg: string;          // Card body bg
  cardBorder: string;
  accentBtn: string;       // CTA button style
  priceBadge: string;      // Starting price badge style
  features: string[];
}

const PLAN_META: PlanMeta[] = [
  {
    name: 'Full-Time Academy',
    slug: 'full-time',
    icon: '🎓',
    headerBg: 'bg-indigo-600',
    headerText: 'text-white',
    cardBg: 'bg-white dark:bg-gray-800',
    cardBorder: 'border-indigo-300 dark:border-indigo-600',
    accentBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    priceBadge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    features: [
      'Daily attendance tracking',
      'Full subject load (all 6 domains)',
      'Teacher check-ins & 6-week report cards',
      'All platform features included',
    ],
  },
  {
    name: 'Tutoring Support',
    slug: 'tutoring',
    icon: '📖',
    headerBg: 'bg-purple-600',
    headerText: 'text-white',
    cardBg: 'bg-white dark:bg-gray-800',
    cardBorder: 'border-purple-300 dark:border-purple-600',
    accentBtn: 'bg-purple-600 hover:bg-purple-700 text-white',
    priceBadge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    features: [
      'Targeted subject support',
      'Progress tracking',
      'Teacher feedback',
    ],
  },
  {
    name: 'Summer Enrichment',
    slug: 'summer',
    icon: '☀️',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    cardBg: 'bg-white dark:bg-gray-800',
    cardBorder: 'border-amber-300 dark:border-amber-600',
    accentBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
    priceBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    features: [
      'Light, engaging playlist',
      'Gamified challenges',
      'Progress monitoring',
    ],
  },
  {
    name: 'A La Carte Courses',
    slug: 'a-la-carte',
    icon: '🧩',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    cardBg: 'bg-white dark:bg-gray-800',
    cardBorder: 'border-emerald-300 dark:border-emerald-600',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    priceBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    features: [
      'Full access to one subject/course',
      'One full term duration',
    ],
  },
];

/* ── Helpers ──────────────────────────────────────────────────── */
interface EnrollmentType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface StudentProfile {
  id: string;
  user_id: string;
  parent_id: string;
  grade_level: string | null;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
  } | null;
}

function formatPrice(pkg: PricingPackage): string {
  const dollars = pkg.price % 1 === 0 ? pkg.price.toFixed(0) : pkg.price.toFixed(2);
  let suffix = '';
  if (pkg.billing_type === 'recurring') {
    suffix = pkg.billing_interval === 'year' ? '/yr' : '/mo';
  } else if (pkg.unit_label) {
    suffix = `/${pkg.unit_label}`;
  }
  return `$${dollars}${suffix}`;
}

/** Get the lowest-priced package label for a plan — shown on collapsed cards */
function getStartingPrice(planPackages: PricingPackage[]): string | null {
  if (planPackages.length === 0) return null;
  // Find the lowest price
  const sorted = [...planPackages].sort((a, b) => a.price - b.price);
  return formatPrice(sorted[0]);
}

/* ── Component ───────────────────────────────────────────────── */
export default function ParentEnroll() {
  const { user } = useAuth();
  const parentId = user?.id || '';
  const [searchParams] = useSearchParams();

  // Data
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [enrollmentTypes, setEnrollmentTypes] = useState<EnrollmentType[]>([]);
  const [children, setChildren] = useState<StudentProfile[]>([]);
  const [foundersAccount, setFoundersAccount] = useState<FoundersAccount | null>(null);
  const [familyDiscounts, setFamilyDiscounts] = useState<FamilyDiscount[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PricingPackage | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Return-from-Stripe banners
  const isSuccess = searchParams.get('success') === 'true';
  const isCancelled = searchParams.get('cancelled') === 'true';

  /* ── Load data ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [pkgs, types, founders, discounts, childrenRes] = await Promise.all([
        billingService.getPricingPackages().catch(() => []),
        supabase.from('enrollment_types').select('*').then(r => r.data || []),
        billingService.getFoundersAccount(parentId).catch(() => null),
        billingService.getFamilyDiscounts(parentId).catch(() => []),
        supabase
          .from('student_profiles')
          .select('*, profile:profiles!student_profiles_user_id_fkey(*)')
          .eq('parent_id', parentId)
          .then(r => r.data || []),
      ]);
      setPackages(pkgs);
      setEnrollmentTypes(types);
      setFoundersAccount(founders);
      setFamilyDiscounts(discounts);
      setChildren(childrenRes);
    } catch (err: any) {
      console.error('Failed to load enrollment data:', err);
      setError('Failed to load enrollment data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Helpers for grouping ──────────────────────────────────── */
  function getEnrollmentTypeForSlug(slug: string): EnrollmentType | undefined {
    return enrollmentTypes.find(t => t.slug === slug);
  }

  function getPackagesForSlug(slug: string): PricingPackage[] {
    const et = getEnrollmentTypeForSlug(slug);
    if (!et) return [];
    return packages.filter(p => p.enrollment_type_id === et.id);
  }

  /* ── Checkout ──────────────────────────────────────────────── */
  async function handleCheckout() {
    if (!selectedPkg || !selectedChild) return;
    setCheckoutLoading(true);
    try {
      const mode: 'subscription' | 'payment' =
        selectedPkg.billing_type === 'recurring' ? 'subscription' : 'payment';

      const result = await stripeService.createCheckoutSession({
        priceId: selectedPkg.stripe_price_id!,
        enrollmentTypeId: selectedPkg.enrollment_type_id,
        studentId: selectedChild,
        parentId,
        mode,
      });

      if (result?.url) {
        window.location.href = result.url;
      } else {
        setError('Could not create checkout session. Please try again.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError('Something went wrong starting checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  /* ── Child name helper ─────────────────────────────────────── */
  function childName(c: StudentProfile): string {
    if (c.profile?.full_name) return c.profile.full_name;
    if (c.profile?.first_name) {
      return [c.profile.first_name, c.profile.last_name].filter(Boolean).join(' ');
    }
    return 'Child';
  }

  /* ── Loading state ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* ── Success / Cancelled Banners ──────────────────────── */}
        {isSuccess && (
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-300 dark:border-green-700 p-4 text-center">
            <p className="text-base font-semibold text-green-800 dark:text-green-200">🎉 Enrollment Successful!</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Your payment was processed. You'll receive a confirmation email shortly.
            </p>
            <Link
              to="/parent/billing"
              className="inline-block mt-3 text-sm font-medium text-green-700 dark:text-green-300 underline hover:text-green-900 dark:hover:text-green-100"
            >
              View Billing &amp; Subscriptions →
            </Link>
          </div>
        )}

        {isCancelled && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl border border-yellow-300 dark:border-yellow-700 p-4 text-center">
            <p className="text-base font-semibold text-yellow-800 dark:text-yellow-200">Checkout Cancelled</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              No charges were made. Feel free to pick a plan below when you're ready.
            </p>
          </div>
        )}

        {/* ── Error Banner ─────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-300 dark:border-red-700 p-4 text-center">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* ── Page Header ──────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📋 Enrollment Options</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl mx-auto">
            Choose the learning plan that works best for your family. All plans include access to the
            A² Compass platform.
          </p>
        </div>

        {/* ── Founders' Rate Banner ────────────────────────────── */}
        {foundersAccount && (
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-300 dark:border-amber-700 p-4 text-center">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              ⭐ Founders' Rate Active — Family #{foundersAccount.founders_number} of 10
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Your pilot pricing is locked in for as long as enrollment stays continuous.
            </p>
          </div>
        )}

        {/* ── Family Discount Banner ───────────────────────────── */}
        {familyDiscounts.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700 p-4 text-center">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              👨‍👩‍👧‍👦 Family Discount Active — Multi-child discounts are applied automatically at checkout!
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              2nd child: 25% off · 3rd+ child: 50% off (Full-Time Academy)
            </p>
          </div>
        )}

        {/* ── Plan Category Cards ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PLAN_META.map(plan => {
            const planPackages = getPackagesForSlug(plan.slug);
            const isExpanded = expandedPlan === plan.slug;
            const startingPrice = getStartingPrice(planPackages);

            return (
              <div
                key={plan.slug}
                className={`rounded-xl shadow-md border overflow-hidden transition-all duration-200 ${plan.cardBorder} ${
                  isExpanded ? 'md:col-span-2 ring-2 ring-indigo-400 dark:ring-indigo-500' : ''
                }`}
              >
                {/* ── Colored Header ── */}
                <div className={`${plan.headerBg} px-6 py-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{plan.icon}</span>
                      <h2 className={`text-xl font-bold ${plan.headerText}`}>{plan.name}</h2>
                    </div>
                    {/* Starting price badge — always visible */}
                    {startingPrice && (
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${plan.priceBadge}`}>
                        {planPackages.length > 1 ? `From ${startingPrice}` : startingPrice}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Card Body ── */}
                <div className={`${plan.cardBg} px-6 py-4`}>
                  {/* Features */}
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Collapsed state — show button */}
                  {!isExpanded && (
                    <button
                      onClick={() => {
                        setExpandedPlan(plan.slug);
                        setSelectedPkg(null);
                        setSelectedChild(null);
                      }}
                      className={`w-full py-2.5 font-medium rounded-lg transition-colors text-sm ${plan.accentBtn}`}
                    >
                      View Pricing &amp; Enroll
                    </button>
                  )}

                  {/* Expanded state — pricing options */}
                  {isExpanded && (
                    <div className="mt-2 space-y-4">
                      <hr className="border-gray-200 dark:border-gray-600" />
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Choose a Package
                      </h3>

                      {planPackages.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No pricing packages available yet. Check back soon!
                        </p>
                      )}

                      {/* Package options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {planPackages.map(pkg => {
                          const isSelected = selectedPkg?.id === pkg.id;
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => {
                                setSelectedPkg(pkg);
                                setSelectedChild(null);
                              }}
                              className={`text-left p-4 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 shadow-md ring-1 ring-indigo-300 dark:ring-indigo-500'
                                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
                              }`}
                            >
                              <p className="font-bold text-2xl text-gray-900 dark:text-white">{formatPrice(pkg)}</p>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{pkg.name}</p>
                              {pkg.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{pkg.description}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Child selector — shown after picking a package */}
                      {selectedPkg && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Select Child
                          </h3>

                          {children.length === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              No children found on your account.{' '}
                              <Link to="/parent/settings" className="text-indigo-600 dark:text-indigo-400 underline">
                                Add a child
                              </Link>{' '}
                              first.
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3">
                            {children.map(child => {
                              const isChildSelected = selectedChild === child.id;
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => setSelectedChild(child.id)}
                                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                    isChildSelected
                                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200'
                                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                  }`}
                                >
                                  {childName(child)}
                                  {child.grade_level && (
                                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                                      ({child.grade_level})
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Checkout button */}
                      {selectedPkg && selectedChild && (
                        <button
                          onClick={handleCheckout}
                          disabled={checkoutLoading}
                          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          {checkoutLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              Redirecting to Checkout…
                            </>
                          ) : (
                            <>Proceed to Checkout — {formatPrice(selectedPkg)}</>
                          )}
                        </button>
                      )}

                      {/* Collapse button */}
                      <button
                        onClick={() => {
                          setExpandedPlan(null);
                          setSelectedPkg(null);
                          setSelectedChild(null);
                        }}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        ← Back to all plans
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── FAQ Section ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">❓ Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Can I switch plans?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Yes! You can change your enrollment plan at any time. Contact your teacher to discuss
                the best option.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Do you offer family discounts?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Absolutely! The 2nd child in Full-Time Academy receives 25% off, and the 3rd+ child
                receives 50% off.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">What is the Founders' Rate?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                The first 10 families to enroll lock in current pilot pricing indefinitely, as long
                as enrollment stays continuous.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Is my payment secure?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                All payments are processed securely through Stripe. We never see or store your card
                details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
