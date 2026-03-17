// src/components/teacher/ReassessmentReminder.tsx
// Tracks when students need re-assessment based on Sandra's 4-6 week cycle

import { useState, useEffect } from 'react'

interface StudentReassessment {
  studentId: string
  studentName: string
  lastAssessmentDate: string | null
  daysSinceAssessment: number | null
  status: 'overdue' | 'due-soon' | 'on-track' | 'never-assessed'
  domainsToReassess: string[]
}

interface ReassessmentReminderProps {
  students: StudentReassessment[]
  onLaunchReassessment: (studentId: string, domains?: string[]) => void
}

const statusConfig = {
  overdue: { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '🔴' },
  'due-soon': { label: 'Due Soon', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '🟡' },
  'on-track': { label: 'On Track', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '🟢' },
  'never-assessed': { label: 'Needs First Assessment', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: '🆕' },
}

export default function ReassessmentReminder({ students, onLaunchReassessment }: ReassessmentReminderProps) {
  // Sort: overdue first, then due-soon, then never-assessed, then on-track
  const priority = { overdue: 0, 'never-assessed': 1, 'due-soon': 2, 'on-track': 3 }
  const sorted = [...students].sort((a, b) => priority[a.status] - priority[b.status])

  const needsAttention = students.filter(s => s.status !== 'on-track')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-compass-navy">
            🔄 Re-Assessment Schedule
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            4-6 week assessment cycle per Sandra's scoring guide
          </p>
        </div>
        {needsAttention.length > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full">
            {needsAttention.length} need{needsAttention.length === 1 ? 's' : ''} attention
          </span>
        )}
      </div>

      <div className="space-y-3">
        {sorted.map((student) => {
          const config = statusConfig[student.status]
          return (
            <div key={student.studentId} className={`${config.bg} border ${config.border} rounded-lg p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="font-medium text-gray-800">{student.studentName}</span>
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {student.lastAssessmentDate
                      ? `Last assessed: ${new Date(student.lastAssessmentDate).toLocaleDateString()} (${student.daysSinceAssessment} days ago)`
                      : 'No assessment on record'}
                  </p>
                  {student.domainsToReassess.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Focus areas: {student.domainsToReassess.join(', ')}
                    </p>
                  )}
                </div>
                {student.status !== 'on-track' && (
                  <button
                    onClick={() => onLaunchReassessment(student.studentId, student.domainsToReassess)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {student.status === 'never-assessed' ? 'Start Assessment' : 'Re-Assess'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {students.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">📋</p>
          <p>No students enrolled yet</p>
        </div>
      )}
    </div>
  )
}
