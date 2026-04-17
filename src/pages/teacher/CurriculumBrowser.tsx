import { useState, useEffect } from 'react'
import { Header } from '../../components/layout'
import { LoadingSpinner } from '../../components/common'
import {
  getScopeSequence,
  getAssessmentActivities,
  getPrintableMaterials,
  getStudyGuides,
  type ScopeSequenceEntry,
  type AssessmentActivity,
  type PrintableMaterial,
  type StudyGuide,
} from '../../services/curriculum.service'

type TabKey = 'scope' | 'assessments' | 'printables' | 'guides'

const DOMAINS = [
  { value: '', label: 'All Domains' },
  { value: 'math', label: '🔢 Math' },
  { value: 'ela', label: '📖 ELA' },
  { value: 'science', label: '🔬 Science' },
  { value: 'social_studies', label: '🌍 Social Studies' },
  { value: 'foreign_language', label: '🗣️ Foreign Language' },
  { value: 'creative_arts', label: '🎨 Creative Arts' },
]

const GRADE_LEVELS = [
  { value: '', label: 'All Grades' },
  { value: 'Pre-K', label: 'Pre-K' },
  { value: 'Kindergarten', label: 'Kindergarten' },
  { value: 'Grade 1', label: 'Grade 1' },
  { value: 'Grade 2', label: 'Grade 2' },
  { value: 'Grade 3', label: 'Grade 3' },
  { value: 'Grade 4', label: 'Grade 4' },
]

const ACTIVITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'formal', label: '📋 Formal' },
  { value: 'hands_on', label: '🤲 Hands-On' },
  { value: 'observation', label: '👁️ Observation' },
  { value: 'game_based', label: '🎮 Game-Based' },
]

const MATERIAL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'activity_sheet', label: 'Activity Sheet' },
  { value: 'game', label: 'Game' },
  { value: 'manipulative', label: 'Manipulative' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'reference', label: 'Reference' },
]

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'scope', label: 'Scope & Sequence', icon: '📚' },
  { key: 'assessments', label: 'Assessment Tools', icon: '🧪' },
  { key: 'printables', label: 'Printable Materials', icon: '🖨️' },
  { key: 'guides', label: 'Study Guides', icon: '📝' },
]

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

function typeBadgeColor(type: string) {
  const map: Record<string, string> = {
    formal: 'bg-blue-100 text-blue-700',
    hands_on: 'bg-green-100 text-green-700',
    observation: 'bg-yellow-100 text-yellow-700',
    game_based: 'bg-purple-100 text-purple-700',
    worksheet: 'bg-blue-100 text-blue-700',
    activity_sheet: 'bg-green-100 text-green-700',
    game: 'bg-purple-100 text-purple-700',
    manipulative: 'bg-orange-100 text-orange-700',
    assessment: 'bg-red-100 text-red-700',
    reference: 'bg-gray-100 text-gray-700',
  }
  return map[type] || 'bg-gray-100 text-gray-700'
}

// ─── Scope & Sequence Tab ────────────────────────────────────────────────────

function ScopeTab() {
  const [data, setData] = useState<ScopeSequenceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [domain, setDomain] = useState('')
  const [grade, setGrade] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    getScopeSequence({
      domain: domain || undefined,
      grade_level: grade || undefined,
    })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [domain, grade])

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select
          value={grade}
          onChange={e => setGrade(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {GRADE_LEVELS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <span className="flex items-center text-sm text-gray-500">
          {data.length} skill{data.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && <div className="text-red-600 bg-red-50 rounded-lg p-4">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Domain</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Grade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Strand</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Skill</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Standard</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Q</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.map(entry => (
                  <ScopeRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No skills match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ScopeRow({ entry, expanded, onToggle }: {
  entry: ScopeSequenceEntry
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <span className="mr-1">{domainEmoji(entry.domain)}</span>
          {domainLabel(entry.domain)}
        </td>
        <td className="px-4 py-3 text-gray-700">{entry.grade_level}</td>
        <td className="px-4 py-3 text-gray-700">{entry.strand}</td>
        <td className="px-4 py-3 font-medium text-gray-900">{entry.skill_name}</td>
        <td className="px-4 py-3">
          <span className="bg-indigo-50 text-indigo-700 text-xs font-mono px-2 py-0.5 rounded">
            {entry.standard_code}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-600">Q{entry.quarter}</td>
        <td className="px-4 py-3 text-gray-400">
          {expanded ? '▲' : '▼'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-indigo-50/40">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700 mb-1">📝 Description</p>
                <p className="text-gray-600">{entry.description}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">🎯 Mastery Criteria</p>
                <p className="text-gray-600">{entry.mastery_criteria}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">🔗 Prerequisites</p>
                {entry.prerequisite_skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {entry.prerequisite_skills.map((s, i) => (
                      <span key={i} className="bg-white text-gray-700 text-xs px-2 py-0.5 rounded border">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">None</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">📈 Progression Notes</p>
                <p className="text-gray-600">{entry.progression_notes || 'N/A'}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Assessments Tab ─────────────────────────────────────────────────────────

function AssessmentsTab() {
  const [data, setData] = useState<AssessmentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('')
  const [domain, setDomain] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    getAssessmentActivities({
      type: type || undefined,
      domain: domain || undefined,
    })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [type, domain])

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <span className="flex items-center text-sm text-gray-500">
          {data.length} activit{data.length !== 1 ? 'ies' : 'y'} found
        </span>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && <div className="text-red-600 bg-red-50 rounded-lg p-4">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map(activity => (
            <div
              key={activity.id}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                  {activity.activity_name}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${typeBadgeColor(activity.type)}`}>
                  {activity.type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span>{domainEmoji(activity.domain)} {domainLabel(activity.domain)}</span>
                <span>⏱️ {activity.duration_minutes}m</span>
                <span>📊 {activity.grade_range}</span>
              </div>
              {expandedId === activity.id && (
                <div className="border-t pt-3 mt-2 space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">🧰 Materials</p>
                    <div className="flex flex-wrap gap-1">
                      {activity.materials?.map((m, i) => (
                        <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">📋 Procedure</p>
                    <p className="text-gray-600 text-xs leading-relaxed">{activity.procedure}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">✅ Scoring Criteria</p>
                    <p className="text-gray-600 text-xs leading-relaxed">{activity.scoring_criteria}</p>
                  </div>
                  {activity.accommodations && (
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">♿ Accommodations</p>
                      <p className="text-gray-600 text-xs leading-relaxed">{activity.accommodations}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {data.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No assessment activities match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Printables Tab ──────────────────────────────────────────────────────────

function PrintablesTab() {
  const [data, setData] = useState<PrintableMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('')
  const [domain, setDomain] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getPrintableMaterials({
      type: type || undefined,
      domain: domain || undefined,
    })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [type, domain])

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <span className="flex items-center text-sm text-gray-500">
          {data.length} material{data.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && <div className="text-red-600 bg-red-50 rounded-lg p-4">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map(mat => (
            <div key={mat.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">{mat.title}</h3>
              </div>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${typeBadgeColor(mat.type)}`}>
                {mat.type.replace('_', ' ')}
              </span>
              <div className="space-y-1 text-xs text-gray-500">
                <p>{domainEmoji(mat.domain)} {domainLabel(mat.domain)}</p>
                <p>📊 {mat.grade_range}</p>
                <p>🎯 {mat.skill_target}</p>
                <p>📄 {mat.page_count} page{mat.page_count !== 1 ? 's' : ''}</p>
              </div>
              {mat.instructions && (
                <p className="mt-3 text-xs text-gray-600 line-clamp-3 border-t pt-2">
                  {mat.instructions}
                </p>
              )}
            </div>
          ))}
          {data.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No materials match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Study Guides Tab ────────────────────────────────────────────────────────

function GuidesTab() {
  const [data, setData] = useState<StudyGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    getStudyGuides()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && <div className="text-red-600 bg-red-50 rounded-lg p-4">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.map(guide => (
            <div key={guide.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{guide.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{domainEmoji(guide.domain)} {domainLabel(guide.domain)}</span>
                    <span>📊 {guide.grade_range}</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === guide.id ? null : guide.id)}
                  className="text-indigo-600 text-sm hover:text-indigo-800 font-medium"
                >
                  {expandedId === guide.id ? 'Collapse' : 'Expand'}
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{guide.content}</p>

              {expandedId === guide.id && (
                <div className="space-y-4 border-t pt-4">
                  {guide.content && (
                    <div>
                      <p className="font-semibold text-gray-700 text-sm mb-1">📖 Full Content</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{guide.content}</p>
                    </div>
                  )}

                  {guide.key_vocabulary && guide.key_vocabulary.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-700 text-sm mb-2">📚 Key Vocabulary</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {guide.key_vocabulary.map((item, i) => (
                          <div key={i} className="bg-indigo-50 rounded-lg px-3 py-2">
                            {Object.entries(item).map(([term, def]) => (
                              <div key={term}>
                                <span className="font-medium text-indigo-700 text-xs">{term}</span>
                                <p className="text-xs text-gray-600">{def}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {guide.practice_problems && guide.practice_problems.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-700 text-sm mb-2">✏️ Practice Problems</p>
                      <ol className="space-y-2">
                        {guide.practice_problems.map((prob, i) => (
                          <li key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-700">
                            {Object.entries(prob).map(([q, a]) => (
                              <div key={q}>
                                <p className="font-medium">{q}</p>
                                <p className="text-gray-500 mt-0.5">Answer: {a}</p>
                              </div>
                            ))}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {guide.parent_tips && (
                    <div>
                      <p className="font-semibold text-gray-700 text-sm mb-1">💡 Parent Tips</p>
                      <p className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3">{guide.parent_tips}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {data.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No study guides available.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CurriculumBrowser() {
  const [activeTab, setActiveTab] = useState<TabKey>('scope')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="📚 Curriculum Browser"
        subtitle="Explore scope & sequence, assessments, printables, and study guides"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 bg-white rounded-xl shadow-sm border p-1 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'scope' && <ScopeTab />}
        {activeTab === 'assessments' && <AssessmentsTab />}
        {activeTab === 'printables' && <PrintablesTab />}
        {activeTab === 'guides' && <GuidesTab />}
      </div>
    </div>
  )
}
