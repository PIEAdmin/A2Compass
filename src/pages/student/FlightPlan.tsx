import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlaylistItem, PlaylistReason, PlaylistItemStatus } from '../../types/skills';
import { usePlaylist } from '../../hooks/useSkills';
import { useAuth } from '../../hooks';
import { getOnboardingState } from '../../services/onboarding.service';
import {
  RocketShip,
  CompassBuddy,
  FloatingStars,
  DomainIllustration,
  EmptyState,
  ConfettiBurst,
} from '../../components/shared/Illustrations';

const REASON_COLORS: Record<PlaylistReason, { bg: string; text: string; label: string; icon: string }> = {
  needs_practice: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Needs Practice', icon: '🔄' },
  ready_to_learn: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready to Learn', icon: '🌟' },
  foundational_gap: { bg: 'bg-red-100', text: 'text-red-700', label: 'Foundation', icon: '🧱' },
  spiral_review: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Spiral Review', icon: '🌀' },
  teacher_focus: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Teacher Focus', icon: '👩‍🏫' },
  teacher_added: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Teacher Added', icon: '📌' },
};

const STATUS_ICONS: Record<PlaylistItemStatus, string> = {
  pending: '○',
  in_progress: '◐',
  completed: '✅',
  skipped: '⏭️',
};

const DOMAIN_BG_COLORS: Record<string, string> = {
  literacy: 'border-l-purple-400',
  numeracy: 'border-l-blue-400',
  daily_living: 'border-l-green-400',
};

function estimateMinutes(priority: number): number {
  if (priority >= 8) return 5;
  if (priority >= 5) return 10;
  return 15;
}

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function FlightPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.id || '';
  const studentName = user?.fullName?.split(' ')[0] || 'Explorer';
  const { items, loading, error, complete, skip, start } = usePlaylist(studentId);
  const [showMastered, setShowMastered] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check onboarding status — redirect to orientation if not complete
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const state = await getOnboardingState(user.id);
        if (!state.orientation_complete) {
          navigate('/student/orientation', { replace: true });
          return;
        }
        if (!state.warm_activities_unlocked && !state.assessment_completed) {
          // Orientation done, let them proceed
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
      } finally {
        setCheckingOnboarding(false);
      }
    })();
  }, [user?.id, navigate]);

  const completedCount = useMemo(() => items.filter((i) => i.status === 'completed').length, [items]);
  const activeItems = useMemo(() => items.filter((i) => i.status !== 'skipped'), [items]);
  const totalActive = activeItems.length;
  const allDone = totalActive > 0 && completedCount >= totalActive;
  const progressPercent = totalActive > 0 ? (completedCount / totalActive) * 100 : 0;

  const recentlyMastered = useMemo(
    () => items.filter((i) => i.status === 'completed' && i.mastery_met),
    [items]
  );

  const handleStartPractice = (item: PlaylistItem) => {
    navigate(`/student/practice/${item.id}`);
  };

  const handleSkip = async (itemId: string) => {
    try {
      await skip(itemId);
    } catch {
      // silently fail for now
    }
  };

  if (checkingOnboarding || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <CompassBuddy size={80} mood="thinking" className="mb-4 illust-bob" />
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        <p className="text-indigo-600 mt-3 text-sm font-medium">Loading your adventure...</p>
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

  const greeting = getGreeting();

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-20">
      {/* Illustrated Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white illust-slide-up">
        <FloatingStars count={8} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0 illust-bob">
            <RocketShip size={70} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">
              {greeting.emoji} {greeting.text}, {studentName}!
            </h1>
            <p className="text-white/70 text-sm mt-1">{formatDate()}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 illust-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <span className="text-lg">🗺️</span> Today's Progress
          </span>
          <span className="text-sm font-semibold text-indigo-600">
            {completedCount} / {totalActive} completed
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-700 ease-out relative"
            style={{ width: `${progressPercent}%` }}
          >
            {progressPercent > 15 && (
              <span className="absolute right-2 top-0.5 text-[10px] text-white font-bold">
                {Math.round(progressPercent)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* All Done Celebration */}
      {allDone && (
        <div className="relative overflow-hidden bg-gradient-to-r from-yellow-50 to-green-50 rounded-2xl shadow-sm border border-yellow-200 p-6 text-center illust-bounce-in">
          <ConfettiBurst />
          <div className="relative z-10">
            <CompassBuddy size={80} mood="celebrating" className="mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900">Amazing work today! 🎉</h2>
            <p className="text-gray-600 mt-1">You've completed all your skills for the day. Way to go!</p>
          </div>
        </div>
      )}

      {/* Playlist Items */}
      <div className="space-y-3 illust-stagger">
        {items
          .filter((item) => item.status !== 'skipped')
          .map((item) => {
            const reason = REASON_COLORS[item.reason] || REASON_COLORS.ready_to_learn;
            const domainName = item.skill?.domain?.name || 'Skill';
            const domainCode = item.skill?.domain?.code || '?';
            const domainCategory = (item.skill?.domain as any)?.category || 'literacy';
            const skillName = item.skill?.name || 'Unnamed Skill';
            const minutes = estimateMinutes(item.priority);
            const score = item.current_score;
            const borderColor = DOMAIN_BG_COLORS[domainCategory] || 'border-l-gray-300';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl shadow-sm border border-l-4 ${borderColor} p-4 transition-all illust-card-hover ${
                  item.status === 'completed' ? 'opacity-75 bg-green-50/50 border-l-green-400' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Domain illustration (small) */}
                  <div className="flex-shrink-0 mt-0.5">
                    {item.status === 'completed' ? (
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">✅</div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <DomainIllustration domain={domainName} size={28} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {domainCode} · {domainName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${reason.bg} ${reason.text}`}
                      >
                        <span>{reason.icon}</span> {reason.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1.5">{skillName}</h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>⏱️ ~{minutes} min</span>
                      {score != null && item.status === 'completed' && (
                        <span className="text-green-600 font-medium">Score: {score}%</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-2">
                    {(item.status === 'pending' || item.status === 'in_progress') && (
                      <>
                        <button
                          onClick={() => handleStartPractice(item)}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                        >
                          {item.status === 'in_progress' ? '▶ Continue' : '🚀 Start'}
                        </button>
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleSkip(item.id)}
                            className="px-3 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                          >
                            Skip
                          </button>
                        )}
                      </>
                    )}
                    {item.status === 'completed' && (
                      <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                        ✨ Done
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {items.length === 0 && !loading && (
          <EmptyState
            title="No skills scheduled yet"
            message="Your teacher will set up your playlist after your assessment!"
            illustration="compass"
          />
        )}
      </div>

      {/* Recently Mastered */}
      {recentlyMastered.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <button
            onClick={() => setShowMastered(!showMastered)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700 flex items-center gap-2">
              <span className="text-lg">🏆</span> Already Mastered ({recentlyMastered.length})
            </span>
            <span className="text-gray-400 text-sm">{showMastered ? '▲' : '▼'}</span>
          </button>
          {showMastered && (
            <div className="px-4 pb-4 space-y-2 border-t bg-gradient-to-b from-green-50/50 to-white">
              {recentlyMastered.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 text-sm text-gray-600">
                  <span className="text-green-500">⭐</span>
                  <span className="font-medium">{item.skill?.name || 'Skill'}</span>
                  <span className="text-gray-400">— {item.skill?.domain?.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Encouraging footer */}
      {totalActive > 0 && !allDone && (
        <div className="text-center py-2 illust-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <span className="illust-float inline-block" style={{ animationDelay: '0s' }}>⭐</span>
            Every skill makes you stronger!
            <span className="illust-float inline-block" style={{ animationDelay: '0.5s' }}>⭐</span>
          </p>
        </div>
      )}
    </div>
  );
}
