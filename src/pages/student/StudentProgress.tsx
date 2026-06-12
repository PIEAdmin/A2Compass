import { useState, useEffect, useMemo } from 'react';
import { useStudentSkillProfile } from '../../hooks/useSkills';
import { useAuth } from '../../hooks';
import { studentService } from '../../services/students';
import type { MasterySummary } from '../../types';
import {
  GrowthPlant,
  PepperPenguin,
  FloatingStars,
  DomainIllustration,
  EmptyState,
} from '../../components/shared/Illustrations';
import { ReadAloud } from '../../components/shared/ReadAloud';

const DOMAIN_ICONS: Record<string, string> = {
  NUM: '🔢', ALG: '📐', GEO: '📏', MSR: '📊', DAT: '📈',
  PHO: '🔤', VOC: '📖', FLU: '📚', WRT: '✏️', CMP: '🧩',
  GRM: '📝', SPK: '🗣️',
};

const SUBJECT_COLORS: Record<string, { bar: string; bg: string }> = {
  math: { bar: 'from-blue-400 to-blue-600', bg: 'bg-blue-50' },
  'reading-ela': { bar: 'from-purple-400 to-purple-600', bg: 'bg-purple-50' },
  science: { bar: 'from-green-400 to-green-600', bg: 'bg-green-50' },
  'social-studies': { bar: 'from-amber-400 to-amber-600', bg: 'bg-amber-50' },
  'foreign-language': { bar: 'from-pink-400 to-pink-600', bg: 'bg-pink-50' },
  'creative-arts': { bar: 'from-rose-400 to-rose-600', bg: 'bg-rose-50' },
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

  // ───── Pepper Help ─────
  const [pepperTipProg, setPepperTipProg] = useState('');
  const [showPepperProg, setShowPepperProg] = useState(false);
  const pepperProgTips = [
    "Your garden grows every time you master a skill! 🌱",
    "Look how far you\'ve come — amazing progress! 🌟",
    "Every skill you practice makes you stronger! 💪",
    "Don\'t worry about being perfect — just keep growing! 🌻",
    "Check out which subjects need a little more water! 🌧️",
    "You\'re a learning superstar — keep it up! ⭐"
  ];
  const showPepperProgTip = () => {
    setPepperTipProg(pepperProgTips[Math.floor(Math.random() * pepperProgTips.length)]);
    setShowPepperProg(true);
  };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <GrowthPlant size={80} className="mb-4" />
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        <p className="text-green-600 mt-3 text-sm font-medium">Growing your garden... 🌻</p>
      </div>
    );
  }

  if (skillsError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <PepperPenguin size={90} mood="thinking" className="mx-auto mb-3" />
          <p className="text-red-700 font-medium">Oops! Something went wrong.</p>
          <p className="text-red-500 text-sm mt-1">{skillsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-20">
      {/* Illustrated Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg p-6 text-white illust-slide-up">
        <FloatingStars count={6} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0 illust-bob">
            <GrowthPlant size={70} />
          </div>
          <div>
            <ReadAloud text={"Welcome to your Growth Garden, " + firstName + "! Let's see how much you've grown!"} showIcon={false}>
              <h1 className="text-2xl font-bold">🌟 My Growth Garden</h1>
              <p className="text-white/80 mt-1">Look at your amazing growth, {firstName}! 🌱</p>
            </ReadAloud>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 illust-stagger">
        <div className="bg-white rounded-2xl shadow-sm border p-4 text-center illust-card-hover">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{totalMastered}</p>
          <ReadAloud text={totalMastered + " skills learned"} showIcon={false}><p className="text-xs text-gray-500 mt-0.5">⭐ Skills Learned!</p></ReadAloud>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-4 text-center illust-card-hover">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-2xl">🔥</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{streak}</p>
          <ReadAloud text={streak + " days in a row"} showIcon={false}><p className="text-xs text-gray-500 mt-0.5">🔥 Days in a Row!</p></ReadAloud>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-4 text-center illust-card-hover">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{overallPercent}%</p>
          <ReadAloud text={overallPercent + " percent complete"} showIcon={false}><p className="text-xs text-gray-500 mt-0.5">📈 My Level!</p></ReadAloud>
        </div>
      </div>

      {/* Overall Progress Ring */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex items-center gap-6 illust-card-hover">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="url(#progressGradient)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(overallPercent / 100) * 327} 327`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600">{overallPercent}%</span>
            <span className="text-[10px] text-gray-400">mastered</span>
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">Overall Progress</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalMastered} out of {totalSkills} skills mastered
          </p>
          {overallPercent >= 80 ? (
            <div className="mt-2">
              <p className="text-sm text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg inline-block">
                👑 SUPERSTAR! You&apos;re almost done — WOW!
              </p>
              <div className="flex gap-1 mt-1 justify-center">
                {'⭐'.repeat(5).split('').map((s, i) => <span key={i} className="text-xl animate-bounce" style={{ animationDelay: i * 0.1 + 's' }}>{s}</span>)}
              </div>
            </div>
          ) : overallPercent >= 50 ? (
            <div className="mt-2">
              <p className="text-sm text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg inline-block">
                🌟 Past halfway — you&apos;re a Learning Legend!
              </p>
              <div className="flex gap-1 mt-1">
                {'🌟🌟🌟'.split('').filter(c => c !== '').map((s, i) => <span key={i} className="text-lg">{s}</span>)}
              </div>
            </div>
          ) : overallPercent >= 25 ? (
            <p className="text-sm text-blue-600 font-bold mt-2 bg-blue-50 px-3 py-2 rounded-lg inline-block">
              🚀 Quarter of the way! Your garden is growing fast!
            </p>
          ) : overallPercent > 0 ? (
            <p className="text-sm text-purple-600 font-bold mt-2 bg-purple-50 px-3 py-2 rounded-lg inline-block">
              🌱 You planted your first seeds! Keep watering them!
            </p>
          ) : null}
        </div>
      </div>

      {/* Subject Mastery Bars */}
      {masterySummaries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span> Subject Mastery
          </h2>
          <div className="space-y-4">
            {masterySummaries.map((summary) => {
              const colors = SUBJECT_COLORS[summary.subject.slug] || { bar: 'from-indigo-400 to-indigo-600', bg: 'bg-indigo-50' };
              return (
                <div key={summary.subject.id} className={`${colors.bg} rounded-xl p-3`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{summary.subject.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{summary.subject.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{summary.currentPercentage}%</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${colors.bar} h-3 rounded-full transition-all duration-700`}
                      style={{ width: `${summary.currentPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
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
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">🧠</span> Skill Domains
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {groups.map((group) => {
              const icon = DOMAIN_ICONS[group.domain.code] || '📘';
              return (
                <div key={group.domain.code} className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 illust-card-hover">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-xl">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{group.domain.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-400 to-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${group.percentComplete}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">{group.masteredCount}/{group.totalCount}</span>
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
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">🏆</span> Recently Mastered
          </h2>
          <div className="space-y-2 illust-stagger">
            {recentlyMastered.map((skill, i) => (
              <div key={`${skill.name}-${i}`} className="flex items-center gap-3 py-2.5 px-3 border border-gray-100 rounded-xl bg-gradient-to-r from-green-50/50 to-white hover:from-green-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">{skill.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{skill.name}</p>
                  <p className="text-xs text-gray-400">{skill.domain}</p>
                </div>
                <span className="text-green-500 text-lg flex-shrink-0 animate-pulse">⭐</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalSkills === 0 && masterySummaries.length === 0 && (
        <EmptyState
          title="Your progress will show up here soon!"
          message="Complete some activities to start tracking your progress."
          illustration="compass"
        />
      )}

      {/* Fun encouragement with Pepper */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 text-center">
        <PepperPenguin size={70} mood="waving" className="mx-auto" />
        <ReadAloud text={totalMastered > 10 ? "Wow, " + firstName + "! You are a learning superstar!" : totalMastered > 0 ? "Great job, " + firstName + "! Keep growing your garden!" : "Start some activities and watch your garden bloom!"} showIcon={false}>
          <p className="text-sm font-bold mt-2 text-amber-800">
            {totalMastered > 10 ? (
              <>🏆 Wow, {firstName}! You are a LEARNING SUPERSTAR! 🌟</>
            ) : totalMastered > 0 ? (
              <>🌱 Great job, {firstName}! Keep growing your garden! 🌻</>
            ) : (
              <>🌱 Start some activities and watch your garden bloom! 🌻</>
            )}
          </p>
        </ReadAloud>
        {totalMastered > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Every skill you master makes you stronger! 💪✨
          </p>
        )}
      </div>
    
      {/* Floating Pepper */}
      <button
        onClick={showPepperProgTip}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700 hover:scale-110 active:scale-95 transition-all"
        title="Ask Pepper!"
      >
        <span className="text-2xl" style={{ animation: 'pepperBounce 2s ease-in-out infinite' }}>🐧</span>
      </button>
      {showPepperProg && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowPepperProg(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5" onClick={(e) => e.stopPropagation()} style={{ animation: 'bounceIn 0.3s ease-out' }}>
            <button onClick={() => setShowPepperProg(false)} className="absolute top-2 right-3 text-gray-400 hover:text-gray-600">✕</button>
            <div className="text-center">
              <span className="text-5xl inline-block" style={{ animation: 'pepperBounce 1s ease-in-out infinite' }}>🐧</span>
              <p className="text-sm font-bold text-green-800 mt-2">Pepper says:</p>
              <div className="mt-2 bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-sm text-green-800">{pepperTipProg}</p>
              </div>
              <button onClick={showPepperProgTip} className="mt-3 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-green-500 to-green-700 hover:shadow-md transition-all">
                💡 Another tip!
              </button>
            </div>
          </div>
        </div>
      )}

    <style>{`
        @keyframes pepperBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes bounceIn { 0% { transform: scale(0.8) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
