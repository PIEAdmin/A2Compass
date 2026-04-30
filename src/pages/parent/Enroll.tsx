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
  color: string;
  borderColor: string;
  accent: string;
  features: string[];
}

const PLAN_META: PlanMeta[] = [
  {
    name: 'Full-Time Academy',
    slug: 'full-time',
    icon: '🎓',
    color: 'from-indigo-50 to-blue-50',
    borderColor: 'border-indigo-200',
    accent: 'bg-indigo-600 hover:bg-indigo-700',
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
    color: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    accent: 'bg-purple-600 hover:bg-purple-700',
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
    color: 'from-yellow-50 to-orange-50',
    borderColor: 'border-yellow-200',
    accent: 'bg-yellow-600 hover:bg-yellow-700',
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
    color: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    accent: 'bg-green-600 hover:bg-green-700',
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
      const et = enrollmentTypes.find(t => t.id === selectedPkg.enrollment_type_id);
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* ── Success / Cancelled Banners ──────────────────────── */}
        {isSuccess && (
          <div className="bg-green-50 rounded-xl border border-green-300 p-4 text-center">
            <p className="text-base font-semibold text-green-800">🎉 Enrollment Successful!</p>
            <p className="text-sm text-green-700 mt-1">
              Your payment was processed. You'll receive a confirmation email shortly.
            </p>
            <Link
              to="/parent/billing"
              className="inline-block mt-3 text-sm font-medium text-green-700 underline hover:text-green-900"
            >
              View Billing &amp; Subscriptions →
            </Link>
          </div>
        )}

        {isCancelled && (
          <div className="bg-yellow-50 rounded-xl border border-yellow-300 p-4 text-center">
            <p className="text-base font-semibold text-yellow-800">Checkout Cancelled</p>
            <p className="text-sm text-yellow-700 mt-1">
              No charges were made. Feel free to pick a plan below when you're ready.
            </p>
          </div>
        )}

        {/* ── Error Banner ─────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 rounded-xl border border-red-300 p-4 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* ── Page Header ──────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">📋 Enrollment Options</h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            Choose the learning plan that works best for your family. All plans include access to the
            A² Compass platform.
          </p>
        </div>

        {/* ── Founders' Rate Banner ────────────────────────────── */}
        {foundersAccount && (
          <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 text-center">
            <p className="text-sm font-semibold text-amber-800">
              ⭐ Founders' Rate Active — Family #{foundersAccount.founders_number} of 10
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Your pilot pricing is locked in for as long as enrollment stays continuous.
            </p>
          </div>
        )}

        {/* ── Family Discount Banner ───────────────────────────── */}
        {familyDiscounts.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <p className="text-sm font-medium text-blue-800">
              👨‍👩‍👧‍👦 Family Discount Active — Multi-child discounts are applied automatically at checkout!
            </p>
            <p className="text-xs text-blue-600 mt-1">
              2nd child: 25% off · 3rd+ child: 50% off (Full-Time Academy)
            </p>
          </div>
        )}

        {/* ── Plan Category Cards ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PLAN_META.map(plan => {
            const planPackages = getPackagesForSlug(plan.slug);
            const isExpanded = expandedPlan === plan.slug;

            return (
              <div
                key={plan.slug}
                className={`bg-gradient-to-br ${plan.color} rounded-xl shadow-sm border ${plan.borderColor} p-6 flex flex-col transition-all duration-200 ${
                  isExpanded ? 'md:col-span-2 ring-2 ring-indigo-400' : ''
                }`}
              >
                {/* Card header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{plan.icon}</span>
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
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
                    className={`w-full py-2.5 text-white font-medium rounded-lg transition-colors text-sm ${plan.accent}`}
                  >
                    View Pricing &amp; Enroll
                  </button>
                )}

                {/* Expanded state — pricing options */}
                {isExpanded && (
                  <div className="mt-2 space-y-4">
                    <hr className="border-gray-200" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Choose a Package
                    </h3>

                    {planPackages.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
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
                                ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-300'
                                : 'border-gray-200 bg-white/70 hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <p className="font-bold text-lg text-gray-900">{formatPrice(pkg)}</p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">{pkg.name}</p>
                            {pkg.description && (
                              <p className="text-xs text-gray-500 mt-1">{pkg.description}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Child selector — shown after picking a package */}
                    {selectedPkg && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Select Child
                        </h3>

                        {children.length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            No children found on your account.{' '}
                            <Link to="/parent/settings" className="text-indigo-600 underline">
                              Add a child
                            </Link>{' '}
                            first.
                          </p>
                        )}

                        <div className="flex flex-wrap gap-3">
                          {children.map(child => {
                            const isSelected = selectedChild === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => setSelectedChild(child.id)}
                                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {childName(child)}
                                {child.grade_level && (
                                  <span className="ml-1 text-xs text-gray-400">
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
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      ← Back to all plans
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── FAQ Section ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">❓ Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800">Can I switch plans?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Yes! You can change your enrollment plan at any time. Contact your teacher to discuss
                the best option.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Do you offer family discounts?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Absolutely! The 2nd child in Full-Time Academy receives 25% off, and the 3rd+ child
                receives 50% off.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">What is the Founders' Rate?</h3>
              <p className="text-sm text-gray-500 mt-1">
                The first 10 families to enroll lock in current pilot pricing indefinitely, as long
                as enrollment stays continuous.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Is my payment secure?</h3>
              <p className="text-sm text-gray-500 mt-1">
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
