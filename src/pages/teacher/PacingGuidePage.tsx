import { useState, useEffect } from 'react'
import { Header } from '../../components/layout'
import { LoadingSpinner } from '../../components/common'
import {
  getPacingGuide,
  getLessonPlans,
  type PacingGuideEntry,
  type LessonPlan,
} from '../../services/curriculum.service'

const phaseColors: Record<string, { bg: string; border: string; text: string; badge: string; line: string }> = {
  Foundation: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-600 text-white',
    line: 'bg-blue-400',
  },
  Building: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-600 text-white',
    line: 'bg-amber-400',
  },
  Application: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white',
    line: 'bg-green-400',
  },
}

const phaseEmoji: Record<string, string> = {
  Foundation: '🧱',
  Building: '🏗️',
  Application: '🚀',
}

function domainEmoji(domain: string) {
  const map: Record<string, string> = {
    math: '🔢', ela: '📖', science: '🔬',
    social_studies: '🌍', foreign_language: '🗣️', creative_arts: '🎨',
  }
  return map[domain] || '📘'
}

function domainLabel(domain: string) {
  return domain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function PacingGuidePage() {
  const [entries, setEntries] = useState<PacingGuideEntry[]>([])
  const [lessons, setLessons] = useState<Record<string, LessonPlan>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [pacingData, lessonData] = await Promise.all([
          getPacingGuide(),
          getLessonPlans(),
        ])
        setEntries(pacingData)

        const lessonMap: Record<string, LessonPlan> = {}
        lessonData.forEach(l => { lessonMap[l.id] = l })
        setLessons(lessonMap)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="🗓️ Pacing Guide"
        subtitle="12-week curriculum pacing with phases and milestones"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">{error}</div>}

        {/* Phase Legend */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-600">Phases:</span>
            {Object.entries(phaseColors).map(([phase, colors]) => (
              <div key={phase} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${colors.line}`}></span>
                <span className="text-sm text-gray-700">{phaseEmoji[phase]} {phase}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 hidden md:block"></div>

          <div className="space-y-6">
            {entries.map((entry, index) => {
              const colors = phaseColors[entry.phase] || phaseColors.Foundation
              const emoji = phaseEmoji[entry.phase] || '📅'

              return (
                <div key={entry.id} className="relative md:pl-16">
                  {/* Timeline dot */}
                  <div className={`absolute left-4 top-6 w-5 h-5 rounded-full ${colors.line} border-4 border-white shadow-sm hidden md:block z-10`}></div>

                  {/* Card */}
                  <div className={`${colors.bg} ${colors.border} border rounded-xl p-6 transition-shadow hover:shadow-md`}>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      {/* Week badge */}
                      <span className="text-sm font-bold text-gray-900 bg-white rounded-lg px-3 py-1 shadow-sm border">
                        📅 Weeks {entry.weeks}
                      </span>
                      {/* Phase badge */}
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${colors.badge}`}>
                        {emoji} {entry.phase}
                      </span>
                      {/* Domain */}
                      <span className="text-sm text-gray-600">
                        {domainEmoji(entry.domain)} {domainLabel(entry.domain)}
                      </span>
                    </div>

                    {/* Topics */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.topics.map((topic, i) => (
                          <span key={i} className="bg-white text-gray-700 text-sm px-3 py-1.5 rounded-lg border shadow-sm">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Assessment Checkpoint */}
                    {entry.assessment_checkpoint && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Assessment Checkpoint</p>
                        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
                          <span className="text-lg">🎯</span>
                          <span className={`text-sm font-medium ${colors.text}`}>{entry.assessment_checkpoint}</span>
                        </div>
                      </div>
                    )}

                    {/* Linked Lessons */}
                    {entry.lesson_ids && entry.lesson_ids.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Linked Lessons</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.lesson_ids.map(lid => {
                            const lesson = lessons[lid]
                            return (
                              <span
                                key={lid}
                                className="inline-flex items-center gap-1 bg-white text-indigo-700 text-xs px-2.5 py-1 rounded-full border border-indigo-200 hover:bg-indigo-50 cursor-pointer transition-colors"
                                title={lesson ? `${lesson.title} (${lesson.duration_minutes}m)` : lid}
                              >
                                📎 {lesson ? lesson.title : 'Lesson'}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200/60">
                        <p className="text-xs text-gray-500 italic">📝 {entry.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Phase transition marker */}
                  {index < entries.length - 1 && entries[index + 1].phase !== entry.phase && (
                    <div className="flex items-center justify-center my-2 md:ml-[-2rem]">
                      <div className="border-t border-dashed border-gray-300 flex-1"></div>
                      <span className="px-3 text-xs text-gray-400 font-medium whitespace-nowrap">
                        ↓ {entries[index + 1].phase} Phase
                      </span>
                      <div className="border-t border-dashed border-gray-300 flex-1"></div>
                    </div>
                  )}
                </div>
              )
            })}

            {entries.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">📅</p>
                <p>No pacing guide entries found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
