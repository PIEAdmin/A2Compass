import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { getCertificates, getMilestones } from '../../services/milestones.service';
import type { Certificate, MilestoneNotification } from '../../types/milestones';

const MILESTONE_ICONS: Record<string, string> = {
  skill_mastered: '⭐',
  domain_progress: '📊',
  streak: '🔥',
  first_attempt: '🌟',
  breakthrough: '💡',
  custom: '🎉',
};

const CERT_ICONS: Record<string, string> = {
  skill_mastery: '⭐',
  domain_mastery: '🏆',
  streak_achievement: '🔥',
  assessment_complete: '📋',
  custom: '🎓',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StudentAchievements() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const firstName = user?.fullName?.split(' ')[0] || 'Explorer';
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [milestones, setMilestones] = useState<MilestoneNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [certsData, milestonesData] = await Promise.all([
        getCertificates(studentId),
        getMilestones(studentId),
      ]);
      setCertificates(certsData);
      setMilestones(milestonesData);
    } catch (err: any) {
      console.error('Failed to load achievements:', err);
      setError(err?.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">Oops! Something went wrong.</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const hasContent = milestones.length > 0 || certificates.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-sm border border-yellow-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">🏆 My Achievements</h1>
        <p className="text-gray-600 mt-1">
          {hasContent
            ? `Way to go, ${firstName}! Look at everything you've earned!`
            : `Complete activities and master skills to earn badges, ${firstName}!`}
        </p>
        {hasContent && (
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🎖️</span>
              <span className="text-sm font-semibold text-gray-700">{milestones.length} Badge{milestones.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">📜</span>
              <span className="text-sm font-semibold text-gray-700">{certificates.length} Certificate{certificates.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Badges Section */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🎖️ Badges Earned</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {milestones.map((milestone) => {
              const icon = MILESTONE_ICONS[milestone.milestone_type] || '🎉';
              return (
                <div
                  key={milestone.id}
                  className="flex items-start gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-xl flex-shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{milestone.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{milestone.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(milestone.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Certificates Section */}
      {certificates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📜 Certificates</h2>
          <div className="space-y-3">
            {certificates.map((cert) => {
              const icon = CERT_ICONS[cert.certificate_type] || '🎓';
              return (
                <div
                  key={cert.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl flex-shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{cert.title}</h3>
                    {cert.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{cert.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Issued {formatDate(cert.issued_at)}</p>
                  </div>
                  {cert.pdf_url && (
                    <a
                      href={cert.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
                    >
                      View
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasContent && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-5xl mb-4">🌟</p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Your trophy case is waiting!</h3>
          <p className="text-gray-500 text-sm">
            Complete activities and master skills to earn badges and certificates!
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Every skill you master and milestone you reach earns you a badge. Keep going!
          </p>
        </div>
      )}

      {/* Encouragement footer */}
      {hasContent && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-400">
            You're collecting achievements like a champion! Keep it up! 🏅
          </p>
        </div>
      )}
    </div>
  );
}
