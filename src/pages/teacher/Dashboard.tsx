import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { studentService } from '../../services/students';
import { Link } from 'react-router-dom';
import type { StudentProfile, MasterySummary } from '../../types';

interface StudentData {
  student: StudentProfile;
  mastery: MasterySummary[];
  streak: number;
}

const TIER_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  'explorers-camp': { label: "Explorer's Camp", bg: 'bg-green-100', text: 'text-green-700' },
  'scholars-guild': { label: "Scholar's Guild", bg: 'bg-blue-100', text: 'text-blue-700' },
  'the-collegium': { label: 'The Collegium', bg: 'bg-purple-100', text: 'text-purple-700' },
};

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

function getOverallMastery(mastery: MasterySummary[]): number {
  if (mastery.length === 0) return 0;
  const avg = mastery.reduce((sum, m) => sum + m.currentPercentage, 0) / mastery.length;
  return Math.round(avg);
}

function getStudentDisplayName(student: StudentProfile): string {
  if (student.profile) {
    const name = [student.profile.first_name, student.profile.last_name].filter(Boolean).join(' ');
    if (name) return name;
  }
  return 'Student';
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const teacherName = user?.fullName?.split(' ')[0] || 'Teacher';
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const students = await studentService.getStudentsByTeacher(user!.id);

      const dataPromises = students.map(async (student) => {
        const [mastery, streak] = await Promise.all([
          studentService.getMasterySummaries(student.id).catch(() => []),
          studentService.getStreak(student.id).catch(() => 0),
        ]);
        return { student, mastery, streak };
      });

      setStudentData(await Promise.all(dataPromises));
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err?.message || 'Failed to load dashboard data');
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">Something went wrong loading the dashboard.</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalStudents = studentData.length;
  const avgMastery = totalStudents > 0
    ? Math.round(studentData.reduce((sum, s) => sum + getOverallMastery(s.mastery), 0) / totalStudents)
    : 0;
  const activeStreaks = studentData.filter((s) => s.streak > 0).length;
  const needsAttention = studentData.filter((s) => getOverallMastery(s.mastery) < 30 && s.mastery.length > 0).length;

  const QUICK_LINKS = [
    { path: '/teacher/mission-control', icon: '🎯', label: 'Mission Control' },
    { path: '/teacher/students', icon: '👩‍🎓', label: 'My Students' },
    { path: '/teacher/skill-map', icon: '🧠', label: 'Skill Map' },
    { path: '/teacher/assessments', icon: '📋', label: 'Assessments' },
    { path: '/teacher/mastery', icon: '📊', label: 'Mastery Tracker' },
    { path: '/teacher/schedule', icon: '📅', label: 'Schedule' },
    { path: '/teacher/lessons', icon: '📖', label: 'Lessons' },
    { path: '/teacher/activities', icon: '🎮', label: 'Activities' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {teacherName}! 🎯
          </h1>
          <p className="text-indigo-200 mt-1">{formatDate()}</p>
          <p className="text-indigo-100 text-sm mt-2">
            {totalStudents} student{totalStudents !== 1 ? 's' : ''} in your class · Here's your daily overview.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl">👩‍🎓</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                <p className="text-xs text-gray-500">Total Students</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl">📊</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{avgMastery}%</p>
                <p className="text-xs text-gray-500">Avg Mastery</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-xl">🔥</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeStreaks}</p>
                <p className="text-xs text-gray-500">Active Streaks</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-xl">⚠️</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{needsAttention}</p>
                <p className="text-xs text-gray-500">Needs Attention</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Links</h2>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="text-xs text-gray-600 font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Student Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">👩‍🎓 Student Overview</h2>
          {studentData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentData.map(({ student, mastery, streak }) => {
                const name = getStudentDisplayName(student);
                const overallMastery = getOverallMastery(mastery);
                const tierSlug = student.tier?.slug || '';
                const tierBadge = TIER_BADGES[tierSlug];

                return (
                  <div key={student.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{name}</h3>
                          <p className="text-xs text-gray-400">Grade {student.grade_level}</p>
                        </div>
                      </div>
                      {tierBadge && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tierBadge.bg} ${tierBadge.text}`}>
                          {tierBadge.label}
                        </span>
                      )}
                    </div>

                    {/* Mastery & Streak */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Mastery</span>
                          <span className="text-xs font-semibold text-gray-700">{overallMastery}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              overallMastery >= 70 ? 'bg-green-500' :
                              overallMastery >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${overallMastery}%` }}
                          />
                        </div>
                      </div>
                      {streak > 0 && (
                        <div className="text-center flex-shrink-0">
                          <p className="text-lg font-bold text-orange-500">🔥{streak}</p>
                          <p className="text-[10px] text-gray-400">streak</p>
                        </div>
                      )}
                    </div>

                    {/* Subject mini bars */}
                    {mastery.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {mastery.slice(0, 4).map((m) => (
                          <div key={m.subject.id} className="flex items-center gap-2">
                            <span className="text-xs w-20 truncate text-gray-500">{m.subject.name}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-indigo-400 h-1.5 rounded-full"
                                style={{ width: `${m.currentPercentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 w-8 text-right">{m.currentPercentage}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <Link
                        to={`/teacher/skill-map?student=${student.id}`}
                        className="flex-1 text-center py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        🧠 Skill Map
                      </Link>
                      <Link
                        to={`/teacher/mission-control?student=${student.id}`}
                        className="flex-1 text-center py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        🎯 Flight Plan
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <p className="text-4xl mb-3">👩‍🎓</p>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">No students yet</h3>
              <p className="text-gray-500 text-sm">Students will appear here once they're enrolled.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">
            A² Compass — Achievement Academy · Empowering learners every day 🧭
          </p>
        </div>
      </div>
    </div>
  );
}
