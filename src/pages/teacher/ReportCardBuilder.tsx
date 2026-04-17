import { useState, useEffect, useCallback } from 'react'
import { Header } from '../../components/layout'
import { LoadingSpinner } from '../../components/common'
import { useAuth } from '../../hooks'
import {
  getReportCardConfig,
  getStudentReportCard,
  createReportCard,
  updateReportCard,
  type ReportCardConfig,
} from '../../services/curriculum.service'
import { supabase } from '../../services/supabase'

interface StudentOption {
  id: string
  first_name: string
  last_name: string
}

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4']
const CURRENT_YEAR = '2025-2026'

const categoryBadge: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-700',
  behavioral: 'bg-amber-100 text-amber-700',
  social_emotional: 'bg-green-100 text-green-700',
}

const categoryEmoji: Record<string, string> = {
  academic: '📖',
  behavioral: '🌟',
  social_emotional: '💚',
}

export default function ReportCardBuilder() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentOption[]>([])
  const [config, setConfig] = useState<ReportCardConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0])
  const [schoolYear] = useState(CURRENT_YEAR)

  const [reportCardId, setReportCardId] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({})
  const [narratives, setNarratives] = useState<Record<string, string>>({})
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, tardy: 0 })
  const [finalized, setFinalized] = useState(false)

  useEffect(() => {
    async function loadInitial() {
      try {
        const [configData, studentsData] = await Promise.all([
          getReportCardConfig(),
          supabase
            .from('student_profiles')
            .select('id, first_name, last_name')
            .order('last_name')
            .then(({ data, error }) => {
              if (error) throw error
              return data as StudentOption[]
            }),
        ])
        setConfig(configData)
        setStudents(studentsData)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [])

  const loadExisting = useCallback(async () => {
    if (!selectedStudentId) return
    setError('')
    setSuccessMsg('')
    try {
      const existing = await getStudentReportCard(selectedStudentId, selectedTerm, schoolYear)
      if (existing) {
        setReportCardId(existing.id)
        setScores(existing.scores || {})
        setNarratives(existing.narratives || {})
        setAttendance(existing.attendance || { present: 0, absent: 0, tardy: 0 })
        setFinalized(!!existing.finalized_at)
      } else {
        setReportCardId(null)
        const freshScores: Record<string, Record<string, number>> = {}
        config.forEach(section => {
          freshScores[section.section_name] = {}
          section.indicators.forEach(ind => {
            freshScores[section.section_name][ind] = 0
          })
        })
        setScores(freshScores)
        setNarratives({})
        setAttendance({ present: 0, absent: 0, tardy: 0 })
        setFinalized(false)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }, [selectedStudentId, selectedTerm, schoolYear, config])

  useEffect(() => {
    loadExisting()
  }, [loadExisting])

  function setScore(sectionName: string, indicator: string, value: number) {
    setScores(prev => ({
      ...prev,
      [sectionName]: { ...prev[sectionName], [indicator]: value },
    }))
  }

  function setNarrative(sectionName: string, value: string) {
    setNarratives(prev => ({ ...prev, [sectionName]: value }))
  }

  async function handleSave(finalize = false) {
    if (!selectedStudentId || !user) return
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const payload = {
        student_id: selectedStudentId,
        teacher_id: user.id,
        term: selectedTerm,
        school_year: schoolYear,
        scores,
        narratives,
        attendance,
        ...(finalize ? { finalized_at: new Date().toISOString() } : {}),
      }

      if (reportCardId) {
        await updateReportCard(reportCardId, payload)
      } else {
        const result = await createReportCard(payload as any)
        setReportCardId(result.id)
      }

      if (finalize) setFinalized(true)
      setSuccessMsg(finalize ? '✅ Report card finalized!' : '💾 Draft saved successfully!')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="📋 Report Card Builder" subtitle="Create and manage student report cards" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Selector */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">👤 Student</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Term</label>
              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🏫 School Year</label>
              <input type="text" value={schoolYear} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600" />
            </div>
          </div>
          {finalized && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
              ✅ This report card has been finalized.
            </div>
          )}
        </div>

        {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">{error}</div>}
        {successMsg && <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-4 mb-6">{successMsg}</div>}

        {!selectedStudentId ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">👆</p>
            <p>Select a student to begin building their report card.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {config.map(section => (
                <SectionCard
                  key={section.id}
                  section={section}
                  scores={scores[section.section_name] || {}}
                  narrative={narratives[section.section_name] || ''}
                  onScoreChange={(ind, val) => setScore(section.section_name, ind, val)}
                  onNarrativeChange={(val) => setNarrative(section.section_name, val)}
                  disabled={finalized}
                />
              ))}

              {/* Attendance */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Attendance</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(['present', 'absent', 'tardy'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Days {field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={attendance[field]}
                        onChange={e => setAttendance(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))}
                        disabled={finalized}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!finalized && (
              <div className="flex flex-wrap gap-3 mt-6 justify-end">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : '💾 Save Draft'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to finalize this report card? This action cannot be undone.')) {
                      handleSave(true)
                    }
                  }}
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : '✅ Finalize Report Card'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SectionCard({
  section,
  scores,
  narrative,
  onScoreChange,
  onNarrativeChange,
  disabled,
}: {
  section: ReportCardConfig
  scores: Record<string, number>
  narrative: string
  onScoreChange: (indicator: string, value: number) => void
  onNarrativeChange: (value: string) => void
  disabled: boolean
}) {
  const scale = section.rating_scale || { min: 1, max: 4, labels: {} }
  const scaleRange: number[] = []
  for (let i = scale.min; i <= scale.max; i++) scaleRange.push(i)

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">{categoryEmoji[section.category] || '📋'}</span>
        <h3 className="text-lg font-semibold text-gray-900">{section.section_name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryBadge[section.category] || 'bg-gray-100 text-gray-600'}`}>
          {section.category.replace('_', ' ')}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        <span className="font-medium text-gray-600">Scale:</span>
        {scaleRange.map(n => (
          <span key={n}>{n} = {scale.labels?.[String(n)] || `Level ${n}`}</span>
        ))}
      </div>

      <div className="space-y-3">
        {section.indicators.map(indicator => (
          <div key={indicator} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-sm text-gray-700 sm:w-1/2">{indicator}</span>
            <div className="flex gap-1">
              {scaleRange.map(n => (
                <button
                  key={n}
                  onClick={() => onScoreChange(indicator, n)}
                  disabled={disabled}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    scores[indicator] === n
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={scale.labels?.[String(n)] || `Level ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {section.has_narrative && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">✍️ Teacher Comments</label>
          <textarea
            value={narrative}
            onChange={e => onNarrativeChange(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="Write your observations and comments..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-y"
          />
        </div>
      )}
    </div>
  )
}
