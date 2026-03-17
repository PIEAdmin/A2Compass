// ============================================================
// A² Compass — Parent Assessment Summary
// Parent-friendly, jargon-free view of child's assessment results
// ============================================================
import { useState, useEffect } from 'react';
import { Header } from '../../components/layout';
import { LoadingSpinner } from '../../components/common';
import { useAssessmentDashboard } from '../../hooks/useAssessment';
import { studentService } from '../../services/students';
import { useAuth } from '../../hooks';
import type { StudentProfile } from '../../types';
import type { DomainProgress } from '../../types/assessment';

// ---------- Domain explainers (parent-friendly) ----------
const DOMAIN_EXPLAINERS: Record<string, string> = {
  'Print Concepts':
    'Understanding how books and printed words work — like reading left to right and knowing letters make words.',
  'Letter Recognition':
    'Knowing the names and shapes of uppercase and lowercase letters.',
  'Phonological Awareness':
    'Hearing and playing with the sounds in words — like rhyming and breaking words into parts.',
  Phonics:
    'Connecting letters to their sounds and using that to read new words.',
  Counting:
    'Counting objects, recognizing numbers, and understanding "how many."',
  Operations:
    'Adding and subtracting small numbers using objects, pictures, and mental math.',
  Geometry:
    'Recognizing shapes, understanding positions (above, below), and spatial thinking.',
  Measurement:
    'Comparing sizes, lengths, and weights — understanding "bigger," "longer," and "heavier."',
};

function getDomainExplainer(name: string): string {
  return (
    DOMAIN_EXPLAINERS[name] ||
    'Building important foundational skills in this area.'
  );
}

// ==========================================================
// Main Component
// ==========================================================
export default function AssessmentSummary() {
  const { user } = useAuth();
  const [children, setChildren] = useState<StudentProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);

  const {
    sessions,
    summary,
    loading: dashLoading,
    error,
  } = useAssessmentDashboard(selectedChildId ?? undefined);

  useEffect(() => {
    if (!user) return;
    loadChildren();
  }, [user]);

  async function loadChildren() {
    setLoadingChildren(true);
    try {
      const data = await studentService.getStudentsByParent(user!.id);
      setChildren(data);
      if (data.length > 0) setSelectedChildId(data[0].id);
    } catch (err) {
      console.error('Failed to load children:', err);
    } finally {
      setLoadingChildren(false);
    }
  }

  if (loadingChildren) return <LoadingSpinner size="lg" />;

  const selectedChild = children.find((c) => c.id === selectedChildId);

  // Separate domains into strengths vs. growth areas
  const strengths = (summary?.domainBreakdown || []).filter(
    (d) => d.skillsMastered > d.skillsTotal * 0.5
  );
  const growthAreas = (summary?.domainBreakdown || []).filter(
    (d) => d.skillsMastered <= d.skillsTotal * 0.5
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="🏠 Assessment Results"
        subtitle="See how your child is doing"
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Child Selector (if multiple) */}
        {children.length > 1 && (
          <div className="flex gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                  ${
                    child.id === selectedChildId
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {child.profile?.full_name || 'Child'}
              </button>
            ))}
          </div>
        )}

        {dashLoading ? (
          <LoadingSpinner size="lg" />
        ) : !summary || summary.totalSessions === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No assessment results yet
            </h3>
            <p className="text-gray-500">
              Once your child completes their first assessment, you'll see their
              results here in an easy-to-understand format.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-1">
                {selectedChild?.profile?.full_name || 'Your Child'}'s Learning
                Snapshot
              </h2>
              <p className="text-indigo-100 text-sm mb-4">
                Based on {summary.totalSessions} assessment
                {summary.totalSessions === 1 ? '' : 's'}
                {summary.latestSessionDate &&
                  ` • Last assessed ${new Date(summary.latestSessionDate).toLocaleDateString()}`}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">
                    {summary.totalSkillsAssessed}
                  </div>
                  <div className="text-xs text-indigo-100 mt-1">
                    Skills Checked
                  </div>
                </div>
                <div className="bg-white/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">
                    {summary.totalSkillsMastered}
                  </div>
                  <div className="text-xs text-indigo-100 mt-1">
                    Skills Strong
                  </div>
                </div>
                <div className="bg-white/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">
                    {summary.domainBreakdown.length}
                  </div>
                  <div className="text-xs text-indigo-100 mt-1">
                    Areas Covered
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {strengths.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-green-700 mb-1 flex items-center gap-2">
                  ⭐ Your Child's Strengths
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  These are areas where your child is doing really well!
                </p>
                <div className="space-y-4">
                  {strengths.map((d) => (
                    <DomainCard key={d.domainId} domain={d} variant="strength" />
                  ))}
                </div>
              </div>
            )}

            {/* Growth Areas */}
            {growthAreas.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-blue-700 mb-1 flex items-center gap-2">
                  🎯 Next Learning Goals
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  These areas are where we'll focus next. Your child is making
                  progress!
                </p>
                <div className="space-y-4">
                  {growthAreas.map((d) => (
                    <DomainCard key={d.domainId} domain={d} variant="growth" />
                  ))}
                </div>
              </div>
            )}

            {/* All Domains Progress */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                📊 Domain-by-Domain Progress
              </h3>
              <div className="space-y-5">
                {summary.domainBreakdown.map((d) => {
                  const total =
                    d.skillsMastered +
                    d.skillsNeedsPractice +
                    d.skillsNotReady +
                    d.skillsNotAssessed;
                  const pct = total > 0 ? Math.round((d.skillsMastered / total) * 100) : 0;

                  return (
                    <div key={d.domainId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-gray-700 text-sm">
                          {d.domainName}
                        </span>
                        <span className="text-xs text-gray-400">{pct}% strong</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {getDomainExplainer(d.domainName)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shareable Snapshot Card */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">
                {selectedChild?.profile?.full_name || 'Your child'} has mastered{' '}
                {summary.totalSkillsMastered} skills!
              </h3>
              <p className="text-gray-500 text-sm">
                Keep up the great work! Learning is an adventure.
              </p>
            </div>

            {/* Assessment History */}
            {sessions.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-3">
                  📅 Assessment History
                </h3>
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">
                        {s.started_at
                          ? new Date(s.started_at).toLocaleDateString()
                          : '—'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {s.skills_assessed} skills • {s.items_attempted} questions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================================
// Domain Card
// ==========================================================
function DomainCard({
  domain,
  variant,
}: {
  domain: DomainProgress;
  variant: 'strength' | 'growth';
}) {
  const total =
    domain.skillsMastered +
    domain.skillsNeedsPractice +
    domain.skillsNotReady +
    domain.skillsNotAssessed;
  const pct = total > 0 ? Math.round((domain.skillsMastered / total) * 100) : 0;

  return (
    <div
      className={`rounded-xl p-4 ${
        variant === 'strength'
          ? 'bg-green-50 border border-green-200'
          : 'bg-blue-50 border border-blue-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`font-semibold ${
            variant === 'strength' ? 'text-green-800' : 'text-blue-800'
          }`}
        >
          {domain.domainName}
        </span>
        <span className="text-sm text-gray-500">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${
            variant === 'strength' ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{getDomainExplainer(domain.domainName)}</p>
    </div>
  );
}
