import { useState } from 'react'
import type { StudentProfile, EnrollmentSlug, TierSlug } from '../../types'
import { TierBadge, MasteryBar } from '../common'

interface Props {
  students: StudentProfile[]
  onSelectStudent?: (student: StudentProfile) => void
}

export default function ClassRoster({ students, onSelectStudent }: Props) {
  const [filterTier, setFilterTier] = useState<TierSlug | 'all'>('all')
  const [filterEnrollment, setFilterEnrollment] = useState<EnrollmentSlug | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = students.filter(s => {
    if (filterTier !== 'all' && s.tier?.slug !== filterTier) return false
    if (filterEnrollment !== 'all') {
      const hasEnrollment = s.enrollments?.some(e => e.enrollment_type?.slug === filterEnrollment)
      if (!hasEnrollment) return false
    }
    if (search && !s.profile?.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-compass-navy">👩‍🎓 Class Roster</h3>
        <span className="text-sm text-gray-500">{filtered.length} students</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-48"
        />
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value as TierSlug | 'all')}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="all">All Tiers</option>
          <option value="explorers-camp">Explorers' Camp</option>
          <option value="scholars-guild">Scholars' Guild</option>
          <option value="the-collegium">The Collegium</option>
        </select>
        <select
          value={filterEnrollment}
          onChange={(e) => setFilterEnrollment(e.target.value as EnrollmentSlug | 'all')}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="all">All Enrollments</option>
          <option value="full-time">Full-Time</option>
          <option value="tutoring">Tutoring</option>
          <option value="summer-program">Summer Program</option>
          <option value="a-la-carte">A La Carte</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No students match your filters</p>
        ) : (
          filtered.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelectStudent?.(student)}
            >
              <div className="w-10 h-10 rounded-full bg-compass-blue/10 flex items-center justify-center text-sm font-medium text-compass-blue">
                {student.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800">{student.profile?.full_name || 'Unknown'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">Grade {student.grade_level}</span>
                  {student.tier && <TierBadge tier={student.tier.slug as TierSlug} size="sm" />}
                  {student.enrollments?.[0]?.enrollment_type && (
                    <span className="text-xs text-gray-400">{student.enrollments[0].enrollment_type.name}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {student.enrollments?.[0]?.status === 'active' ? '🟢' : '⚪'} {student.enrollments?.[0]?.status || 'No enrollment'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
