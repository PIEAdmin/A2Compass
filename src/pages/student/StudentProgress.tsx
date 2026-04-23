import { useState, useEffect, useMemo } from 'react';
import { useStudentSkillProfile } from '../../hooks/useSkills';
import { useAuth } from '../../hooks';
import { studentService } from '../../services/students';
import type { MasterySummary } from '../../types';

const DOMAIN_ICONS: Record<string, string> = {
  NUM: '🔢', ALG: '📐', GEO: '📏', MSR: '📊', DAT: '📈',
  PHO: '🔤', VOC: '📖', FLU: '📚', WRT: '✏️', CMP: '🧩',
  GRM: '📝', SPK: '🗣️',
};

const SUBJECT_COLORS: Record<string, string> = {
  math: 'bg-blue-500',
  'reading-ela': 'bg-purple-500',
  science: 'bg-green-500',
  'social-studies': 'bg-amber-500',
  'foreign-language': 'bg-pink-500',
  'creative-arts': 'bg-rose-500',
};

export default function StudentProgress() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const firstName = user?.fullName?.split(' ')[0] || 'Explorer';
  const { groups, loading: skillsLoading, error: skillsError } = useStudentSkillProfile(studentId);
  const [streak, setStreak] = useState(0);
  const [masterySummaries, setMasterySummaries] = useState<MasterySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const [streakData, masteryData] = await Promise.all([
        studentService.getStreak(studentId),
        studentService.getMasterySummaries(studentId),
      ]);
      setStreak(streakData);
      setMasterySummaries(masteryData);
    } catch (err) {
      console.error('Failed to load progress data:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalMastered = useMemo(() => groups.reduce((s, g) => s + g.masteredCount, 0), [groups]);
  const totalSkills = useMemo(() => groups.reduce((s, g) => s + g.totalCount, 0), [groups]);
  const overallPercent = totalSkills > 0 ? Math.round((totalMastered / totalSkills) * 100) : 0;

  const recentlyMastered = useMemo(() => {
    const skills: { name: string; domain: string; icon: string; date: string }[] = [];
    for (const group of groups) {
      for (const skill of group.skills) {
        if (skill.status === 'mastered' && skill.mastered_at) {
          skills.push({
            name: skill.skill_name,
            domain: skill.domain_name,
            icon: DOMAIN_ICONS[skill.domain_code] || '📘',
            date: skill.mastered_at,
          });
        }
      }
    }
    skills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return skills.slice(0, 8);
  }, [groups]);

  const isLoading = loading || skillsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (skillsError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">Oops! Something went wrong.</p>
          <p className="text-red-500 text-sm mt-1">{skillsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">🎯 My Progress</h1>
        <p className="text-gray-500 mt-1">Look how far you've come, {firstName}!</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-indigo-600">{totalMastered}</p>
          <p className="text-xs text-gray-500 mt-1">Skills Mastered</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-orange-500">{streak}</p>
          <p className="text-xs text-gray-500 mt-1">Day Streak 🔥</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{overallPercent}%</p>
          <p className="text-xs text-gray-500 mt-1">Overall Mastery</p>
        </div>
      </div>

      {/* Overall Progress Ring */}
      <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-6">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="#6366f1" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(overallPercent / 100) * 327} 327`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-indigo-600">{overallPercent}%</span>
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Overall Progress</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalMastered} out of {totalSkills} skills mastered
          </p>
          {overallPercent >= 50 ? (
            <p className="text-sm text-green-600 mt-1 font-medium">🌟 You're past halfway — amazing!</p>
          ) : overallPercent > 0 ? (
            <p className="text-sm text-blue-600 mt-1 font-medium">🚀 Keep going, you're doing great!</p>
          ) : null}
        </div>
      </div>

      {/* Subject Mastery Bars */}
      {masterySummaries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">📊 Subject Mastery</h2>
          <div className="space-y-4">
            {masterySummaries.map((summary) => {
              const barColor = SUBJECT_COLORS[summary.subject.slug] || 'bg-indigo-500';
              return (
                <div key={summary.subject.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{summary.subject.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{summary.subject.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-600">{summary.currentPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${barColor} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${summary.currentPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {summary.standardsMastered} of {summary.standardsTotal} standards mastered
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Domain Breakdown */}
      {groups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">🧠 Skill Domains</h2>
          <div className="grid grid-cols-2 gap-3">
            {groups.map((group) => {
              const icon = DOMAIN_ICONS[group.domain.code] || '📘';
              return (
                <div key={group.domain.code} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{group.domain.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${group.percentComplete}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">{group.masteredCount}/{group.totalCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Mastered */}
      {recentlyMastered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-3">🏆 Recently Mastered</h2>
          <div className="space-y-2">
            {recentlyMastered.map((skill, i) => (
              <div key={`${skill.name}-${i}`} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-lg">{skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{skill.name}</p>
                  <p className="text-xs text-gray-400">{skill.domain}</p>
                </div>
                <span className="text-green-500 text-lg">✅</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalSkills === 0 && masterySummaries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-gray-700 font-medium">Your progress will show up here soon!</p>
          <p className="text-gray-400 text-sm mt-2">Complete some activities to start tracking your progress.</p>
        </div>
      )}

      {/* Fun footer */}
      {totalMastered > 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-400">
            Every skill you master makes you stronger! 💪✨
          </p>
        </div>
      )}
    </div>
  );
}
