import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'

interface StudentRow {
  id: number
  grade_level: number
  user_id: string
  profiles: { first_name: string; last_name: string; email: string } | null
  tiers: { name: string } | null
}

export default function AdminStudents() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    try {
      setLoading(true)
      setError(null)

      const [studentsRes, enrollmentsRes, sparksRes, loginsRes] = await Promise.all([
        supabase
          .from('student_profiles')
          .select('id, grade_level, user_id, profiles:user_id(first_name, last_name, email), tiers:tier_id(name)'),
        supabase
          .from('student_enrollments')
          .select('student_id, status'),
        supabase
          .from('spark_points')
          .select('student_profile_id, amount'),
        supabase
          .from('activity_log')
          .select('student_id, created_at')
          .eq('activity_type', 'login')
          .order('created_at', { ascending: false }),
      ])

      const studentData = (studentsRes.data || []) as unknown as StudentRow[]

      // Enrollment status by student
      const enrollByStudent: Record<number, string> = {}
      ;(enrollmentsRes.data || []).forEach((e: any) => {
        enrollByStudent[e.student_id] = e.status
      })

      // Spark totals by student
      const sparksByStudent: Record<number, number> = {}
      ;(sparksRes.data || []).forEach((s: any) => {
        sparksByStudent[s.student_profile_id] = (sparksByStudent[s.student_profile_id] || 0) + (s.amount || 0)
      })

      // Last login per student (first occurrence per student since ordered desc)
      const lastLoginByStudent: Record<number, string> = {}
      ;(loginsRes.data || []).forEach((l: any) => {
        if (!lastLoginByStudent[l.student_id]) {
          lastLoginByStudent[l.student_id] = l.created_at
        }
      })

      const roster = studentData.map(s => {
        const firstName = s.profiles?.first_name || ''
        const lastName = s.profiles?.last_name || ''
        return {
          id: s.id,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim() || 'Unknown',
          email: s.profiles?.email || '',
          grade: s.grade_level,
          tier: s.tiers?.name || 'None',
          enrollmentStatus: enrollByStudent[s.id] || 'Not enrolled',
          sparkPoints: sparksByStudent[s.id] || 0,
          lastLogin: lastLoginByStudent[s.id] || null,
        }
      })

      setStudents(roster)
    } catch (err: any) {
      setError(err.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(s => s.fullName.toLowerCase().includes(q))
  }, [students, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading students...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading students</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={loadStudents} className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👩‍🎓 Students</h1>
          <p className="text-gray-500 mt-1">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Student Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold shrink-0">
                {s.firstName.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{s.fullName}</h3>
                <p className="text-xs text-gray-400 truncate">{s.email}</p>
              </div>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                s.enrollmentStatus === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {s.enrollmentStatus}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-400">Grade</p>
                <p className="text-sm font-semibold text-gray-900">{s.grade}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Tier</p>
                <p className="text-sm font-semibold text-gray-900">{s.tier}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Sparks</p>
                <p className="text-sm font-semibold text-amber-600">⚡ {s.sparkPoints}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {s.lastLogin
                  ? `Last login: ${new Date(s.lastLogin).toLocaleDateString()}`
                  : 'No login recorded'}
              </span>
              <Link
                to={`/teacher/discovery-profile/${s.id}`}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View Details →
              </Link>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            {search ? 'No students match your search' : 'No students found'}
          </div>
        )}
      </div>
    </div>
  )
}
