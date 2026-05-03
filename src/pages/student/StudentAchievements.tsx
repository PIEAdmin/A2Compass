import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { getCertificates, getMilestones } from '../../services/milestones.service';
import type { Certificate, MilestoneNotification } from '../../types/milestones';
import {
  Trophy,
  CompassBuddy,
  FloatingStars,
  EmptyState,
} from '../../components/shared/Illustrations';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50">
        <Trophy size={80} className="mb-4" />
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
        <p className="text-amber-700 mt-3 text-sm font-medium">Loading your trophies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <CompassBuddy size={70} mood="thinking" className="mx-auto mb-3" />
          <p className="text-red-700 font-medium">Oops! Something went wrong.</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const hasContent = milestones.length > 0 || certificates.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-20">
      {/* Illustrated Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-2xl shadow-lg p-6 text-white illust-slide-up">
        <FloatingStars count={8} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0 illust-bob">
            <Trophy size={70} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">🏆 My Achievements</h1>
            <p className="text-white/90 mt-1">
              {hasContent
                ? `Way to go, ${firstName}! Look at everything you've earned!`
                : `Complete activities to earn badges, ${firstName}!`}
            </p>
            {hasContent && (
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                  <span>🎖️</span>
                  <span className="text-sm font-semibold">{milestones.length} Badge{milestones.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                  <span>📜</span>
                  <span className="text-sm font-semibold">{certificates.length} Cert{certificates.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badges Section */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎖️</span> Badges Earned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 illust-stagger">
            {milestones.map((milestone) => {
              const icon = MILESTONE_ICONS[milestone.milestone_type] || '🎉';
              return (
                <div
                  key={milestone.id}
                  className="flex items-start gap-3 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-100 illust-card-hover"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-200 to-amber-300 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{milestone.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{milestone.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5 bg-gray-100 px-2 py-0.5 rounded-full inline-block">{formatDate(milestone.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Certificates Section */}
      {certificates.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📜</span> Certificates
          </h2>
          <div className="space-y-3 illust-stagger">
            {certificates.map((cert) => {
              const icon = CERT_ICONS[cert.certificate_type] || '🎓';
              return (
                <div
                  key={cert.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-100 illust-card-hover"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-2xl flex-shrink-0">
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
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm flex-shrink-0"
                    >
                      View 📄
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
        <EmptyState
          title="Your trophy case is waiting!"
          message="Complete activities and master skills to earn badges and certificates. Every milestone you reach earns you a badge!"
          illustration="trophy"
        />
      )}

      {/* Encouragement footer */}
      {hasContent && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <span className="illust-float inline-block">🏅</span>
            You're collecting achievements like a champion!
            <span className="illust-float inline-block" style={{ animationDelay: '0.5s' }}>🌟</span>
          </p>
        </div>
      )}
    </div>
  );
}
