import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'

interface SessionRow {
  id: number
  student_id: number
  status: string
  started_at: string
  completed_at: string | null
}

interface ResponseRow {
  id: number
  session_id: number
  is_correct: boolean
}

interface SkillDomainRow {
  id: number
  name: string
}

interface StudentInfo {
  id: number
  name: string
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Assessment overview
  const [totalSessions, setTotalSessions] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [totalResponses, setTotalResponses] = useState(0)
  const [correctResponses, setCorrectResponses] = useState(0)

  // Per-student breakdown
  const [studentBreakdown, setStudentBreakdown] = useState<any[]>([])

  // Skill domain coverage
  const [domainCoverage, setDomainCoverage] = useState<any[]>([])

  // Recent sessions timeline
  const [recentSessions, setRecentSessions] = useState<any[]>([])

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    try {
      setLoading(true)
      setError(null)

      const [sessionsRes, responsesRes, studentsRes, domainsRes, skillNodesRes] = await Promise.all([
        supabase
          .from('assessment_sessions')
          .select('id, student_id, status, started_at, completed_at')
          .order('started_at', { ascending: false }),
        supabase
          .from('assessment_responses')
          .select('id, session_id, is_correct'),
        supabase
          .from('student_profiles')
          .select('id, profiles:user_id(first_name, last_name)'),
        supabase
          .from('skill_domains')
          .select('id, name')
          .order('display_order'),
        supabase
          .from('skill_nodes')
          .select('id, domain_id'),
      ])

      const sessions = (sessionsRes.data || []) as SessionRow[]
      const responses = (responsesRes.data || []) as ResponseRow[]
      const studentData = (studentsRes.data || []) as any[]
      const domains = (domainsRes.data || []) as SkillDomainRow[]
      const skillNodes = (skillNodesRes.data || []) as any[]

      // Student name lookup
      const studentNames: Record<number, string> = {}
      studentData.forEach(s => {
        const p = s.profiles
        studentNames[s.id] = p ? `${p.first_name} ${p.last_name}` : `Student #${s.id}`
      })

      // Assessment overview
      setTotalSessions(sessions.length)
      const counts: Record<string, number> = {}
      sessions.forEach(s => {
        counts[s.status] = (counts[s.status] || 0) + 1
      })
      setStatusCounts(counts)

      setTotalResponses(responses.length)
      const correct = responses.filter(r => r.is_correct).length
      setCorrectResponses(correct)

      // Per-student breakdown
      const sessionsByStudent: Record<number, number[]> = {}
      sessions.forEach(s => {
        if (!sessionsByStudent[s.student_id]) sessionsByStudent[s.student_id] = []
        sessionsByStudent[s.student_id].push(s.id)
      })

      const responsesBySession: Record<number, { total: number; correct: number }> = {}
      responses.forEach(r => {
        if (!responsesBySession[r.session_id]) responsesBySession[r.session_id] = { total: 0, correct: 0 }
        responsesBySession[r.session_id].total++
        if (r.is_correct) responsesBySession[r.session_id].correct++
      })

      const breakdown = Object.entries(sessionsByStudent).map(([sid, sessionIds]) => {
        const studentId = Number(sid)
        let totalResp = 0
        let correctResp = 0
        sessionIds.forEach(sessId => {
          const r = responsesBySession[sessId]
          if (r) {
            totalResp += r.total
            correctResp += r.correct
          }
        })
        return {
          studentId,
          name: studentNames[studentId] || `Student #${studentId}`,
          sessions: sessionIds.length,
          responses: totalResp,
          correct: correctResp,
          accuracy: totalResp > 0 ? Math.round((correctResp / totalResp) * 100) : 0,
        }
      })
      setStudentBreakdown(breakdown)

      // Skill domain coverage
      const nodesByDomain: Record<number, number> = {}
      skillNodes.forEach(n => {
        if (n.domain_id) {
          nodesByDomain[n.domain_id] = (nodesByDomain[n.domain_id] || 0) + 1
        }
      })

      // We'd need to join assessment_responses → assessment_items → skill_nodes to find assessed domains
      // For now, show node counts per domain
      const coverage = domains.map(d => ({
        id: d.id,
        name: d.name,
        totalNodes: nodesByDomain[d.id] || 0,
      }))
      setDomainCoverage(coverage)

      // Recent sessions timeline
      const responseCountBySession: Record<number, number> = {}
      responses.forEach(r => {
        responseCountBySession[r.session_id] = (responseCountBySession[r.session_id] || 0) + 1
      })

      const timeline = sessions.slice(0, 15).map(s => ({
        id: s.id,
        studentName: studentNames[s.student_id] || `Student #${s.student_id}`,
        status: s.status,
        startedAt: s.started_at,
        responseCount: responseCountBySession[s.id] || 0,
      }))
      setRecentSessions(timeline)
    } catch (err: any) {
      setError(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const accuracyRate = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading reports</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={loadReports} className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📈 Reports &amp; Analytics</h1>
        <p className="text-gray-500 mt-1">Assessment data and progress insights</p>
      </div>

      {/* Assessment Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <p className="text-2xl font-bold text-indigo-700">{totalSessions}</p>
            <p className="text-xs text-indigo-500 mt-1">Total Sessions</p>
          </div>
          {['completed', 'in_progress', 'paused', 'abandoned'].map(status => (
            <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{statusCounts[status] || 0}</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{status.replace('_', ' ')}</p>
            </div>
          ))}
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-700">{totalResponses}</p>
            <p className="text-xs text-purple-500 mt-1">Total Responses</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg flex items-center gap-4">
          <div className="text-3xl font-bold text-indigo-700">{accuracyRate}%</div>
          <div>
            <p className="text-sm font-medium text-gray-700">Overall Accuracy Rate</p>
            <p className="text-xs text-gray-500">{correctResponses} correct out of {totalResponses} responses</p>
          </div>
        </div>
      </div>

      {/* Per-Student Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Per-Student Assessment Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Sessions</th>
                <th className="px-5 py-3">Responses</th>
                <th className="px-5 py-3">Correct</th>
                <th className="px-5 py-3">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentBreakdown.map(s => (
                <tr key={s.studentId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3 text-gray-600">{s.sessions}</td>
                  <td className="px-5 py-3 text-gray-600">{s.responses}</td>
                  <td className="px-5 py-3 text-gray-600">{s.correct}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${s.accuracy}%` }}
                        />
                      </div>
                      <span className="text-gray-700 font-medium">{s.accuracy}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {studentBreakdown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No assessment data yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skill Domain Coverage */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Domain Coverage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {domainCoverage.map(d => (
            <div key={d.id} className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 text-sm">{d.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{d.totalNodes} skill nodes</p>
            </div>
          ))}
          {domainCoverage.length === 0 && (
            <p className="col-span-full text-gray-400 text-center py-4">No skill domains found</p>
          )}
        </div>
      </div>

      {/* Assessment Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Assessment Timeline</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentSessions.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-400">No sessions recorded yet</p>
          ) : (
            recentSessions.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    s.status === 'completed' ? 'bg-green-100 text-green-700' :
                    s.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    s.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {s.status}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{s.studentName}</span>
                  <span className="text-xs text-gray-400">{s.responseCount} responses</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(s.startedAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
