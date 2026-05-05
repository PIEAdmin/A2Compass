// ============================================================
// A² Compass — Unified Report Card
// Comprehensive student report with one-click PDF generation
// Used by: Parent, Teacher, Admin
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks'
import { reportCardService, type UnifiedReportCard as ReportData, type DomainReport, type SkillReport } from '../../services/reportCard.service'

/* ── Status helpers ────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  exceeding: 'bg-purple-100 text-purple-800 border-purple-200',
  meeting: 'bg-green-100 text-green-800 border-green-200',
  developing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  not_started: 'bg-gray-100 text-gray-500 border-gray-200',
}
const STATUS_LABELS: Record<string, string> = {
  exceeding: '⭐ Exceeding',
  meeting: '✅ Meeting',
  developing: '📈 Developing',
  not_started: '⬜ Not Started',
}
const STATUS_DOT: Record<string, string> = {
  exceeding: 'bg-purple-500',
  meeting: 'bg-green-500',
  developing: 'bg-yellow-500',
  not_started: 'bg-gray-300',
}

const DOMAIN_ICONS: Record<string, string> = {
  'English Language Arts': '📖',
  'Mathematics': '🔢',
  'Science': '🔬',
  'Social Studies': '🌍',
  'Social-Emotional Learning': '💚',
  'Daily Living Skills': '🏠',
  'Creative Arts': '🎨',
  'Foreign Language': '🌐',
  'Physical Education': '⚽',
  'Technology': '💻',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/* ── Domain Card ──────────────────────────────────────────── */
function DomainCard({ domain }: { domain: DomainReport }) {
  const [expanded, setExpanded] = useState(false)
  const icon = DOMAIN_ICONS[domain.domainName] || '📋'
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print-domain-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors print:hover:bg-white"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{domain.domainName}</h3>
            <p className="text-sm text-gray-500">{domain.gradeEquivalent}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Progress bar */}
          <div className="w-32 hidden sm:block">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{domain.skillsMastered}/{domain.skillsTotal} skills</span>
              <span>{domain.masteryPercent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${domain.masteryPercent}%`,
                  backgroundColor: domain.masteryPercent >= 85 ? '#22c55e' : domain.masteryPercent >= 50 ? '#eab308' : '#ef4444',
                }}
              />
            </div>
          </div>
          <span className="text-gray-400 print:hidden">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {/* Skill breakdown — always shown in print, toggled on screen */}
      <div className={`border-t border-gray-100 ${expanded ? '' : 'hidden'} print:block`}>
        <div className="px-5 py-3 space-y-2">
          {domain.skills.map(skill => (
            <SkillRow key={skill.skillId} skill={skill} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SkillRow({ skill }: { skill: SkillReport }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[skill.status]}`} />
        <span className="text-gray-700 truncate">{skill.skillName}</span>
        {skill.code && <span className="text-xs text-gray-400 flex-shrink-0">{skill.code}</span>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {skill.attempts > 0 && (
          <span className="text-xs text-gray-400">{skill.attempts} attempt{skill.attempts !== 1 ? 's' : ''}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[skill.status]}`}>
          {STATUS_LABELS[skill.status]}
        </span>
      </div>
    </div>
  )
}

/* ── Main Component ───────────────────────────────────────── */
export default function UnifiedReportCard() {
  const { user } = useAuth()
  const [students, setStudents] = useState<{ id: string; firstName: string; lastName: string; gradeLevel: number }[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    loadStudents()
  }, [user])

  async function loadStudents() {
    try {
      const list = await reportCardService.getViewableStudents(user!.id, user!.role)
      setStudents(list)
      if (list.length === 1) {
        setSelectedId(list[0].id)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedId) {
      setReport(null)
      return
    }
    generateReport()
  }, [selectedId])

  async function generateReport() {
    setGenerating(true)
    setError('')
    try {
      const data = await reportCardService.generateReport(selectedId)
      setReport(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header — hidden in print */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-6 print:hidden">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">📊 Student Report Card</h1>
          <p className="text-indigo-200 mt-1">Comprehensive progress report across all domains</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 print:px-0 print:py-0">
        {/* Student Selector — hidden in print */}
        <div className="bg-white rounded-xl border p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 print:hidden">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} (Grade {s.gradeLevel})</option>
              ))}
            </select>
          </div>
          {report && (
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 self-end"
            >
              🖨️ Print / Save PDF
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm print:hidden">{error}</div>
        )}

        {generating && (
          <div className="flex flex-col items-center justify-center py-20 print:hidden">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3" />
            <p className="text-gray-500">Generating comprehensive report...</p>
          </div>
        )}

        {!selectedId && !generating && (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400 print:hidden">
            <p className="text-4xl mb-3">👆</p>
            <p>Select a student to view their report card</p>
          </div>
        )}

        {/* ── THE REPORT ──────────────────────────────────────── */}
        {report && !generating && (
          <div ref={reportRef} className="space-y-6 print:space-y-4">
            {/* ── Print Header ────────────────────────────────── */}
            <div className="bg-white rounded-xl border p-6 print:border-b-2 print:border-indigo-600 print:rounded-none">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900 print:text-xl">
                      A² Compass Report Card
                    </h1>
                  </div>
                  <p className="text-gray-500 text-sm">Achievement Academy · aaacademy.app</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>Generated: {formatDate(report.generatedAt)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-indigo-50 rounded-lg p-4 print:bg-gray-50">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Student</p>
                  <p className="font-semibold text-gray-900">{report.student.firstName} {report.student.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Grade Level</p>
                  <p className="font-semibold text-gray-900">Grade {report.student.gradeLevel}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Date of Birth</p>
                  <p className="font-semibold text-gray-900">{formatDate(report.student.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Enrolled Since</p>
                  <p className="font-semibold text-gray-900">{formatDate(report.student.enrollmentDate)}</p>
                </div>
              </div>
            </div>

            {/* ── Overall Summary ─────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard icon="📈" label="Overall Mastery" value={`${report.overallMastery}%`} sub={report.overallGradeEquivalent} color="indigo" />
              <SummaryCard icon="🧠" label="Skills Mastered" value={`${report.totalSkillsMastered}`} sub={`of ${report.totalSkillsTotal} total`} color="green" />
              <SummaryCard icon="📝" label="Assessments" value={`${report.assessmentHistory.length}`} sub="sessions completed" color="purple" />
              <SummaryCard icon="🏆" label="Badges Earned" value={`${report.badges.length}`} sub="achievements" color="amber" />
            </div>

            {/* ── Student-Friendly Message ────────────────────── */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-5">
              <h3 className="font-semibold text-blue-900 mb-2">💬 For {report.student.firstName}:</h3>
              <p className="text-blue-800 text-sm">
                {report.overallMastery >= 80
                  ? `Amazing work, ${report.student.firstName}! You've mastered ${report.totalSkillsMastered} skills and you're doing fantastic! Keep reaching for the stars! 🌟`
                  : report.overallMastery >= 50
                  ? `Great progress, ${report.student.firstName}! You've been working hard and mastered ${report.totalSkillsMastered} skills. Keep going — you're building something awesome! 🚀`
                  : report.overallMastery >= 20
                  ? `You're off to a great start, ${report.student.firstName}! Every skill you practice makes you stronger. You've already mastered ${report.totalSkillsMastered} — let's keep building! 💪`
                  : `Welcome to your learning journey, ${report.student.firstName}! Every adventure starts with a first step, and you're already on your way. Let's explore together! 🎯`
                }
              </p>
            </div>

            {/* ── Academic Domains ────────────────────────────── */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                📚 Academic Progress by Domain
              </h2>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-4 text-xs">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <span key={key} className={`px-2 py-1 rounded-full border ${STATUS_COLORS[key]}`}>{label}</span>
                ))}
              </div>
              <div className="space-y-3">
                {report.domains.map(domain => (
                  <DomainCard key={domain.domainId} domain={domain} />
                ))}
              </div>
            </div>

            {/* ── Assessment History ─────────────────────────── */}
            {report.assessmentHistory.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">🧪 Assessment History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-gray-600 font-medium">Date</th>
                        <th className="text-left py-2 text-gray-600 font-medium">Type</th>
                        <th className="text-center py-2 text-gray-600 font-medium">Questions</th>
                        <th className="text-center py-2 text-gray-600 font-medium">Accuracy</th>
                        <th className="text-center py-2 text-gray-600 font-medium">Skills</th>
                        <th className="text-center py-2 text-gray-600 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.assessmentHistory.map(a => (
                        <tr key={a.id} className="border-b border-gray-50">
                          <td className="py-2 text-gray-700">{formatDate(a.startedAt)}</td>
                          <td className="py-2 text-gray-700 capitalize">{a.sessionType.replace('_', ' ')}</td>
                          <td className="py-2 text-center">{a.itemsCorrect}/{a.itemsAttempted}</td>
                          <td className="py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              a.accuracy >= 80 ? 'bg-green-100 text-green-700' :
                              a.accuracy >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {a.accuracy}%
                            </span>
                          </td>
                          <td className="py-2 text-center">{a.skillsMastered}/{a.skillsAssessed}</td>
                          <td className="py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Recent Activities ──────────────────────────── */}
            {report.recentActivities.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">📋 Recent Activity Log</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto print:max-h-none print:overflow-visible">
                  {report.recentActivities.slice(0, 30).map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-gray-400 text-xs w-20 flex-shrink-0">{formatDate(a.date)}</span>
                        <span className="text-gray-700 truncate">{a.activityName}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a.domainName}</span>
                        {a.durationMinutes > 0 && (
                          <span className="text-xs text-gray-400">{a.durationMinutes}m</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Time on Task ───────────────────────────────── */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">⏱️ Time on Task</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{report.timeOnTask.totalMinutes}</p>
                  <p className="text-xs text-gray-500">Total Minutes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{report.timeOnTask.dailyAverage}</p>
                  <p className="text-xs text-gray-500">Daily Average (min)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{report.timeOnTask.weeklyAverage}</p>
                  <p className="text-xs text-gray-500">Weekly Average (min)</p>
                </div>
              </div>
              {report.timeOnTask.byDomain.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase font-medium">By Domain</p>
                  {report.timeOnTask.byDomain.map(d => (
                    <div key={d.domain} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-40 truncate">{d.domain}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${Math.min(100, (d.minutes / Math.max(1, report.timeOnTask.totalMinutes)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{d.minutes}m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Teacher Notes ───────────────────────────────── */}
            {report.teacherNotes.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">✍️ Teacher Notes &amp; Lightbulb Moments</h2>
                <div className="space-y-3">
                  {report.teacherNotes.map(note => (
                    <div key={note.id} className={`rounded-lg p-4 border ${
                      note.noteType === 'lightbulb_moment' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{note.noteType === 'lightbulb_moment' ? '💡' : '📝'}</span>
                        <span className="font-medium text-sm text-gray-900">{note.title || note.noteType.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{note.body}</p>
                      <p className="text-xs text-gray-400 mt-1">— {note.teacherName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Badges ─────────────────────────────────────── */}
            {report.badges.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">🏆 Badges &amp; Achievements</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {report.badges.map((badge, i) => (
                    <div key={i} className="bg-amber-50 rounded-lg border border-amber-200 p-3 text-center">
                      <span className="text-2xl">{badge.icon}</span>
                      <p className="font-medium text-sm text-gray-900 mt-1">{badge.name}</p>
                      <p className="text-xs text-gray-500">{badge.description}</p>
                      <p className="text-xs text-amber-600 mt-1">{formatDate(badge.earnedAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer ─────────────────────────────────────── */}
            <div className="text-center text-xs text-gray-400 py-4 print:mt-8 print:border-t">
              <p>A² Compass Report Card · Achievement Academy · aaacademy.app</p>
              <p>Generated {formatDateTime(report.generatedAt)} · This report reflects data as of the generation date.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Summary Card ─────────────────────────────────────────── */
function SummaryCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
  }
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color] || colors.indigo}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-600 font-medium">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
