import { useState, useMemo } from 'react';
import { useStudentSkillProfile } from '../../hooks/useSkills';
import { useAuth } from '../../hooks';
import type { DomainSkillGroup } from '../../types/skills';
import {
  BookStack,
  NumberBlocks,
  CompassBuddy,
  FloatingStars,
  DomainIllustration,
  EmptyState,
} from '../../components/shared/Illustrations';

const DOMAIN_ICONS: Record<string, string> = {
  NUM: '🔢', ALG: '📐', GEO: '📏', MSR: '📊', DAT: '📈',
  PHO: '🔤', VOC: '📖', FLU: '📚', WRT: '✏️', CMP: '🧩',
  GRM: '📝', SPK: '🗣️',
};

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  mastered: { icon: '⭐', label: 'Mastered', color: 'text-green-700', bg: 'bg-green-50' },
  in_progress: { icon: '🔵', label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' },
  needs_practice: { icon: '🟠', label: 'Needs Practice', color: 'text-orange-600', bg: 'bg-orange-50' },
  struggling: { icon: '🟠', label: 'Working On It', color: 'text-orange-600', bg: 'bg-orange-50' },
  ready_to_learn: { icon: '⚪', label: 'Ready to Learn', color: 'text-gray-500', bg: 'bg-gray-50' },
  not_started: { icon: '⚪', label: 'Not Started', color: 'text-gray-400', bg: 'bg-gray-50' },
};

const CATEGORY_THEMES: Record<string, { gradient: string; headerBg: string; label: string; icon: React.ReactNode }> = {
  literacy: {
    gradient: 'from-purple-400 to-pink-500',
    headerBg: 'bg-purple-50',
    label: '📖 Literacy',
    icon: <BookStack size={36} />,
  },
  numeracy: {
    gradient: 'from-blue-400 to-cyan-500',
    headerBg: 'bg-blue-50',
    label: '🔢 Numeracy',
    icon: <NumberBlocks size={36} />,
  },
  daily_living: {
    gradient: 'from-green-400 to-emerald-500',
    headerBg: 'bg-green-50',
    label: '🏠 Daily Living',
    icon: <CompassBuddy size={36} mood="happy" />,
  },
};

export default function StudentSubjects() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const firstName = user?.fullName?.split(' ')[0] || 'Explorer';
  const { groups, loading, error } = useStudentSkillProfile(studentId);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const totalMastered = useMemo(() => groups.reduce((s, g) => s + g.masteredCount, 0), [groups]);
  const totalSkills = useMemo(() => groups.reduce((s, g) => s + g.totalCount, 0), [groups]);
  const progressPercent = totalSkills > 0 ? (totalMastered / totalSkills) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <BookStack size={80} className="mb-4" />
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
        <p className="text-purple-600 mt-3 text-sm font-medium">Loading your subjects...</p>
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

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-20">
      {/* Illustrated Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-2xl shadow-lg p-6 text-white illust-slide-up">
        <FloatingStars count={6} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0 illust-bob">
            <BookStack size={70} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">📚 My Subjects</h1>
            <p className="text-white/80 mt-1">See what you're learning, {firstName}!</p>
            {totalSkills > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-white h-3 rounded-full transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">
                    {totalMastered}/{totalSkills}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Domain Cards */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 illust-stagger">
          {groups.map((group) => {
            const icon = DOMAIN_ICONS[group.domain.code] || '📘';
            const category = group.domain.category || 'literacy';
            const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.literacy;
            const isExpanded = expandedDomain === group.domain.code;

            return (
              <div key={group.domain.code} className="bg-white rounded-2xl shadow-sm border overflow-hidden illust-card-hover">
                <button
                  onClick={() => setExpandedDomain(isExpanded ? null : group.domain.code)}
                  className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-sm">
                        <span className="text-2xl">{icon}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{group.domain.name}</h3>
                    </div>
                    <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${theme.headerBg}`}>
                      {theme.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r ${theme.gradient}`}
                        style={{ width: `${group.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {Math.round(group.percentComplete)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {group.masteredCount} of {group.totalCount} skills mastered
                  </p>
                </button>

                {/* Expanded Skills List */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-1.5 bg-gradient-to-b from-gray-50 to-white">
                    {group.skills.map((skill) => {
                      const status = STATUS_DISPLAY[skill.status] || STATUS_DISPLAY.not_started;
                      return (
                        <div key={skill.skill_code} className={`flex items-center gap-2 py-2 px-3 rounded-lg ${status.bg} transition-colors`}>
                          <span className="text-base flex-shrink-0">{status.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{skill.skill_name}</p>
                            <p className={`text-xs ${status.color} font-medium`}>{status.label}</p>
                          </div>
                          {skill.current_score > 0 && (
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              {skill.current_score}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {group.skills.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-3">No skills yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Your subjects will appear here!"
          message="Once your teacher reviews your skills, you'll see all your learning areas here."
          illustration="books"
        />
      )}

      {/* Fun encouragement */}
      {totalMastered > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50 rounded-2xl shadow-sm border border-yellow-200 p-5 text-center">
          <p className="text-lg font-medium">
            {totalMastered >= 10 ? '🌟 You\'re a superstar!' :
             totalMastered >= 5 ? '🚀 You\'re on a roll!' :
             '💪 Great start, keep going!'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            You've mastered {totalMastered} skill{totalMastered !== 1 ? 's' : ''} so far!
          </p>
        </div>
      )}
    </div>
  );
}
