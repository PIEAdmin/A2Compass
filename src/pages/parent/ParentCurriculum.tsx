import { useState, useEffect } from 'react'
import {
  getCurriculumResources,
  getCurriculumResource,
  getAllDownloadableFiles,
  getFileDownloadUrl,
  resourceTypeLabels,
  subjectLabels,
  gradeLevelLabels,
  type CurriculumResource,
  type CurriculumFile,
} from '../../services/curriculum-resources.service'

type Tab = 'overview' | 'subjects' | 'downloads'

export default function ParentCurriculum() {
  const [tab, setTab] = useState<Tab>('overview')
  const [resources, setResources] = useState<Omit<CurriculumResource, 'content_markdown'>[]>([])
  const [files, setFiles] = useState<CurriculumFile[]>([])
  const [selectedResource, setSelectedResource] = useState<CurriculumResource | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [resourceData, fileData] = await Promise.all([
        getCurriculumResources({ audience: ['all', 'parent', 'student'] }),
        getAllDownloadableFiles(),
      ])
      setResources(resourceData)
      setFiles(fileData)
    } catch (err) {
      console.error('Failed to load curriculum:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openResource(id: string) {
    try {
      const data = await getCurriculumResource(id)
      setSelectedResource(data)
    } catch (err) {
      console.error('Failed to load resource:', err)
    }
  }

  if (selectedResource) {
    return (
      <ResourceView
        resource={selectedResource}
        onBack={() => setSelectedResource(null)}
      />
    )
  }

  // Filter resources by grade if selected
  const filteredResources = selectedGrade === 'all'
    ? resources
    : resources.filter(r => r.grade_levels.includes(selectedGrade))

  // Organize for parent view
  const overview = filteredResources.find(r => r.resource_type === 'overview')
  const scopeSequence = filteredResources.filter(r => r.resource_type === 'scope_sequence')
  const parentTemplates = filteredResources.filter(r => r.resource_type === 'parent_template')
  const studyGuides = filteredResources.filter(r => r.resource_type === 'study_guide')
  const worksheets = filteredResources.filter(r => r.resource_type === 'worksheet')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'What We Teach', icon: '🎯' },
    { id: 'subjects', label: 'By Subject', icon: '📚' },
    { id: 'downloads', label: 'Downloads', icon: '📥' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📚 What Your Child Is Learning</h1>
        <p className="text-gray-600 mt-1">
          Explore A² Compass curriculum — see what skills are covered, download study materials, and follow along at home.
        </p>
      </div>

      {/* Grade Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Grade Level:</span>
        {[
          { value: 'all', label: 'All Grades' },
          { value: 'pre-k', label: 'Pre-K' },
          { value: 'k', label: 'K' },
          { value: '1', label: '1st' },
          { value: '2', label: '2nd' },
          { value: '3', label: '3rd' },
          { value: '4', label: '4th' },
        ].map(g => (
          <button
            key={g.value}
            onClick={() => setSelectedGrade(g.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedGrade === g.value
                ? 'bg-compass-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-compass-blue text-compass-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-compass-blue border-t-transparent rounded-full mb-3" />
          <p>Loading curriculum...</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Program Philosophy */}
              {overview && (
                <button
                  onClick={() => openResource(overview.id)}
                  className="w-full text-left bg-gradient-to-br from-compass-navy to-compass-blue rounded-xl p-6 text-white hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-bold mb-2">🎯 Program Overview & Philosophy</h3>
                  <p className="text-white/80 text-sm">
                    Learn about A² Compass's adaptive learning approach, our mission, and how we personalize education for every child.
                  </p>
                  <span className="inline-block mt-3 text-sm text-white/60">Tap to read →</span>
                </button>
              )}

              {/* Scope & Sequence Cards */}
              {scopeSequence.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">📋 Scope & Sequence by Grade</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scopeSequence.map(r => (
                      <button
                        key={r.id}
                        onClick={() => openResource(r.id)}
                        className="text-left bg-white rounded-xl border border-gray-200 hover:border-compass-blue hover:shadow-md p-4 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">📋</span>
                          <h3 className="font-medium text-gray-900">{r.title}</h3>
                        </div>
                        <p className="text-sm text-gray-500">
                          See all subjects, skills, and learning objectives
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Guides for Students */}
              {studyGuides.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">📚 Study Guides</h2>
                  <div className="space-y-2">
                    {studyGuides.map(r => (
                      <ParentResourceCard key={r.id} resource={r} onClick={() => openResource(r.id)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Parent Letters */}
              {parentTemplates.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">✉️ From Your Teacher</h2>
                  <div className="space-y-2">
                    {parentTemplates.map(r => (
                      <ParentResourceCard key={r.id} resource={r} onClick={() => openResource(r.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* By Subject Tab */}
          {tab === 'subjects' && (
            <div className="space-y-8">
              {['literacy', 'math', 'daily_living', 'sel'].map(subject => {
                const subjectMeta = subjectLabels[subject]
                const subjectResources = filteredResources.filter(
                  r => r.subject === subject && ['lesson_plan', 'worksheet', 'study_guide', 'assessment'].includes(r.resource_type)
                )
                if (subjectResources.length === 0) return null
                return (
                  <div key={subject}>
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span>{subjectMeta?.icon}</span> {subjectMeta?.label}
                      <span className="text-sm font-normal text-gray-500">({subjectResources.length} resources)</span>
                    </h2>
                    <div className="space-y-2">
                      {subjectResources.map(r => (
                        <ParentResourceCard key={r.id} resource={r} onClick={() => openResource(r.id)} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Downloads Tab */}
          {tab === 'downloads' && (
            <div className="space-y-6">
              {/* PDF & DOCX Downloads */}
              {files.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">📥 Printable Materials</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Download and print these worksheets, flash cards, and study plans for at-home practice.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {files.map(f => (
                      <a
                        key={f.id}
                        href={getFileDownloadUrl(f.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl border border-gray-200 hover:border-compass-blue hover:shadow-md p-4 transition-all flex items-start gap-3"
                      >
                        <span className="text-3xl">{f.mime_type?.includes('pdf') ? '📄' : '📝'}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900">{f.file_name}</h3>
                          {f.description && (
                            <p className="text-sm text-gray-500 mt-1">{f.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {f.file_size_bytes ? `${(f.file_size_bytes / 1024).toFixed(0)} KB` : ''} · Click to download
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Worksheet Resources (in-app viewable) */}
              {worksheets.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">📄 Worksheets (View Online)</h2>
                  <div className="space-y-2">
                    {worksheets.map(r => (
                      <ParentResourceCard key={r.id} resource={r} onClick={() => openResource(r.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ParentResourceCard({ resource, onClick }: {
  resource: Omit<CurriculumResource, 'content_markdown'>
  onClick: () => void
}) {
  const meta = resourceTypeLabels[resource.resource_type] || { label: resource.resource_type, icon: '📄', color: 'bg-gray-100 text-gray-800' }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-gray-200 hover:border-compass-blue hover:shadow-sm transition-all p-3 flex items-center gap-3"
    >
      <span className="text-xl flex-shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 text-sm">{resource.title}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
          {resource.grade_levels.length > 0 && resource.grade_levels.length <= 3 && (
            <span className="text-xs text-gray-400">
              {resource.grade_levels.map(g => gradeLevelLabels[g] || g).join(', ')}
            </span>
          )}
        </div>
      </div>
      <span className="text-gray-400 flex-shrink-0">›</span>
    </button>
  )
}

function ResourceView({ resource, onBack }: {
  resource: CurriculumResource
  onBack: () => void
}) {
  const meta = resourceTypeLabels[resource.resource_type] || { label: resource.resource_type, icon: '📄', color: 'bg-gray-100 text-gray-800' }

  function renderMarkdown(md: string) {
    let html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-4 mb-1">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-5 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-compass-navy mt-6 mb-3">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700">$1</li>')
      .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
      .replace(/^\|(.+)\|$/gm, (_, row) => {
        const cells = row.split('|').map((c: string) => c.trim())
        return '<tr>' + cells.map((c: string) => `<td class="border border-gray-200 px-3 py-1.5 text-sm">${c}</td>`).join('') + '</tr>'
      })
      .replace(/\n\n/g, '</p><p class="text-gray-700 mb-3">')
    html = `<p class="text-gray-700 mb-3">${html}</p>`
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table class="w-full border-collapse my-3">$1</table>')
    return html
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-compass-blue hover:text-compass-navy mb-4 text-sm font-medium"
      >
        ← Back
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-3 mb-2">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{resource.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
              {resource.grade_levels.length > 0 && (
                <span>🎒 {resource.grade_levels.map(g => gradeLevelLabels[g] || g).join(', ')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(resource.content_markdown) }}
        />
      </div>
    </div>
  )
}
