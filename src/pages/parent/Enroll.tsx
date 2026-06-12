import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { supabase } from '../../services/supabase';

/* ── Types ────────────────────────────────────────────────────── */
type CustomerType = 'individual' | 'organization';
type BillingInterval = 'monthly' | 'annual';

interface OrgForm {
  name: string;
  type: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  estimatedStudents: string;
  website: string;
}

/* ── Component ────────────────────────────────────────────────── */
export default function Enroll() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);
  const [orgSubmitted, setOrgSubmitted] = useState(false);
  const [orgForm, setOrgForm] = useState<OrgForm>({
    name: '', type: 'daycare', contactName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', estimatedStudents: '10', website: ''
  });

  /* ── Tier+interval → pricing_packages slug ──────────────── */
  const TIER_SLUG_MAP: Record<string, string> = {
    'spark-monthly': 'spark-monthly',
    'spark-annual': 'spark-annual',
    'launch-monthly': 'launch-monthly',
    'launch-annual': 'launch-annual',
    'launch-founders-monthly': 'launch-founders',
  };

  /* ── Individual Plan Selection → Checkout ──────────────── */
  async function handleSelectPlan(tier: 'spark' | 'launch' | 'launch-founders', interval: BillingInterval) {
    if (!user) { navigate('/login?redirect=/parent/enroll'); return; }
    setLoading(true);
    try {
      // Look up the stripe_price_id from pricing_packages
      const slug = TIER_SLUG_MAP[`${tier}-${interval}`] || tier;
      const { data: pkg, error: pkgErr } = await supabase
        .from('pricing_packages')
        .select('stripe_price_id')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      if (pkgErr || !pkg?.stripe_price_id) throw new Error('Plan not found. Please try again.');

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          price_id: pkg.stripe_price_id,
          parent_id: user.id,
          mode: 'subscription',
          success_url: `${window.location.origin}/parent?enrolled=true`,
          cancel_url: `${window.location.origin}/parent/enroll`,
        }
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else alert('Checkout session created! Check your email for payment link.');
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.message || 'Unable to start checkout right now. Please try again or contact us at admin@aaacademy.us');
    } finally {
      setLoading(false);
    }
  }

  /* ── Organization Form Submit ──────────────────────────── */
  async function handleOrgSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const licenseKey = 'A2C-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      const studentCount = parseInt(orgForm.estimatedStudents) || 10;
      let pricingTier = 'gravitate-base';
      if (studentCount >= 150) pricingTier = 'gravitate-150';
      else if (studentCount >= 50) pricingTier = 'gravitate-50';
      else if (studentCount >= 25) pricingTier = 'gravitate-25';

      const { error } = await supabase.from('organizations').insert({
        name: orgForm.name,
        org_type: orgForm.type,
        contact_name: orgForm.contactName,
        email: orgForm.email,
        phone: orgForm.phone,
        address: orgForm.address,
        city: orgForm.city,
        state: orgForm.state,
        zip: orgForm.zip,
        student_count: studentCount,
        website: orgForm.website,
        license_key: licenseKey,
        pricing_tier: pricingTier,
        admin_user_id: user?.id || null,
        is_active: true
      });
      if (error) throw error;
      setOrgSubmitted(true);
    } catch (err: any) {
      console.error('Org submit error:', err);
      alert('Error submitting organization. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Family Discount Banner ────────────────────────────── */
  const FamilyDiscountBanner = () => (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-8">
      <div className="flex items-center gap-3">
        <span className="text-2xl">👨‍👩‍👧‍👦</span>
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">Family Discounts Available!</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">2nd child: <strong>25% off</strong> · 3rd+ child: <strong>50% off</strong> — applies to both Spark & Launch</p>
        </div>
      </div>
    </div>
  );

  /* ── Toggle: Individual vs Organization ────────────────── */
  const CustomerToggle = () => (
    <div className="flex justify-center mb-8">
      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 gap-1">
        <button
          onClick={() => setCustomerType('individual')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            customerType === 'individual'
              ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          👨‍👩‍👧 Individual Family
        </button>
        <button
          onClick={() => setCustomerType('organization')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            customerType === 'organization'
              ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          🏢 Organization / School / Center
        </button>
      </div>
    </div>
  );

  /* ── Billing Interval Toggle ───────────────────────────── */
  const BillingToggle = () => (
    <div className="flex justify-center mb-8">
      <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
        <button
          onClick={() => setBillingInterval('monthly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            billingInterval === 'monthly'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval('annual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            billingInterval === 'annual'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Annual <span className="text-emerald-600 dark:text-emerald-400 ml-1 text-xs font-bold">Save up to 45%</span>
        </button>
      </div>
    </div>
  );

  /* ─── INDIVIDUAL PRICING ─────────────────────────────────── */
  const IndividualPricing = () => (
    <div className="space-y-8">
      <BillingToggle />
      <FamilyDiscountBanner />

      {/* Single trial banner */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 text-center">
          <p className="text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
            🎉 All plans include a <strong>7-day free trial</strong> — no charge until day 8!
          </p>
          <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
            Try A² Compass risk-free. Cancel anytime during your trial.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* ── Spark Card ──────────────────── */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">✨ Spark</h3>
                <p className="text-sky-100 text-sm mt-1">Self-Paced Learning</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold">
                  {billingInterval === 'monthly' ? '$14.99' : '$99'}
                </div>
                <div className="text-sky-100 text-sm">
                  /{billingInterval === 'monthly' ? 'month' : 'year'}
                </div>
                {billingInterval === 'annual' && (
                  <div className="text-xs text-sky-200 mt-1">= $8.25/mo · Save 45%!</div>
                )}
              </div>
            </div>
            <div className="bg-sky-600/80 px-3 py-1.5 text-center">
              <p className="text-sky-100 text-xs">Includes 7-day free trial</p>
            </div>
          </div>

          <div className="p-6">
            <ul className="space-y-3 mb-6">
              {[
                'Full core curriculum (PreK–Grade 4)',
                'Interactive lessons, practice & games',
                'Adaptive assessments & progress reports',
                'Personalized Flight Plan',
                'Achievement badges & certificates'
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-sky-500 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelectPlan('spark', billingInterval)}
              disabled={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : '✨ Choose Spark'}
            </button>
          </div>
        </div>

        {/* ── Launch Card ─────────────────── */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-violet-300 dark:border-violet-600 overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
          {/* Most Popular Badge */}
          <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
            ⭐ MOST POPULAR
          </div>

          <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">🚀 Launch</h3>
                <p className="text-violet-200 text-sm mt-1">Teacher-Led Premium</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold">
                  {billingInterval === 'monthly' ? '$39.99' : '$349'}
                </div>
                <div className="text-violet-200 text-sm">
                  /{billingInterval === 'monthly' ? 'month' : 'year'}
                </div>
                {billingInterval === 'annual' && (
                  <div className="text-xs text-violet-200 mt-1">= $29.08/mo · Save 27%!</div>
                )}
              </div>
            </div>
            <div className="bg-violet-600/80 px-3 py-1.5 text-center">
              <p className="text-violet-100 text-xs">Includes 7-day free trial</p>
            </div>
          </div>

          <div className="p-6">
            <ul className="space-y-3 mb-6">
              {[
                'Everything in Spark',
                'Weekly teacher check-ins',
                'Live Q&A sessions',
                'Personalized feedback & coaching',
                '6-week detailed report cards',
                'Parent-teacher messaging',
                'Priority support'
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-violet-500 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelectPlan('launch', billingInterval)}
              disabled={loading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : '🚀 Choose Launch'}
            </button>
          </div>

          {/* Founders' Rate */}
          <div className="border-t border-violet-200 dark:border-violet-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">🔒 Founders' Rate Lock</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">First 50 families — <strong>$29.99/mo forever!</strong></p>
              </div>
              <button
                onClick={() => handleSelectPlan('launch-founders', 'monthly')}
                disabled={loading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Claim Founders' Rate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compare Plans */}
      <div className="max-w-4xl mx-auto mt-12">
        <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-6">Compare Plans</h3>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Feature</th>
                <th className="p-4 text-center font-semibold text-sky-600 dark:text-sky-400">✨ Spark</th>
                <th className="p-4 text-center font-semibold text-violet-600 dark:text-violet-400">🚀 Launch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                ['Full curriculum (PreK–Grade 4)', true, true],
                ['Interactive games & practice', true, true],
                ['Adaptive assessments', true, true],
                ['Progress reports', true, true],
                ['Personalized Flight Plan', true, true],
                ['Badges & certificates', true, true],
                ['Teacher check-ins', false, true],
                ['Live Q&A sessions', false, true],
                ['Personalized feedback', false, true],
                ['6-week report cards', false, true],
                ['Parent-teacher messaging', false, true],
                ['Priority support', false, true]
              ].map(([feature, spark, launch], i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="p-4 text-gray-700 dark:text-gray-300">{feature as string}</td>
                  <td className="p-4 text-center">{spark ? <span className="text-sky-500 text-lg">✓</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="p-4 text-center">{launch ? <span className="text-violet-500 text-lg">✓</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-gray-700/30 font-semibold">
                <td className="p-4 text-gray-700 dark:text-gray-300">Price</td>
                <td className="p-4 text-center text-sky-600 dark:text-sky-400">$14.99/mo</td>
                <td className="p-4 text-center text-violet-600 dark:text-violet-400">$39.99/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ─── ORGANIZATION PRICING ───────────────────────────────── */
  const OrganizationPricing = () => {
    if (orgSubmitted) {
      return (
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to A² Compass!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your organization has been registered. Our team will reach out within 24 hours to set up your account, configure billing, and help you onboard your students.
          </p>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-6 mb-6 text-left">
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">What happens next?</h4>
            <ol className="text-sm text-emerald-700 dark:text-emerald-400 space-y-2 list-decimal list-inside">
              <li>We'll verify your organization and send your <strong>license key</strong> via email</li>
              <li>You'll get admin access to add teachers and enroll students in bulk</li>
              <li>Students begin their Discovery Assessment and personalized Flight Plan</li>
            </ol>
          </div>
          <Link to="/" className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors">
            Go to Homepage
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Gravitate Pricing Overview */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
              <h3 className="text-2xl font-bold">🌍 Gravitate — For Organizations</h3>
              <p className="text-emerald-100 mt-1">Daycare centers · Schools · Tutoring programs · Homeschool co-ops</p>
            </div>

            <div className="p-6">
              {/* Volume Pricing Table */}
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Per-Student Pricing (billed monthly)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { range: '10–24 students', price: '$5.00', per: '/student/mo', highlight: false },
                  { range: '25–49 students', price: '$4.50', per: '/student/mo', highlight: false },
                  { range: '50–149 students', price: '$4.00', per: '/student/mo', highlight: true },
                  { range: '150+ students', price: '$3.00', per: '/student/mo', highlight: false }
                ].map((tier, i) => (
                  <div key={i} className={`text-center p-4 rounded-xl border-2 ${
                    tier.highlight
                      ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
                  }`}>
                    <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{tier.price}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{tier.per}</div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{tier.range}</div>
                    {tier.highlight && <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">POPULAR</div>}
                  </div>
                ))}
              </div>

              {/* What's Included */}
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">What Every Organization Gets</h4>
              <div className="grid md:grid-cols-2 gap-2 mb-6">
                {[
                  'All Spark features for every student',
                  'Organization-wide reporting dashboard',
                  'Bulk student enrollment & management',
                  'Admin portal with progress tracking',
                  'Volume discounts auto-applied',
                  'Dedicated onboarding support'
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-emerald-500 mt-0.5">✓</span> {f}
                  </div>
                ))}
              </div>

              {/* Director Dashboard Add-on */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-purple-800 dark:text-purple-300">📊 Director Dashboard Add-on</p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Multi-class view, teacher oversight, compliance reports</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-purple-700 dark:text-purple-300">+$25</span>
                    <span className="text-purple-500 text-sm">/mo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Registration Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Register Your Organization</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Fill out the form below and we'll set up your organization within 24 hours.
            </p>

            <form onSubmit={handleOrgSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Name *</label>
                  <input
                    type="text" required value={orgForm.name}
                    onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Sunshine Learning Center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Type *</label>
                  <select
                    required value={orgForm.type}
                    onChange={e => setOrgForm({ ...orgForm, type: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="daycare">Daycare / Childcare Center</option>
                    <option value="school">Private School</option>
                    <option value="tutoring">Tutoring Program</option>
                    <option value="homeschool_coop">Homeschool Co-op</option>
                    <option value="after_school">After-School Program</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person *</label>
                  <input
                    type="text" required value={orgForm.contactName}
                    onChange={e => setOrgForm({ ...orgForm, contactName: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    type="email" required value={orgForm.email}
                    onChange={e => setOrgForm({ ...orgForm, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel" value={orgForm.phone}
                    onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                  <input
                    type="url" value={orgForm.website}
                    onChange={e => setOrgForm({ ...orgForm, website: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  type="text" value={orgForm.address}
                  onChange={e => setOrgForm({ ...orgForm, address: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input
                    type="text" value={orgForm.city}
                    onChange={e => setOrgForm({ ...orgForm, city: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                  <input
                    type="text" value={orgForm.state}
                    onChange={e => setOrgForm({ ...orgForm, state: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP</label>
                  <input
                    type="text" value={orgForm.zip}
                    onChange={e => setOrgForm({ ...orgForm, zip: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Number of Students *</label>
                <input
                  type="number" required min="1" value={orgForm.estimatedStudents}
                  onChange={e => setOrgForm({ ...orgForm, estimatedStudents: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 10 students. Volume discounts applied automatically at 25+ students.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 mt-4"
              >
                {loading ? 'Submitting...' : 'Register Organization →'}
              </button>
            </form>
          </div>
        </div>

        {/* White-Label Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold">🏷️ White-Label Licensing</h3>
              <p className="text-gray-400 mt-2">Rebrand A² Compass as your own platform. Keep 100% of tuition you collect.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Basic', price: '$497', limit: '200 students', features: ['Remove A² branding', 'Your logo & colors', 'Full platform access', 'Standard support'] },
                { name: 'Pro', price: '$997', limit: '500 students', features: ['Everything in Basic', 'Custom subdomain', 'Priority support', 'Advanced analytics'] },
                { name: 'Enterprise', price: '$2,497', limit: 'Unlimited', features: ['Everything in Pro', 'Dedicated server option', 'API access', 'Source code access'] }
              ].map((tier, i) => (
                <div key={i} className={`bg-gray-800/50 dark:bg-gray-800 rounded-xl p-6 border ${
                  i === 1 ? 'border-amber-400' : 'border-gray-700'
                }`}>
                  {i === 1 && <div className="text-xs font-bold text-amber-400 mb-2">★ RECOMMENDED</div>}
                  <h4 className="text-lg font-bold">{tier.name}</h4>
                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-3xl font-extrabold">{tier.price}</span>
                    <span className="text-gray-400">/mo</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">Up to {tier.limit}</p>
                  <ul className="space-y-2">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-emerald-400 mt-0.5">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="mailto:admin@aaacademy.us?subject=White-Label Inquiry"
                    className="block w-full mt-6 text-center py-2 border border-gray-600 hover:border-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Contact Sales
                  </a>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 text-sm mt-6">
              You keep 100% of tuition from your families. We only charge the flat monthly license.
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* ─── MAIN RENDER ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Adaptive learning that meets every child where they are. Start with Spark for self-paced
            learning, or upgrade to Launch for teacher-led guidance.
          </p>
        </div>

        <CustomerToggle />

        {customerType === 'individual' ? <IndividualPricing /> : <OrganizationPricing />}

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Questions? Contact us at{' '}
            <a href="mailto:admin@aaacademy.us" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              admin@aaacademy.us
            </a>
          </p>
          {!user && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
