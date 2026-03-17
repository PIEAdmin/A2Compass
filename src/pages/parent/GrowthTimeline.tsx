import React, { useState, useMemo } from 'react';
import type { DomainSkillGroup, SkillProfileEntry } from '../../types/skills';
import { useStudentSkillProfile } from '../../hooks/useSkills';

const DOMAIN_ICONS: Record<string, string> = {
  A: '📖', B: '✍️', C: '🗣️', D: '📚', E: '🔤',
  F: '🔢', G: '➕', H: '📐', I: '📊', J: '🧩',
};

function formatMasteryDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

interface GrowthTimelineProps {
  studentId: string;
  studentName?: string;
  tierName?: string;
}

export default function GrowthTimeline({ studentId, studentName = 'Your Child', tierName }: GrowthTimelineProps) {
  const { groups, loading, error } = useStudentSkillProfile(studentId);
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [showShareMessage, setShowShareMessage] = useState(false);

  const totalMastered = useMemo(() => groups.reduce((s, g) => s + g.masteredCount, 0), [groups]);
  const totalSkills = useMemo(() => groups.reduce((s, g) => s + g.totalCount, 0), [groups]);
  const overallPercent = totalSkills > 0 ? Math.round((totalMastered / totalSkills) * 100) : 0;

  // Collect all mastery events, sorted by date
  const masteryTimeline = useMemo(() => {
    const events: (SkillProfileEntry & { domainIcon: string })[] = [];
    for (const group of groups) {
      for (const skill of group.skills) {
        if (skill.status === 'mastered' && skill.mastered_at) {
          events.push({ ...skill, domainIcon: DOMAIN_ICONS[skill.domain_code] || '📘' });
        }
      }
    }
    events.sort((a, b) => {
      const da = a.mastered_at ? new Date(a.mastered_at).getTime() : 0;
      const db = b.mastered_at ? new Date(b.mastered_at).getTime() : 0;
      return db - da;
    });
    return events;
  }, [groups]);

  const filteredTimeline = useMemo(() => {
    if (domainFilter === 'all') return masteryTimeline;
    return masteryTimeline.filter((e) => e.domain_code === domainFilter);
  }, [masteryTimeline, domainFilter]);

  const handleShare = () => {
    const lines = [
      `🌟 ${studentName}'s Learning Progress`,
      `${totalMastered} out of ${totalSkills} skills mastered (${overallPercent}%)`,
      '',
      ...groups
        .filter((g) => g.masteredCount > 0)
        .map((g) => `${DOMAIN_ICONS[g.domain.code] || '📘'} ${g.domain.name}: ${g.masteredCount}/${g.totalCount} mastered`),
      '',
      'Powered by A² Compass 🧭',
    ];
    if (navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n'));
    }
    setShowShareMessage(true);
    setTimeout(() => setShowShareMessage(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">Something went wrong loading the progress.</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{studentName}'s Growth Journey 🌱</h1>
            {tierName && (
              <span className="inline-block mt-1 px-3 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {tierName}
              </span>
            )}
          </div>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition-colors text-sm"
          >
            📤 Share Progress
          </button>
        </div>
        {showShareMessage && (
          <p className="text-sm text-green-600 mt-2">✅ Progress summary copied to clipboard!</p>
        )}
      </div>

      {/* Overall Progress Circle */}
      <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-8">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#6366f1"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(overallPercent / 100) * 327} 327`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600">{overallPercent}%</span>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Overall Progress</h2>
          <p className="text-gray-600 mt-1">
            {studentName} has mastered <span className="font-semibold text-indigo-600">{totalMastered}</span> out of{' '}
            <span className="font-semibold">{totalSkills}</span> skills. Keep it up! 🎉
          </p>
          {overallPercent >= 50 && (
            <p className="text-sm text-green-600 mt-2 font-medium">
              🌟 Halfway there and going strong!
            </p>
          )}
        </div>
      </div>

      {/* Domain Progress Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Progress by Area</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((group) => {
            const icon = DOMAIN_ICONS[group.domain.code] || '📘';
            const recentMastered = group.skills
              .filter((s) => s.status === 'mastered' && s.mastered_at)
              .sort((a, b) => new Date(b.mastered_at!).getTime() - new Date(a.mastered_at!).getTime())
              .slice(0, 5);

            return (
              <div key={group.domain.code} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{icon}</span>
                  <h3 className="font-semibold text-gray-900 text-sm">{group.domain.name}</h3>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${group.percentComplete}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {group.masteredCount}/{group.totalCount}
                  </span>
                </div>
                {recentMastered.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-400 font-medium">Recently mastered:</p>
                    {recentMastered.map((s) => (
                      <p key={s.skill_code} className="text-xs text-gray-600 flex items-center gap-1">
                        <span className="text-green-500">✓</span> {s.skill_name}
                      </p>
                    ))}
                  </div>
                )}
                {recentMastered.length === 0 && group.totalCount > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Working on it — great things ahead!</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mastery Timeline */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mastery Timeline</h2>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Areas</option>
            {groups.map((g) => (
              <option key={g.domain.code} value={g.domain.code}>
                {DOMAIN_ICONS[g.domain.code] || '📘'} {g.domain.name}
              </option>
            ))}
          </select>
        </div>

        {filteredTimeline.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredTimeline.map((event, i) => (
              <div key={`${event.skill_code}-${i}`} className="flex items-start gap-3 py-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                  {event.domainIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{studentName}</span> mastered{' '}
                    <span className="font-semibold text-green-700">{event.skill_name}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {event.domain_name} · {formatMasteryDate(event.mastered_at)}
                  </p>
                </div>
                <span className="text-green-500 flex-shrink-0">🏆</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No mastery milestones yet — they're coming soon! 💪</p>
          </div>
        )}
      </div>

      {/* Footer encouragement */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">
          Every small step is a big win. You're doing an amazing job supporting {studentName}'s learning! 💜
        </p>
      </div>
    </div>
  );
}
