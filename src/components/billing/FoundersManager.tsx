// ============================================================
// A² Compass — Founders' Rate Manager (Admin)
// ============================================================
import React, { useEffect, useState } from 'react';
import { billingService } from '../../services/billing.service';
import type { FoundersAccount } from '../../types/billing';
import { FOUNDERS_RATE_CONFIG } from '../../types/billing';

export const FoundersManager: React.FC = () => {
  const [founders, setFounders] = useState<FoundersAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFounders();
  }, []);

  const loadFounders = async () => {
    try {
      const data = await billingService.listFoundersAccounts();
      setFounders(data);
    } catch (err) {
      console.error('Failed to load founders:', err);
    } finally {
      setLoading(false);
    }
  };

  const spotsRemaining = FOUNDERS_RATE_CONFIG.maxFamilies - founders.filter(f => f.is_active).length;

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-48" />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">⭐ Founders' Rate Program</h3>
          <p className="text-sm text-gray-500">
            {spotsRemaining} of {FOUNDERS_RATE_CONFIG.maxFamilies} spots remaining
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: FOUNDERS_RATE_CONFIG.maxFamilies }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < founders.filter(f => f.is_active).length
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {founders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">🏆</p>
          <p>No Founders enrolled yet.</p>
          <p className="text-sm">Grant Founders' Rate to families from the enrollment manager.</p>
        </div>
      ) : (
        <div className="divide-y">
          {founders.map(founder => (
            <div key={founder.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  #{founder.founders_number}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{founder.family_name}</p>
                  <p className="text-xs text-gray-500">
                    Since {new Date(founder.continuous_since).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  founder.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {founder.is_active ? 'Active' : 'Lapsed'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
