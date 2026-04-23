import { useState, useMemo } from 'react';
import { useStudentSkillProfile } from '../../hooks/useSkills';
import { useAuth } from '../../hooks';
import type { DomainSkillGroup } from '../../types/skills';

const DOMAIN_ICONS: Record<string, string> = {
  NUM: '🔢', ALG: '📐', GEO: '📏', MSR: '📊', DAT: '📈',
  PHO: '🔤', VOC: '📖', FLU: '📚', WRT: '✏️', CMP: '🧩',
  GRM: '📝', SPK: '🗣️',
};

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  mastered: { icon: '✅', label: 'Mastered', color: 'text-green-600' },
  in_progress: { icon: '◐', label: 'In Progress', color: 'text-blue-600' },
  needs_practice: { icon: '◐', label: 'Needs Practice', color: 'text-orange-600' },
  struggling: { icon: '◐', label: 'Working On It', color: 'text-orange-600' },
  ready_to_learn: { icon: '○', label: 'Ready to Learn', color: 'text-gray-500' },
  not_started: { icon: '○', label: 'Not Started', color: 'text-gray-400' },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  literacy: { bg: 'bg-purple-100', text: 'text-purple-700' },
  numeracy: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function StudentSubjects() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const firstName = user?.fullName?.split(' ')[0] || 'Explorer';
  const { groups, loading, error } = useStudentSkillProfile(studentId);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const totalMastered = useMemo(() => groups.reduce((s, g) => s + g.masteredCount, 0), [groups]);
  const totalSkills = useMemo(() => groups.reduce((s, g) => s + g.totalCount, 0), [groups]);

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

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">📚 My Subjects</h1>
        <p className="text-gray-500 mt-1">See what you're learning, {firstName}!</p>
        {totalSkills > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${totalSkills > 0 ? (totalMastered / totalSkills) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-indigo-600">
              {totalMastered}/{totalSkills} mastered
            </span>
          </div>
        )}
      </div>

      {/* Domain Cards */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => {
            const icon = DOMAIN_ICONS[group.domain.code] || '📘';
            const catColors = CATEGORY_COLORS[group.domain.category] || CATEGORY_COLORS.literacy;
            const isExpanded = expandedDomain === group.domain.code;

            return (
              <div key={group.domain.code} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => setExpandedDomain(isExpanded ? null : group.domain.code)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{icon}</span>
                      <h3 className="font-semibold text-gray-900">{group.domain.name}</h3>
                    </div>
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catColors.bg} ${catColors.text}`}>
                      {group.domain.category === 'literacy' ? 'Literacy' : 'Numeracy'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          group.percentComplete >= 80 ? 'bg-green-500' :
                          group.percentComplete >= 40 ? 'bg-yellow-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${group.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                      {Math.round(group.percentComplete)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {group.masteredCount} of {group.totalCount} skills mastered
                  </p>
                </button>

                {/* Expanded Skills List */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-2 bg-gray-50">
                    {group.skills.map((skill) => {
                      const status = STATUS_DISPLAY[skill.status] || STATUS_DISPLAY.not_started;
                      return (
                        <div key={skill.skill_code} className="flex items-center gap-2 py-1">
                          <span className="text-lg flex-shrink-0">{status.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{skill.skill_name}</p>
                            <p className={`text-xs ${status.color}`}>{status.label}</p>
                          </div>
                          {skill.current_score > 0 && (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {skill.current_score}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {group.skills.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">No skills yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-4xl mb-3">📖</p>
          <p className="text-gray-700 font-medium">Your subjects will appear here after your assessment!</p>
          <p className="text-gray-400 text-sm mt-2">
            Once your teacher reviews your skills, you'll see all your learning areas here.
          </p>
        </div>
      )}

      {/* Fun encouragement */}
      {totalMastered > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-green-50 rounded-xl shadow-sm border border-yellow-200 p-4 text-center">
          <p className="text-lg">
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
