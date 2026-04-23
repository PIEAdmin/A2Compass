import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { billingService } from '../../services/billing.service';
import { EnrollmentWizard } from '../../components/billing';
import type { PricingPackage, FamilyDiscount } from '../../types/billing';

interface PlanCard {
  name: string;
  slug: string;
  price: string;
  unit: string;
  icon: string;
  color: string;
  borderColor: string;
  features: string[];
}

const PLAN_CARDS: PlanCard[] = [
  {
    name: 'Full-Time Academy',
    slug: 'full-time',
    price: '$175',
    unit: '/month',
    icon: '🎓',
    color: 'from-indigo-50 to-blue-50',
    borderColor: 'border-indigo-200',
    features: [
      'Daily attendance tracking',
      'Full subject load (all 6 domains)',
      'Teacher check-ins',
      '6-week report cards',
      'All platform features',
    ],
  },
  {
    name: 'Tutoring Support',
    slug: 'tutoring',
    price: '$30',
    unit: '/hour',
    icon: '📖',
    color: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    features: [
      'Targeted subject support',
      'Progress tracking',
      'Teacher feedback',
    ],
  },
  {
    name: 'Summer Enrichment',
    slug: 'summer',
    price: '$450',
    unit: '/program',
    icon: '☀️',
    color: 'from-yellow-50 to-orange-50',
    borderColor: 'border-yellow-200',
    features: [
      'Light, engaging playlist',
      'Gamified challenges',
      'Progress monitoring',
    ],
  },
  {
    name: 'A La Carte Courses',
    slug: 'a-la-carte',
    price: '$60',
    unit: '/course',
    icon: '🧩',
    color: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    features: [
      'Full access to one subject/course',
      'One full term duration',
    ],
  },
];

export default function ParentEnroll() {
  const { user } = useAuth();
  const parentId = user?.id || '';
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [familyDiscounts, setFamilyDiscounts] = useState<FamilyDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadPricing();
  }, [user]);

  async function loadPricing() {
    setLoading(true);
    try {
      const [pkgs, discounts] = await Promise.all([
        billingService.getPricingPackages().catch(() => []),
        billingService.getFamilyDiscounts(parentId).catch(() => []),
      ]);
      setPackages(pkgs);
      setFamilyDiscounts(discounts);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleEnroll(slug: string) {
    setSelectedPlan(slug);
    setShowWizard(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">📋 Enrollment Options</h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            Choose the learning plan that works best for your family. All plans include access to the A² Compass platform.
          </p>
        </div>

        {/* Family Discount Banner */}
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

        {/* Pricing Cards */}
        {!showWizard && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PLAN_CARDS.map((plan) => {
              // Try to get real price from loaded packages
              const dbPkg = packages.find((p) => p.slug.includes(plan.slug));
              const displayPrice = dbPkg ? `$${dbPkg.price}` : plan.price;
              const displayUnit = dbPkg?.unit_label ? `/${dbPkg.unit_label}` : plan.unit;

              return (
                <div
                  key={plan.slug}
                  className={`bg-gradient-to-br ${plan.color} rounded-xl shadow-sm border ${plan.borderColor} p-6 flex flex-col`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{plan.icon}</span>
                    <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">{displayPrice}</span>
                    <span className="text-gray-500 text-sm">{displayUnit}</span>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleEnroll(plan.slug)}
                    className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Enroll Now
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Enrollment Wizard */}
        {showWizard && (
          <div className="space-y-4">
            <button
              onClick={() => setShowWizard(false)}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              ← Back to Plans
            </button>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <EnrollmentWizard />
            </div>
          </div>
        )}

        {/* FAQ / Info Section */}
        {!showWizard && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">❓ Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800">Can I switch plans?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Yes! You can change your enrollment plan at any time. Contact your teacher to discuss the best option.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Do you offer family discounts?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Absolutely! The 2nd child in Full-Time Academy receives 25% off, and the 3rd+ child receives 50% off.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">What is the Founders' Rate?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  The first 10 families to enroll lock in current pilot pricing indefinitely, as long as enrollment stays continuous.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
