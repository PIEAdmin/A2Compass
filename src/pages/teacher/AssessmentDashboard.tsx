// ============================================================
// A² Compass — Teacher Assessment Dashboard
// ============================================================
import { useState, useEffect } from 'react';
import { Header } from '../../components/layout';
import { LoadingSpinner } from '../../components/common';
import { useAssessmentDashboard } from '../../hooks/useAssessment';
import { assessmentService } from '../../services/assessment.service';
import { studentService } from '../../services/students';
import { useAuth } from '../../hooks';
import type { StudentProfile } from '../../types';
import { profileDisplayName } from '../../types';
import type {
  AssessmentSession,
  AssessmentSkillResult,
  SessionType,
  Proficiency,
} from '../../types/assessment';

// ---------- Proficiency colors ----------
const PROFICIENCY_COLORS: Record<Proficiency, string> = {
  mastered: 'bg-green-500',
  needs_practice: 'bg-yellow-400',
  not_ready: 'bg-red-400',
  not_assessed: 'bg-gray-200',
};

const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  mastered: 'Mastered',
  needs_practice: 'Needs Practice',
  not_ready: 'Not Ready',
  not_assessed: 'Not Assessed',
};

// ==========================================================
// Main Component
// ==========================================================
export default function AssessmentDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<AssessmentSkillResult[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    sessions,
    latestResults,
    summary,
    loading: dashLoading,
    error,
    refresh,
  } = useAssessmentDashboard(selectedStudentId ?? undefined);

  // Load students
  useEffect(() => {
    if (!user) return;
    loadStudents();
  }, [user]);

  async function loadStudents() {
    setStudentsLoading(true);
    try {
      const data = await studentService.getStudentsByTeacher(user!.id);
      setStudents(data);
      if (data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data[0].user_id);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setStudentsLoading(false);
    }
  }

  // Launch assessment for selected student
  async function handleLaunchAssessment(type: SessionType) {
    if (!selectedStudentId) return;
    try {
      await assessmentService.startAssessmentSession(selectedStudentId, type);
      setLaunchModalOpen(false);
      refresh();
    } catch (err: any) {
      alert('Failed to start assessment: ' + (err.message || 'Unknown error'));
    }
  }

  // View session details
  async function handleViewSession(sessionId: string) {
    setDetailLoading(true);
    try {
      const results = await assessmentService.getSessionResults(sessionId);
      setSessionDetail(results);
    } catch (err) {
      console.error('Failed to load session details:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  const selectedStudent = students.find((s) => s.user_id === selectedStudentId);

  if (studentsLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="📋 Assessment Center"
        subtitle="Launch, monitor, and review student assessments"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ---------- Left Sidebar: Student List ---------- */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Students</h3>
              <div className="space-y-1">
                {students.map((s) => {
                  const isActive = s.user_id === selectedStudentId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.user_id);
                        setSessionDetail(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <span className="mr-2">
                        {isActive ? '●' : '○'}
                      </span>
                      {profileDisplayName(s.profile, 'Student')}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setLaunchModalOpen(true)}
                  disabled={!selectedStudentId}
                  className="w-full py-2 px-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg
                             hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  + New Assessment
                </button>
              </div>
            </div>
          </div>

          {/* ---------- Main Content ---------- */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedStudentId ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Select a student
                </h3>
                <p className="text-gray-500 text-sm">
                  Choose a student from the list to view their assessment data.
                </p>
              </div>
            ) : dashLoading ? (
              <LoadingSpinner size="lg" />
            ) : (
              <>
                {/* Student Header + Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {profileDisplayName(selectedStudent?.profile, 'Student')}
                      </h2>
                      {summary && (
                        <p className="text-sm text-gray-500 mt-1">
                          {summary.latestSessionDate
                            ? `Latest Assessment: ${new Date(summary.latestSessionDate).toLocaleDateString()}`
                            : 'No assessments yet'}
                          {summary.totalSkillsAssessed > 0 && (
                            <span className="ml-3">
                              Skills Assessed: {summary.totalSkillsAssessed} | Mastered:{' '}
                              {summary.totalSkillsMastered}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLaunchAssessment('initial_placement')}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg
                                   hover:bg-indigo-700 transition-colors"
                      >
                        Start Placement
                      </button>
                      <button
                        onClick={() => handleLaunchAssessment('skill_check')}
                        className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg
                                   hover:bg-teal-700 transition-colors"
                      >
                        Quick Check
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skill Profile Heatmap */}
                {summary && summary.domainBreakdown.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">
                      Skill Profile
                    </h3>
                    <div className="space-y-3">
                      {summary.domainBreakdown.map((domain) => {
                        const total =
                          domain.skillsMastered +
                          domain.skillsNeedsPractice +
                          domain.skillsNotReady +
                          domain.skillsNotAssessed;
                        return (
                          <div key={domain.domainId}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {domain.domainName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {domain.skillsMastered}/{total} mastered
                              </span>
                            </div>
                            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                              {domain.skillsMastered > 0 && (
                                <div
                                  className="bg-green-500 transition-all"
                                  style={{
                                    width: `${(domain.skillsMastered / total) * 100}%`,
                                  }}
                                />
                              )}
                              {domain.skillsNeedsPractice > 0 && (
                                <div
                                  className="bg-yellow-400 transition-all"
                                  style={{
                                    width: `${(domain.skillsNeedsPractice / total) * 100}%`,
                                  }}
                                />
                              )}
                              {domain.skillsNotReady > 0 && (
                                <div
                                  className="bg-red-400 transition-all"
                                  style={{
                                    width: `${(domain.skillsNotReady / total) * 100}%`,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4 mt-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-green-500" /> Mastered
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-yellow-400" /> Needs Practice
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-red-400" /> Not Ready
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-gray-200" /> Not Assessed
                      </span>
                    </div>
                  </div>
                )}

                {/* Session History */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Session History
                  </h3>
                  {sessions.length === 0 ? (
                    <p className="text-gray-400 text-sm">No sessions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((s) => (
                        <SessionRow
                          key={s.id}
                          session={s}
                          isExpanded={
                            sessionDetail !== null &&
                            sessionDetail[0]?.session_id === s.id
                          }
                          onToggle={() => handleViewSession(s.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Session Detail Drill-down */}
                {detailLoading && <LoadingSpinner size="md" />}
                {sessionDetail && !detailLoading && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">
                      Session Detail — Skill Results
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="py-2 pr-4">Skill</th>
                            <th className="py-2 pr-4">Domain</th>
                            <th className="py-2 pr-4">Items</th>
                            <th className="py-2 pr-4">Score</th>
                            <th className="py-2">Proficiency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionDetail.map((r) => (
                            <tr key={r.id} className="border-b border-gray-50">
                              <td className="py-2 pr-4 font-medium text-gray-800">
                                {r.skill_name || r.skill_id}
                              </td>
                              <td className="py-2 pr-4 text-gray-500">
                                {r.domain_name || '—'}
                              </td>
                              <td className="py-2 pr-4 text-gray-600">
                                {r.items_correct}/{r.items_attempted}
                              </td>
                              <td className="py-2 pr-4 text-gray-600">
                                {r.score_percent}%
                              </td>
                              <td className="py-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
                                    ${
                                      r.proficiency === 'mastered'
                                        ? 'bg-green-100 text-green-800'
                                        : r.proficiency === 'needs_practice'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : r.proficiency === 'not_ready'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      PROFICIENCY_COLORS[r.proficiency]
                                    }`}
                                  />
                                  {PROFICIENCY_LABELS[r.proficiency]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Launch Modal ---------- */}
      {launchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Launch Assessment
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Choose assessment type for{' '}
              <strong>{profileDisplayName(selectedStudent?.profile, 'this student')}</strong>:
            </p>
            <div className="space-y-3">
              {([
                {
                  type: 'initial_placement' as SessionType,
                  label: '📋 Initial Placement',
                  desc: 'Full skill assessment across all domains',
                },
                {
                  type: 'skill_check' as SessionType,
                  label: '🎯 Skill Check',
                  desc: 'Quick check on specific skills',
                },
                {
                  type: 'spiral_review' as SessionType,
                  label: '🔄 Spiral Review',
                  desc: 'Review previously assessed skills',
                },
                {
                  type: 'mastery_attempt' as SessionType,
                  label: '⭐ Mastery Attempt',
                  desc: 'Attempt to master needs-practice skills',
                },
              ] as const).map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => handleLaunchAssessment(type)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200
                             hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                >
                  <span className="font-semibold text-gray-800">{label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setLaunchModalOpen(false)}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl shadow-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Session Row
// ==========================================================
function SessionRow({
  session,
  isExpanded,
  onToggle,
}: {
  session: AssessmentSession;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const date = session.started_at
    ? new Date(session.started_at).toLocaleDateString()
    : '—';
  const typeLabels: Record<string, string> = {
    initial_placement: 'Placement',
    skill_check: 'Skill Check',
    spiral_review: 'Spiral Review',
    mastery_attempt: 'Mastery Attempt',
    teacher_initiated: 'Teacher Initiated',
  };
  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    paused: 'bg-yellow-100 text-yellow-700',
    abandoned: 'bg-gray-100 text-gray-500',
    not_started: 'bg-gray-100 text-gray-500',
  };

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors
        ${isExpanded ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-800">{date}</span>
          <span className="mx-2 text-gray-300">•</span>
          <span className="text-sm text-gray-600">
            {typeLabels[session.session_type] || session.session_type}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {session.skills_assessed} skills | {session.items_attempted} items
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              statusColors[session.status] || 'bg-gray-100 text-gray-500'
            }`}
          >
            {session.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </button>
  );
}
