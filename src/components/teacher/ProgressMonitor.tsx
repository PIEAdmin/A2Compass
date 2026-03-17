import type { StudentProfile } from '../../types'
import { StatCard } from '../common'

interface Props {
  students: StudentProfile[]
}

export default function ProgressMonitor({ students }: Props) {
  const total = students.length
  const activeEnrollments = students.filter(s => s.enrollments?.some(e => e.status === 'active')).length

  const byTier = {
    explorers: students.filter(s => s.tier?.slug === 'explorers-camp').length,
    scholars: students.filter(s => s.tier?.slug === 'scholars-guild').length,
    collegium: students.filter(s => s.tier?.slug === 'the-collegium').length,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={total} icon="👩‍🎓" color="#3B82F6" />
        <StatCard label="Active Enrollments" value={activeEnrollments} icon="✅" color="#10B981" />
        <StatCard label="Explorers' Camp" value={byTier.explorers} icon="🏕️" color="#FF6B35" />
        <StatCard label="Scholars' Guild" value={byTier.scholars} icon="🏛️" color="#118AB2" />
      </div>
    </div>
  )
}
