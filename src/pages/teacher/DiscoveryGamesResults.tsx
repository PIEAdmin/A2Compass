// ============================================================
// A² Compass — Discovery Games Results
// View mini-assessment results and apply placement to skill graph
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { Header } from '../../components/layout';
import { LoadingSpinner } from '../../components/common';
import { supabase } from '../../services/supabase';

interface MiniAssessmentSession {
  id: string;
  student_name: string;
  student_age: number | null;
  completed_at: string;
  total_correct: number;
  total_questions: number;
  score_percent: number;
  domain_scores: Record<string, number> | null;
  section_scores: any[] | null;
  raw_results: any[] | null;
  duration_seconds: number | null;
  created_at: string;
}

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: number;
}

interface PlacementModalProps {
  session: MiniAssessmentSession;
  students: StudentProfile[];
  onClose: () => void;
  onApplied: (sessionId: string, studentId: string) => void;
}

// Mapping of Discovery Games sections → skill domains
const SECTION_DOMAIN_MAP: Record<string, { domains: string[]; codes: string[] }> = {
  'Uppercase Letters': { domains: ['Letter Recognition'], codes: ['B'] },
  'Lowercase Letters': { domains: ['Letter Recognition'], codes: ['B'] },
  'Letter Sounds': { domains: ['Phonological Awareness', 'Phonics'], codes: ['C', 'D'] },
  'Counting Objects': { domains: ['Counting & Cardinality'], codes: ['G'] },
  'Number Recognition': { domains: ['Counting & Cardinality'], codes: ['G'] },
  'Days of the Week': { domains: ['Measurement & Data'], codes: ['J'] },
};

const DOMAIN_LABELS: Record<string, string> = {
  ela: 'Language Arts',
  math: 'Mathematics',
  'language-arts': 'Language Arts',
  mathematics: 'Mathematics',
};

const DOMAIN_ICONS: Record<string, string> = {
  ela: '📖',
  math: '🔢',
  'language-arts': '📖',
  mathematics: '🔢',
};

function getGradeEquivalent(score: number): string {
  if (score >= 90) return 'Above Grade Level';
  if (score >= 70) return 'At Grade Level';
  if (score >= 50) return 'Approaching Grade Level';
  return 'Below Grade Level';
}

function getGradeColor(score: number): string {
  if (score >= 90) return 'text-green-700 bg-green-50 border-green-200';
  if (score >= 70) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (score >= 50) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function getScoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-400';
}

function getPlacementTier(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'Pre-K/K mastered → Grade 1-2 ready', color: 'text-green-700' };
  if (pct >= 50) return { label: 'Pre-K/K in progress', color: 'text-yellow-700' };
  return { label: 'Entry-point practice needed', color: 'text-red-600' };
}

// ============================================================
// Placement Modal Component
// ============================================================
function PlacementModal({ session, students, onClose, onApplied }: PlacementModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-match by first name
  useEffect(() => {
    const match = students.find(
      (s) => s.first_name.toLowerCase() === session.student_name.toLowerCase()
    );
    if (match) {
      setSelectedStudentId(match.id);
    }
  }, [students, session.student_name]);

  const sectionScores: any[] = Array.isArray(session.section_scores)
    ? session.section_scores
    : [];

  async function handleApply() {
    if (!selectedStudentId) {
      setError('Please select a student profile');
      return;
    }
    setApplying(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('apply_discovery_placement', {
        p_student_id: selectedStudentId,
        p_section_scores: sectionScores,
      });

      if (rpcError) throw rpcError;

      console.log('Placement result:', data);
      onApplied(session.id, selectedStudentId);
    } catch (err: any) {
      console.error('Placement failed:', err);
      setError(err.message || 'Failed to apply placement');
    } finally {
      setApplying(false);
    }
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">🎯 Apply Placement</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Student Matching */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Match "{session.student_name}" to a student profile:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">— Select student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} (Grade {s.grade_level})
                  {s.first_name.toLowerCase() === session.student_name.toLowerCase()
                    ? ' ✓ auto-match'
                    : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Section → Domain Mapping Preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Score → Skill Domain Mapping
            </h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
              {sectionScores.map((sec: any, idx: number) => {
                const pct = sec.total > 0 ? (sec.correct / sec.total) * 100 : 0;
                const mapping = SECTION_DOMAIN_MAP[sec.label];
                const tier = getPlacementTier(pct);
                return (
                  <div key={idx} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        {sec.emoji || '📋'} {sec.label}
                      </span>
                      <span className="text-sm font-bold text-gray-700">
                        {sec.correct}/{sec.total} ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        → {mapping ? mapping.codes.map((c) => `Domain ${c}`).join(', ') : 'Unknown'}
                      </span>
                      <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
                    </div>
                  </div>
                );
              })}
              <div className="px-4 py-3 bg-blue-50/50">
                <div className="text-xs text-blue-700">
                  <span className="font-semibold">Uncovered domains</span> (A, E, F, H, I) will
                  have entry-point skills set to <em>ready_to_learn</em>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={applying || !selectedStudentId}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {applying ? (
              <>
                <span className="animate-spin">⏳</span> Applying…
              </>
            ) : (
              <>🎯 Apply Placement</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Success Banner Component
// ============================================================
function PlacementSuccessBanner({
  studentName,
  studentId,
  onDismiss,
}: {
  studentName: string;
  studentId: string;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-sm font-semibold text-green-800">
            Placement applied for {studentName}!
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            Skill profiles updated based on Discovery Games scores.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`/students/${studentId}/skill-map`}
          className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
        >
          View Skill Map →
        </a>
        <button
          onClick={onDismiss}
          className="text-green-400 hover:text-green-600 text-lg leading-none ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================
export default function DiscoveryGamesResults() {
  const [sessions, setSessions] = useState<MiniAssessmentSession[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [placementModal, setPlacementModal] = useState<MiniAssessmentSession | null>(null);
  const [placedSessions, setPlacedSessions] = useState<Record<string, string>>({});
  const [successBanner, setSuccessBanner] = useState<{
    studentName: string;
    studentId: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        supabase
          .from('mini_assessment_sessions')
          .select('*')
          .order('completed_at', { ascending: false }),
        supabase
          .from('student_profiles')
          .select('id, first_name, last_name, grade_level'),
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setSessions(sessionsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load Discovery Games results:', err);
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  const handlePlacementApplied = useCallback(
    (sessionId: string, studentId: string) => {
      const student = students.find((s) => s.id === studentId);
      setPlacedSessions((prev) => ({ ...prev, [sessionId]: studentId }));
      setPlacementModal(null);
      setSuccessBanner({
        studentName: student ? `${student.first_name} ${student.last_name}` : 'Student',
        studentId,
      });
    },
    [students]
  );

  // Get unique student names for filter
  const studentNames = [...new Set(sessions.map((s) => s.student_name))].sort();
  const filteredSessions =
    filterStudent === 'all'
      ? sessions
      : sessions.filter((s) => s.student_name === filterStudent);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="🎮 Discovery Games Results"
        subtitle="Mini-assessment scores from pilot sessions"
      />

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Success Banner */}
        {successBanner && (
          <PlacementSuccessBanner
            studentName={successBanner.studentName}
            studentId={successBanner.studentId}
            onDismiss={() => setSuccessBanner(null)}
          />
        )}

        {/* Stats Overview */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-3xl font-bold text-indigo-600">
                {sessions.length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Total Sessions</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-3xl font-bold text-teal-600">
                {studentNames.length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Students Assessed</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-3xl font-bold text-amber-600">
                {Math.round(
                  sessions.reduce((sum, s) => sum + s.score_percent, 0) /
                    sessions.length
                )}
                %
              </div>
              <div className="text-sm text-gray-500 mt-1">Average Score</div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        {studentNames.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">
              Filter by student:
            </label>
            <select
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Students</option>
              {studentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={loadData}
              className="ml-auto px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ↻ Refresh
            </button>
          </div>
        )}

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No Discovery Games Results Yet
            </h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              When students complete their Discovery Games mini-assessment at{' '}
              <a
                href="https://discovery-games.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                discovery-games.vercel.app
              </a>
              , their results will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isExpanded={expandedId === session.id}
                isPlaced={!!placedSessions[session.id]}
                onToggle={() =>
                  setExpandedId(expandedId === session.id ? null : session.id)
                }
                onApplyPlacement={() => setPlacementModal(session)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Placement Modal */}
      {placementModal && (
        <PlacementModal
          session={placementModal}
          students={students}
          onClose={() => setPlacementModal(null)}
          onApplied={handlePlacementApplied}
        />
      )}
    </div>
  );
}

// ==========================================================
// Session Card Component
// ==========================================================
function SessionCard({
  session,
  isExpanded,
  isPlaced,
  onToggle,
  onApplyPlacement,
}: {
  session: MiniAssessmentSession;
  isExpanded: boolean;
  isPlaced: boolean;
  onToggle: () => void;
  onApplyPlacement: () => void;
}) {
  const completedDate = new Date(session.completed_at).toLocaleDateString(
    'en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
  );
  const completedTime = new Date(session.completed_at).toLocaleTimeString(
    'en-US',
    { hour: 'numeric', minute: '2-digit' }
  );

  const domainScores = session.domain_scores || {};
  const sectionScores = session.section_scores || {};

  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden ${
        isPlaced ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'
      }`}
    >
      {/* Placed indicator */}
      {isPlaced && (
        <div className="bg-green-50 px-6 py-1.5 text-xs font-semibold text-green-700 flex items-center gap-1.5">
          <span>✅</span> Placement applied to skill graph
        </div>
      )}

      {/* Summary Row */}
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
              {session.student_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">
                {session.student_name}
              </h3>
              <p className="text-sm text-gray-500">
                {completedDate} at {completedTime}
                {session.student_age && (
                  <span className="ml-2">• Age {session.student_age}</span>
                )}
                {session.duration_seconds && (
                  <span className="ml-2">
                    • {Math.round(session.duration_seconds / 60)} min
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Overall Score Circle */}
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  session.score_percent >= 70
                    ? 'text-green-600'
                    : session.score_percent >= 50
                    ? 'text-yellow-600'
                    : 'text-red-500'
                }`}
              >
                {Math.round(session.score_percent)}%
              </div>
              <div className="text-xs text-gray-400">
                {session.total_correct}/{session.total_questions}
              </div>
            </div>

            {/* Domain quick chips */}
            <div className="hidden sm:flex gap-2">
              {Object.entries(domainScores).map(([domain, score]) => (
                <span
                  key={domain}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getGradeColor(
                    score as number
                  )}`}
                >
                  {DOMAIN_ICONS[domain] || '📚'}{' '}
                  {Math.round(score as number)}%
                </span>
              ))}
            </div>

            {/* Apply Placement button */}
            {!isPlaced && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyPlacement();
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                title="Apply these scores to the student's skill graph"
              >
                🎯 Apply Placement
              </button>
            )}

            <span className="text-gray-400 text-lg">
              {isExpanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-6 py-5 space-y-6 bg-gray-50/50">
          {/* Domain Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">
              Domain Scores
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(domainScores).map(([domain, score]) => (
                <div
                  key={domain}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">
                      {DOMAIN_ICONS[domain] || '📚'}{' '}
                      {DOMAIN_LABELS[domain] || domain}
                    </span>
                    <span className="text-lg font-bold text-gray-800">
                      {Math.round(score as number)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreBarColor(
                        score as number
                      )}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getGradeColor(
                      score as number
                    )}`}
                  >
                    {getGradeEquivalent(score as number)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section-Level Scores */}
          {Array.isArray(session.section_scores) && session.section_scores.length > 0 ? (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                Section Breakdown
              </h4>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 border-b">
                      <th className="py-2.5 px-4">Section</th>
                      <th className="py-2.5 px-4">Score</th>
                      <th className="py-2.5 px-4">Correct</th>
                      <th className="py-2.5 px-4">Maps To</th>
                      <th className="py-2.5 px-4">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.section_scores.map((sec: any, idx: number) => {
                      const pct =
                        sec.total > 0 ? (sec.correct / sec.total) * 100 : 0;
                      const mapping = SECTION_DOMAIN_MAP[sec.label];
                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-50"
                        >
                          <td className="py-2.5 px-4 font-medium text-gray-800">
                            {sec.emoji || ''} {sec.label}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-semibold">
                              {Math.round(pct)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-600">
                            {sec.correct}/{sec.total}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-gray-500">
                            {mapping
                              ? mapping.codes.map((c) => `Domain ${c}`).join(', ')
                              : '—'}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getGradeColor(
                                pct
                              )}`}
                            >
                              {getGradeEquivalent(pct)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Fallback: section_scores as object (legacy format) */
            Object.keys(sectionScores).length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Section Breakdown
                </h4>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500 border-b">
                        <th className="py-2.5 px-4">Section</th>
                        <th className="py-2.5 px-4">Score</th>
                        <th className="py-2.5 px-4">Correct</th>
                        <th className="py-2.5 px-4">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sectionScores).map(
                        ([section, data]: [string, any]) => {
                          const pct =
                            typeof data === 'object' ? data.percent || 0 : data;
                          const correct =
                            typeof data === 'object'
                              ? `${data.correct || 0}/${data.total || 0}`
                              : '—';
                          return (
                            <tr
                              key={section}
                              className="border-b border-gray-50"
                            >
                              <td className="py-2.5 px-4 font-medium text-gray-800">
                                {section}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-semibold">
                                  {Math.round(pct)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-gray-600">
                                {correct}
                              </td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getGradeColor(
                                    pct
                                  )}`}
                                >
                                  {getGradeEquivalent(pct)}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Raw Results Summary */}
          {session.raw_results && session.raw_results.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                Question-Level Detail
              </h4>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {session.raw_results.map((r: any, i: number) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                        r.correct
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                      title={`Q${i + 1}: ${
                        r.correct ? 'Correct' : 'Incorrect'
                      }${r.section ? ` (${r.section})` : ''}`}
                    >
                      {r.correct ? '✓' : '✗'}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-100" /> Correct
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-100" /> Incorrect
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Apply Placement button in expanded view */}
          {!isPlaced && (
            <div className="pt-2">
              <button
                onClick={onApplyPlacement}
                className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                🎯 Apply Placement to Skill Graph
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
