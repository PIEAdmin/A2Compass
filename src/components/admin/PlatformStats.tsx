import { useState, useEffect } from 'react'
import { StatCard } from '../common'
import { studentService } from '../../services/students'
import { enrollmentService } from '../../services/enrollment'
import type { StudentProfile, EnrollmentType } from '../../types'

export default function PlatformStats() {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [enrollmentTypes, setEnrollmentTypes] = useState<EnrollmentType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      studentService.getAllStudents(),
      enrollmentService.getEnrollmentTypes(),
    ]).then(([s, e]) => {
      setStudents(s)
      setEnrollmentTypes(e)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-24" />)}</div>

  const byTier = {
    explorers: students.filter(s => s.tier?.slug === 'explorers-camp').length,
    scholars: students.filter(s => s.tier?.slug === 'scholars-guild').length,
    collegium: students.filter(s => s.tier?.slug === 'the-collegium').length,
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Students" value={students.length} icon="👩‍🎓" color="#3B82F6" />
      <StatCard label="Enrollment Types" value={enrollmentTypes.length} icon="📋" color="#10B981" />
      <StatCard label="Explorers' Camp" value={byTier.explorers} icon="🏕️" color="#FF6B35" />
      <StatCard label="Scholars' Guild + Collegium" value={byTier.scholars + byTier.collegium} icon="🏛️" color="#118AB2" />
    </div>
  )
}
