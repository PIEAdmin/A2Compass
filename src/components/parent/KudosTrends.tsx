import { useState, useEffect } from 'react';
import { kudosService, KUDOS_CATEGORIES, type Kudos } from '../../services/kudos.service';

interface KudosTrendsProps {
  studentProfileId: string;
  studentName: string;
}

export default function KudosTrends({ studentProfileId, studentName }: KudosTrendsProps) {
  const [kudos, setKudos] = useState<Kudos[]>([]);
  const [trends, setTrends] = useState<{ week: string; count: number; categories: Record<string, number> }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKudos();
  }, [studentProfileId]);

  async function loadKudos() {
    setLoading(true);
    try {
      const [k, t] = await Promise.all([
        kudosService.getStudentKudos(studentProfileId, 50),
        kudosService.getKudosTrends(studentProfileId),
      ]);
      setKudos(k);
      setTrends(t);
    } catch (err) {
      console.error('KudosTrends error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
    );
  }

  // Category breakdown
  const catCounts: Record<string, number> = {};
  let totalSparks = 0;
  for (const k of kudos) {
    catCounts[k.category] = (catCounts[k.category] || 0) + 1;
    totalSparks += k.spark_bonus;
  }

  const topCategories = Object.entries(catCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const firstName = studentName.split(' ')[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50">
        <h3 className="text-sm font-semibold text-gray-800">
          🌟 {firstName}'s Kudos
        </h3>
      </div>

      <div className="p-4">
        {kudos.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">🌟</div>
            <p className="text-sm text-gray-400">No kudos yet — they're coming!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-amber-50 rounded-xl p-2 text-center">
                <p className="text-xl font-bold text-amber-600">{kudos.length}</p>
                <p className="text-[10px] text-amber-500 font-medium">Total Kudos</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-2 text-center">
                <p className="text-xl font-bold text-purple-600">{totalSparks}</p>
                <p className="text-[10px] text-purple-500 font-medium">Sparks Earned</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-2 text-center">
                <p className="text-xl font-bold text-blue-600">{topCategories.length}</p>
                <p className="text-[10px] text-blue-500 font-medium">Categories</p>
              </div>
            </div>

            {/* Top Strengths */}
            {topCategories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Top Strengths</p>
                <div className="space-y-1">
                  {topCategories.map(([catId, count]) => {
                    const cat = KUDOS_CATEGORIES.find(c => c.id === catId);
                    const pct = Math.round((count / kudos.length) * 100);
                    return (
                      <div key={catId} className="flex items-center gap-2">
                        <span className="text-sm w-5">{cat?.emoji || '🌟'}</span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="text-xs font-medium text-gray-700">{cat?.label || catId}</span>
                            <span className="text-xs text-gray-400">{count}×</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5 mt-0.5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weekly Trend */}
            {trends.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Weekly Trend</p>
                <div className="flex items-end gap-1 h-12">
                  {trends.slice(0, 8).reverse().map((t, i) => {
                    const maxCount = Math.max(...trends.slice(0, 8).map(t => t.count));
                    const height = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
                    return (
                      <div key={t.week} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-amber-400 to-yellow-300 transition-all"
                          style={{ height: `${Math.max(4, height)}%` }}
                          title={`Week of ${t.week}: ${t.count} kudos`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-gray-300">8 wks ago</span>
                  <span className="text-[9px] text-gray-300">This week</span>
                </div>
              </div>
            )}

            {/* Recent Kudos */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Recent</p>
              <div className="space-y-1.5">
                {kudos.slice(0, 5).map(k => {
                  const cat = KUDOS_CATEGORIES.find(c => c.id === k.category);
                  return (
                    <div key={k.id} className="flex items-center gap-2 text-xs">
                      <span>{cat?.emoji || '🌟'}</span>
                      <span className="font-medium text-gray-700 flex-1 truncate">{cat?.label || k.category}</span>
                      <span className="text-amber-500">+{k.spark_bonus}⚡</span>
                      <span className="text-gray-300 text-[10px]">
                        {new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
