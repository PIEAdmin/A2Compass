import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { supabase } from '../../services/supabase'

interface StudentRow {
  id: number
  grade_level: number
  user_id: string
  profiles: { first_name: string; last_name: string; email: string } | null
  tiers: { name: string } | null
}

interface EnrollmentRow {
  student_id: number
  status: string
}

interface SessionRow {
  id: number
  student_id: number
  status: string
}

interface ResponseAgg {
  session_id: number
}

interface SparkAgg {
  student_profile_id: number
  total: number
}

interface ActivityRow {
  id: number
  student_id: number
  activity_type: string
  activity_name: string
  created_at: string
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [totalStudents, setTotalStudents] = useState(0)
  const [activeEnrollments, setActiveEnrollments] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const [totalSparks, setTotalSparks] = useState(0)

  const [students, setStudents] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [
        studentsRes,
        enrollmentsRes,
        sessionsRes,
        sparksRes,
        activityRes,
      ] = await Promise.all([
        supabase
          .from('student_profiles')
          .select('id, grade_level, user_id, profiles:user_id(first_name, last_name, email), tiers:tier_id(name)'),
        supabase
          .from('student_enrollments')
          .select('student_id, status'),
        supabase
          .from('assessment_sessions')
          .select('id, student_id, status, started_at, completed_at'),
        supabase
          .from('spark_points')
          .select('student_profile_id, amount'),
        supabase
          .from('activity_log')
          .select('id, student_id, activity_type, activity_name, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      // Students
      const studentData = (studentsRes.data || []) as unknown as StudentRow[]
      setTotalStudents(studentData.length)

      // Enrollments
      const enrollmentData = (enrollmentsRes.data || []) as EnrollmentRow[]
      const activeCount = enrollmentData.filter(e => e.status === 'active').length
      setActiveEnrollments(activeCount)

      // Sessions
      const sessionData = (sessionsRes.data || []) as SessionRow[]
      setTotalSessions(sessionData.length)

      // Spark points - sum all amounts
      const sparkData = (sparksRes.data || []) as { student_profile_id: number; amount: number }[]
      const sparkTotal = sparkData.reduce((sum, s) => sum + (s.amount || 0), 0)
      setTotalSparks(sparkTotal)

      // Build spark totals per student
      const sparksByStudent: Record<number, number> = {}
      sparkData.forEach(s => {
        sparksByStudent[s.student_profile_id] = (sparksByStudent[s.student_profile_id] || 0) + (s.amount || 0)
      })

      // Build enrollment status per student
      const enrollByStudent: Record<number, string> = {}
      enrollmentData.forEach(e => {
        enrollByStudent[e.student_id] = e.status
      })

      // Build session counts per student
      const sessionsByStudent: Record<number, number> = {}
      sessionData.forEach(s => {
        sessionsByStudent[s.student_id] = (sessionsByStudent[s.student_id] || 0) + 1
      })

      // Fetch response counts per session
      const sessionIds = sessionData.map(s => s.id)
      let responsesByStudent: Record<number, number> = {}
      if (sessionIds.length > 0) {
        const { data: responseData } = await supabase
          .from('assessment_responses')
          .select('session_id')
          .in('session_id', sessionIds)

        const responsesBySession: Record<number, number> = {}
        ;(responseData || []).forEach((r: any) => {
          responsesBySession[r.session_id] = (responsesBySession[r.session_id] || 0) + 1
        })
        sessionData.forEach(s => {
          if (responsesBySession[s.id]) {
            responsesByStudent[s.student_id] = (responsesByStudent[s.student_id] || 0) + responsesBySession[s.id]
          }
        })
      }

      // Build student roster
      const roster = studentData.map(s => ({
        id: s.id,
        name: s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : 'Unknown',
        grade: s.grade_level,
        tier: s.tiers?.name || 'None',
        enrollmentStatus: enrollByStudent[s.id] || 'Not enrolled',
        sessions: sessionsByStudent[s.id] || 0,
        responses: responsesByStudent[s.id] || 0,
        sparkPoints: sparksByStudent[s.id] || 0,
      }))

      setStudents(roster)
      setRecentActivity((activityRes.data || []) as ActivityRow[])
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading Command Center...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={loadDashboard} className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors">
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
        <h1 className="text-2xl font-bold text-gray-900">
          📊 Admin Command Center
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'} · {today}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: totalStudents, icon: '👩‍🎓', color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Active Enrollments', value: activeEnrollments, icon: '📋', color: 'bg-green-50 text-green-700' },
          { label: 'Assessment Sessions', value: totalSessions, icon: '📝', color: 'bg-purple-50 text-purple-700' },
          { label: 'Total Spark Points', value: totalSparks.toLocaleString(), icon: '⚡', color: 'bg-amber-50 text-amber-700' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.color}`}>{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/students" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          👩‍🎓 View Students
        </Link>
        <Link to="/admin/enrollment" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
          📋 Manage Enrollment
        </Link>
        <Link to="/admin/reports" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
          📈 Run Reports
        </Link>
      </div>

      {/* Student Roster */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Student Roster</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3">Tier</th>
                <th className="px-5 py-3">Enrollment</th>
                <th className="px-5 py-3">Sessions</th>
                <th className="px-5 py-3">Responses</th>
                <th className="px-5 py-3">Spark Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3 text-gray-600">Grade {s.grade}</td>
                  <td className="px-5 py-3 text-gray-600">{s.tier}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      s.enrollmentStatus === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.enrollmentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.sessions}</td>
                  <td className="px-5 py-3 text-gray-600">{s.responses}</td>
                  <td className="px-5 py-3 text-gray-600">⚡ {s.sparkPoints}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">No students found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-400">No recent activity</p>
          ) : (
            recentActivity.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {a.activity_name || a.activity_type}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    Student #{a.student_id}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
