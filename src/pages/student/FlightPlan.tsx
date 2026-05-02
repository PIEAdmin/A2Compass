import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlaylistItem, PlaylistReason, PlaylistItemStatus } from '../../types/skills';
import { usePlaylist } from '../../hooks/useSkills';
import { useAuth } from '../../hooks';
import { getOnboardingState } from '../../services/onboarding.service';

const REASON_COLORS: Record<PlaylistReason, { bg: string; text: string; label: string }> = {
  needs_practice: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Needs Practice' },
  ready_to_learn: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready to Learn' },
  foundational_gap: { bg: 'bg-red-100', text: 'text-red-700', label: 'Foundation' },
  spiral_review: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Spiral Review' },
  teacher_focus: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Teacher Focus' },
  teacher_added: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Teacher Added' },
};

const STATUS_ICONS: Record<PlaylistItemStatus, string> = {
  pending: '○',
  in_progress: '◐',
  completed: '✅',
  skipped: '⏭️',
};

function estimateMinutes(priority: number): number {
  if (priority >= 8) return 5;
  if (priority >= 5) return 10;
  return 15;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
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
  const today = new Date().toISOString().split('T')[0];
  const { items, loading, error, complete, skip, start } = usePlaylist(studentId, today);
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
        // If orientation is done but warm activities not yet completed, go there
        if (!state.warm_activities_unlocked && !state.assessment_completed) {
          // Orientation is done, warm activities should be unlocked by completeOrientation
          // but if not, still let them proceed to flight plan
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

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {studentName}! 🚀
        </h1>
        <p className="text-gray-500 mt-1">{formatDate()}</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Today's Progress</span>
          <span className="text-sm font-semibold text-indigo-600">
            {completedCount} / {totalActive} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-indigo-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${totalActive > 0 ? (completedCount / totalActive) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* All Done Celebration */}
      {allDone && (
        <div className="bg-gradient-to-r from-yellow-50 to-green-50 rounded-xl shadow-sm border border-yellow-200 p-6 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <h2 className="text-xl font-bold text-gray-900">Amazing work today!</h2>
          <p className="text-gray-600 mt-1">You've completed all your skills for the day. Way to go!</p>
        </div>
      )}

      {/* Playlist Items */}
      <div className="space-y-3">
        {items
          .filter((item) => item.status !== 'skipped')
          .map((item) => {
            const reason = REASON_COLORS[item.reason] || REASON_COLORS.ready_to_learn;
            const domainName = item.skill?.domain?.name || 'Skill';
            const domainCode = item.skill?.domain?.code || '?';
            const skillName = item.skill?.name || 'Unnamed Skill';
            const minutes = estimateMinutes(item.priority);
            const score = item.current_score;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
                  item.status === 'completed' ? 'opacity-75 border-green-200 bg-green-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="text-2xl mt-0.5 flex-shrink-0">
                    {STATUS_ICONS[item.status]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {domainCode} · {domainName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${reason.bg} ${reason.text}`}
                      >
                        {reason.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1">{skillName}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ~{minutes} min
                      {score != null && item.status === 'completed' && (
                        <span className="ml-2 text-green-600 font-medium">Score: {score}%</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-2">
                    {(item.status === 'pending' || item.status === 'in_progress') && (
                      <>
                        <button
                          onClick={() => handleStartPractice(item)}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {item.status === 'in_progress' ? 'Continue' : 'Start'}
                        </button>
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleSkip(item.id)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Skip
                          </button>
                        )}
                      </>
                    )}
                    {item.status === 'completed' && (
                      <span className="text-green-600 font-medium text-sm">Complete</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {items.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-gray-700 font-medium">No skills scheduled for today yet.</p>
            <p className="text-gray-400 text-sm mt-1">Your teacher will set up your playlist after your assessment!</p>
          </div>
        )}
      </div>

      {/* Recently Mastered */}
      {recentlyMastered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border">
          <button
            onClick={() => setShowMastered(!showMastered)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <span className="font-medium text-gray-700">
              ✅ Already Mastered ({recentlyMastered.length})
            </span>
            <span className="text-gray-400 text-sm">{showMastered ? '▲' : '▼'}</span>
          </button>
          {showMastered && (
            <div className="px-4 pb-4 space-y-2">
              {recentlyMastered.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✅</span>
                  <span>{item.skill?.name || 'Skill'}</span>
                  <span className="text-gray-400">— {item.skill?.domain?.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
