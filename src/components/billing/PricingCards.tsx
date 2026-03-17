// ============================================================
// A² Compass — Pricing Cards (Public-facing pricing display)
// ============================================================
import React, { useEffect, useState } from 'react';
import { billingService } from '../../services/billing.service';
import type { PricingPackage } from '../../types/billing';
import { PILOT_PRICING, FAMILY_DISCOUNT_RULES, FOUNDERS_RATE_CONFIG } from '../../types/billing';

const tierColors: Record<string, string> = {
  'full-time': 'border-indigo-500 bg-indigo-50',
  tutoring: 'border-emerald-500 bg-emerald-50',
  summer: 'border-amber-500 bg-amber-50',
  'a-la-carte': 'border-purple-500 bg-purple-50',
};

const tierBadge: Record<string, string> = {
  'full-time': 'bg-indigo-100 text-indigo-800',
  tutoring: 'bg-emerald-100 text-emerald-800',
  summer: 'bg-amber-100 text-amber-800',
  'a-la-carte': 'bg-purple-100 text-purple-800',
};

export const PricingCards: React.FC = () => {
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [foundersCount, setFoundersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pkgs, count] = await Promise.all([
          billingService.getPricingPackages(),
          billingService.getFoundersCount(),
        ]);
        setPackages(pkgs);
        setFoundersCount(count);
      } catch (err) {
        console.error('Failed to load pricing:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const getPackagesForType = (slug: string) =>
    packages.filter(pkg => {
      const matchSlug = pkg.slug.startsWith(slug === 'a-la-carte' ? 'alacarte' : slug.replace('-', ''));
      return matchSlug;
    });

  return (
    <div className="space-y-8">
      {/* Founders' Rate Banner */}
      {foundersCount < FOUNDERS_RATE_CONFIG.maxFamilies && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-6 text-center">
          <div className="text-2xl mb-2">⭐ Founders' Rate Available</div>
          <p className="text-gray-700 font-medium">
            {FOUNDERS_RATE_CONFIG.maxFamilies - foundersCount} of {FOUNDERS_RATE_CONFIG.maxFamilies} spots remaining
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {FOUNDERS_RATE_CONFIG.description}
          </p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PILOT_PRICING.map(item => {
          const pkgs = getPackagesForType(item.enrollmentSlug);
          const colorClass = tierColors[item.enrollmentSlug] || 'border-gray-300';
          const badgeClass = tierBadge[item.enrollmentSlug] || 'bg-gray-100';

          return (
            <div
              key={item.enrollmentSlug}
              className={`rounded-xl border-2 ${colorClass} p-6 transition-shadow hover:shadow-lg`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{item.enrollmentType}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
                  {item.enrollmentSlug === 'full-time' ? 'Most Popular' : ''}
                </span>
              </div>

              {/* Price Options */}
              <div className="space-y-3 mb-4">
                {pkgs.map(pkg => (
                  <div key={pkg.slug} className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600">{pkg.name}</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900">
                        ${pkg.price.toLocaleString()}
                      </span>
                      {pkg.unit_label && (
                        <span className="text-sm text-gray-500 ml-1">{pkg.unit_label}</span>
                      )}
                      {pkg.effective_rate && pkg.effective_rate !== pkg.price && (
                        <div className="text-xs text-green-600 font-medium">
                          ${pkg.effective_rate}/hr effective
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Includes */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Includes</p>
                <ul className="space-y-1">
                  {item.includes.map((inc, i) => (
                    <li key={i} className="flex items-start text-sm text-gray-600">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Family discount note for Full-Time */}
              {item.enrollmentSlug === 'full-time' && (
                <div className="mt-4 bg-indigo-100/50 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-indigo-800">👨‍👩‍👧‍👦 Family Discount</p>
                  {FAMILY_DISCOUNT_RULES.tiers.slice(1).map(tier => (
                    <p key={tier.childOrder} className="text-indigo-700">
                      {tier.label}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
