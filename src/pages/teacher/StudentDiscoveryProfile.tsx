import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Header } from '../../components/layout'
import { LoadingSpinner } from '../../components/common'
import {
  getStudentDiscoveryProfile,
  updateStudentDiscoveryProfile,
  getPlacementRules,
  getBenchmarks,
  getStudentAssessmentSessions,
  type StudentDiscoveryData,
  type PlacementRule,
  type DevelopmentalBenchmark,
} from '../../services/curriculum.service'
import { supabase } from '../../services/supabase'

interface StudentInfo {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  grade_level: string
}

const LEARNING_STYLES = ['Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Mixed']
const PILOT_LEVELS = ['Explorer', 'Navigator', 'Captain', 'Ace']

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function ageToRange(age: number): string {
  if (age <= 3) return '2-3'
  if (age <= 4) return '3-4'
  if (age <= 5) return '4-5'
  if (age <= 6) return '5-6'
  if (age <= 7) return '6-7'
  if (age <= 8) return '7-8'
  if (age <= 9) return '8-9'
  return '9-10'
}

function domainEmoji(domain: string) {
  const map: Record<string, string> = {
    math: '🔢', ela: '📖', science: '🔬',
    social_studies: '🌍', foreign_language: '🗣️', creative_arts: '🎨',
    cognitive: '🧠', language: '💬', motor: '🏃', social: '🤝',
  }
  return map[domain] || '📘'
}

function domainLabel(domain: string) {
  return domain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function StudentDiscoveryProfile() {
  const { studentId } = useParams<{ studentId: string }>()
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [profile, setProfile] = useState<StudentDiscoveryData | null>(null)
  const [placementRules, setPlacementRules] = useState<PlacementRule[]>([])
  const [benchmarks, setBenchmarks] = useState<DevelopmentalBenchmark[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Editable fields
  const [learningStyle, setLearningStyle] = useState('')
  const [pilotLevel, setPilotLevel] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [strengths, setStrengths] = useState<string[]>([])
  const [areasForGrowth, setAreasForGrowth] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState('')
  const [newStrength, setNewStrength] = useState('')
  const [newGrowthArea, setNewGrowthArea] = useState('')

  useEffect(() => {
    if (!studentId) return
    async function load() {
      try {
        const [studentData, profileData, rules, sessions] = await Promise.all([
          supabase
            .from('student_profiles')
            .select('id, first_name, last_name, date_of_birth, grade_level')
            .eq('id', studentId)
            .single()
            .then(({ data, error }) => { if (error) throw error; return data as StudentInfo }),
          getStudentDiscoveryProfile(studentId),
          getPlacementRules(),
          getStudentAssessmentSessions(studentId),
        ])

        setStudentInfo(studentData)
        setProfile(profileData)
        setLearningStyle(profileData.learning_style || '')
        setPilotLevel(profileData.pilot_level || '')
        setInterests(profileData.interests || [])
        setStrengths(profileData.strengths || [])
        setAreasForGrowth(profileData.areas_for_growth || [])
        setPlacementRules(rules)
        setAssessments(sessions || [])

        // Load benchmarks for student's age
        if (studentData.date_of_birth) {
          const age = calculateAge(studentData.date_of_birth)
          const range = ageToRange(age)
          const bm = await getBenchmarks(range)
          setBenchmarks(bm)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId])

  async function handleSave() {
    if (!studentId) return
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      await updateStudentDiscoveryProfile(studentId, {
        learning_style: learningStyle || null,
        pilot_level: pilotLevel || null,
        interests: interests.length > 0 ? interests : null,
        strengths: strengths.length > 0 ? strengths : null,
        areas_for_growth: areasForGrowth.length > 0 ? areasForGrowth : null,
      })
      setSuccessMsg('✅ Discovery profile saved!')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function addTag(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, clearInput: () => void) {
    const trimmed = value.trim()
    if (trimmed) {
      setter(prev => [...prev, trimmed])
      clearInput()
    }
  }

  function removeTag(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  // Match assessments to placement rules
  function getPlacementRecommendations() {
    const recommendations: { domain: string; rule: PlacementRule; score?: number }[] = []
    const domainScores: Record<string, number> = {}

    assessments.forEach((session: any) => {
      if (session.domain && session.score !== undefined) {
        if (!domainScores[session.domain] || session.score > domainScores[session.domain]) {
          domainScores[session.domain] = session.score
        }
      }
    })

    placementRules.forEach(rule => {
      const score = domainScores[rule.domain]
      if (score !== undefined) {
        const [minStr, maxStr] = rule.score_range.split('-')
        const min = parseFloat(minStr)
        const max = parseFloat(maxStr)
        if (score >= min && score <= max) {
          recommendations.push({ domain: rule.domain, rule, score })
        }
      }
    })

    return recommendations
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">Student not found.</p>
        </div>
      </div>
    )
  }

  const age = studentInfo.date_of_birth ? calculateAge(studentInfo.date_of_birth) : null
  const recommendations = getPlacementRecommendations()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="🔭 Student Discovery Profile"
        subtitle={`${studentInfo.first_name} ${studentInfo.last_name}`}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Student Header Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {studentInfo.first_name} {studentInfo.last_name}
              </h2>
              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                <span>🎓 {studentInfo.grade_level}</span>
                {age !== null && <span>🎂 Age {age}</span>}
                {pilotLevel && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    ✈️ {pilotLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">{error}</div>}
        {successMsg && <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-4 mb-6">{successMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Discovery Profile */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🧭 Discovery Profile</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Learning Style</label>
                <select
                  value={learningStyle}
                  onChange={e => setLearningStyle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Not assessed</option>
                  {LEARNING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilot Level</label>
                <select
                  value={pilotLevel}
                  onChange={e => setPilotLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Not assigned</option>
                  {PILOT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">💡 Interests</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {interests.map((item, i) => (
                    <span key={i} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {item}
                      <button onClick={() => removeTag(setInterests, i)} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(setInterests, newInterest, () => setNewInterest('')))}
                    placeholder="Add interest..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={() => addTag(setInterests, newInterest, () => setNewInterest(''))}
                    className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200"
                  >+</button>
                </div>
              </div>

              {/* Strengths */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">💪 Strengths</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {strengths.map((item, i) => (
                    <span key={i} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {item}
                      <button onClick={() => removeTag(setStrengths, i)} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newStrength}
                    onChange={e => setNewStrength(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(setStrengths, newStrength, () => setNewStrength('')))}
                    placeholder="Add strength..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={() => addTag(setStrengths, newStrength, () => setNewStrength(''))}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                  >+</button>
                </div>
              </div>

              {/* Areas for Growth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🌱 Areas for Growth</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {areasForGrowth.map((item, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {item}
                      <button onClick={() => removeTag(setAreasForGrowth, i)} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newGrowthArea}
                    onChange={e => setNewGrowthArea(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(setAreasForGrowth, newGrowthArea, () => setNewGrowthArea('')))}
                    placeholder="Add area for growth..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={() => addTag(setAreasForGrowth, newGrowthArea, () => setNewGrowthArea(''))}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                  >+</button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-6 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : '💾 Save Discovery Profile'}
            </button>
          </div>

          {/* Placement Recommendations */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Placement Recommendations</h3>
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {domainEmoji(rec.domain)} {domainLabel(rec.domain)}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Score: {rec.score}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Grade:</span> {rec.rule.recommended_grade}
                        </div>
                        <div>
                          <span className="font-medium">Level:</span> {rec.rule.recommended_level}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{rec.rule.action}</p>
                      {rec.rule.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">{rec.rule.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="text-sm">No assessment data available for placement recommendations.</p>
                  <p className="text-xs mt-1">Complete domain assessments to see recommendations.</p>
                </div>
              )}
            </div>

            {/* Developmental Benchmarks */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">📏 Developmental Benchmarks</h3>
              {age !== null && (
                <p className="text-xs text-gray-500 mb-4">
                  Showing benchmarks for age range: {ageToRange(age)} years
                </p>
              )}
              {benchmarks.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {benchmarks.map(bm => (
                    <div key={bm.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{domainEmoji(bm.domain)}</span>
                        <span className="text-xs font-medium text-gray-700">{domainLabel(bm.domain)}</span>
                        <span className="text-xs text-gray-400">• {bm.area}</span>
                      </div>
                      <p className="text-sm text-gray-800">{bm.benchmark}</p>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>📋 {bm.assessment_method}</span>
                        <span>📊 {bm.typical_range}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No benchmarks available for this age range.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
