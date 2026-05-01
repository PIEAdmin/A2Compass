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
  type ResourceType,
} from '../../services/curriculum-resources.service'

type ViewMode = 'list' | 'detail'

const typeFilters: { value: ResourceType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Resources', icon: '📚' },
  { value: 'lesson_plan', label: 'Lesson Plans', icon: '📖' },
  { value: 'scope_sequence', label: 'Scope & Sequence', icon: '📋' },
  { value: 'assessment', label: 'Assessments', icon: '📝' },
  { value: 'test', label: 'Tests', icon: '✏️' },
  { value: 'worksheet', label: 'Worksheets', icon: '📄' },
  { value: 'study_guide', label: 'Study Guides', icon: '📚' },
  { value: 'teacher_guide', label: 'Teacher Guides', icon: '🧑‍🏫' },
  { value: 'parent_template', label: 'Parent Letters', icon: '✉️' },
  { value: 'report_card', label: 'Report Card', icon: '📊' },
  { value: 'overview', label: 'Overview', icon: '🎯' },
]

const subjectFilters = [
  { value: 'all', label: 'All Subjects', icon: '📌' },
  { value: 'literacy', label: 'Literacy', icon: '📖' },
  { value: 'math', label: 'Mathematics', icon: '🔢' },
  { value: 'daily_living', label: 'Daily Living', icon: '🏠' },
  { value: 'sel', label: 'Social-Emotional', icon: '❤️' },
  { value: 'general', label: 'General', icon: '📌' },
]

const gradeFilters = [
  { value: 'all', label: 'All Grades' },
  { value: 'pre-k', label: 'Pre-K' },
  { value: 'k', label: 'Kindergarten' },
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
  { value: '4', label: 'Grade 4' },
]

export default function TeacherResources() {
  const [resources, setResources] = useState<Omit<CurriculumResource, 'content_markdown'>[]>([])
  const [files, setFiles] = useState<CurriculumFile[]>([])
  const [selectedResource, setSelectedResource] = useState<CurriculumResource | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadResources()
    loadFiles()
  }, [typeFilter, subjectFilter, gradeFilter])

  async function loadResources() {
    setLoading(true)
    try {
      const filters: Record<string, unknown> = {}
      if (typeFilter !== 'all') filters.resource_type = typeFilter
      if (subjectFilter !== 'all') filters.subject = subjectFilter
      if (gradeFilter !== 'all') filters.grade_level = gradeFilter
      const data = await getCurriculumResources(filters as Parameters<typeof getCurriculumResources>[0])
      setResources(data)
    } catch (err) {
      console.error('Failed to load resources:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadFiles() {
    try {
      const data = await getAllDownloadableFiles()
      setFiles(data)
    } catch (err) {
      console.error('Failed to load files:', err)
    }
  }

  async function openResource(id: string) {
    setDetailLoading(true)
    try {
      const data = await getCurriculumResource(id)
      setSelectedResource(data)
      setViewMode('detail')
    } catch (err) {
      console.error('Failed to load resource:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  function goBack() {
    setSelectedResource(null)
    setViewMode('list')
  }

  const filtered = resources.filter(r =>
    !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group resources by type for display
  const grouped = filtered.reduce((acc, r) => {
    const type = r.resource_type
    if (!acc[type]) acc[type] = []
    acc[type].push(r)
    return acc
  }, {} as Record<string, typeof filtered>)

  if (viewMode === 'detail' && selectedResource) {
    return <ResourceDetail resource={selectedResource} files={files} onBack={goBack} />
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📚 Teacher Resource Library</h1>
        <p className="text-gray-600 mt-1">
          Lesson plans, assessments, worksheets, and guides — your complete A² Compass curriculum toolkit.
        </p>
      </div>

      {/* Downloadable Files Banner */}
      {files.length > 0 && (
        <div className="bg-gradient-to-r from-compass-navy to-compass-blue rounded-xl p-4 mb-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold">📥 Downloadable Materials</h3>
              <p className="text-sm text-white/80">Printable worksheets, study plans, and curriculum guide</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {files.map(f => (
                <a
                  key={f.id}
                  href={getFileDownloadUrl(f.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                >
                  {f.mime_type?.includes('pdf') ? '📄' : '📝'}
                  <span className="truncate max-w-[200px]">{f.file_name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="🔍 Search resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
          >
            {typeFilters.map(f => (
              <option key={f.value} value={f.value}>{f.icon} {f.label}</option>
            ))}
          </select>
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
          >
            {subjectFilters.map(f => (
              <option key={f.value} value={f.value}>{f.icon} {f.label}</option>
            ))}
          </select>
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
          >
            {gradeFilters.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-compass-blue border-t-transparent rounded-full mb-3" />
          <p>Loading resources...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p>No resources match your filters.</p>
        </div>
      ) : typeFilter !== 'all' ? (
        // Flat list when filtered to a single type
        <div className="space-y-2">
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} onClick={() => openResource(r.id)} />
          ))}
        </div>
      ) : (
        // Grouped by type
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, items]) => {
            const meta = resourceTypeLabels[type] || { label: type, icon: '📄', color: 'bg-gray-100 text-gray-800' }
            return (
              <div key={type}>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>{meta.icon}</span> {meta.label}
                  <span className="text-sm font-normal text-gray-500">({items.length})</span>
                </h2>
                <div className="space-y-2">
                  {items.map(r => (
                    <ResourceCard key={r.id} resource={r} onClick={() => openResource(r.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <div className="animate-spin w-8 h-8 border-4 border-compass-blue border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-600">Loading resource...</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ResourceCard({ resource, onClick }: {
  resource: Omit<CurriculumResource, 'content_markdown'>
  onClick: () => void
}) {
  const meta = resourceTypeLabels[resource.resource_type] || { label: resource.resource_type, icon: '📄', color: 'bg-gray-100 text-gray-800' }
  const subjectMeta = resource.subject ? subjectLabels[resource.subject] : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-gray-200 hover:border-compass-blue hover:shadow-md transition-all p-4 flex items-start gap-3"
    >
      <span className="text-2xl flex-shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {resource.code && (
            <span className="text-xs font-mono font-bold text-compass-blue bg-compass-blue/10 px-1.5 py-0.5 rounded">
              {resource.code}
            </span>
          )}
          <h3 className="font-medium text-gray-900 truncate">{resource.title}</h3>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          {subjectMeta && subjectMeta.label !== 'General' && (
            <span className="text-xs text-gray-500">
              {subjectMeta.icon} {subjectMeta.label}
            </span>
          )}
          {resource.grade_levels.length > 0 && resource.grade_levels.length <= 3 && (
            <span className="text-xs text-gray-400">
              {resource.grade_levels.map(g => gradeLevelLabels[g] || g).join(', ')}
            </span>
          )}
          {resource.standards.length > 0 && (
            <span className="text-xs text-gray-400 font-mono">
              {resource.standards.slice(0, 2).join(', ')}{resource.standards.length > 2 ? '...' : ''}
            </span>
          )}
        </div>
      </div>
      <span className="text-gray-400 flex-shrink-0">›</span>
    </button>
  )
}

function ResourceDetail({ resource, files, onBack }: {
  resource: CurriculumResource
  files: CurriculumFile[]
  onBack: () => void
}) {
  const meta = resourceTypeLabels[resource.resource_type] || { label: resource.resource_type, icon: '📄', color: 'bg-gray-100 text-gray-800' }

  // Simple markdown rendering — converts headers, bold, lists, tables to HTML
  function renderMarkdown(md: string) {
    let html = md
      // Escape HTML
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Headers
      .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-4 mb-1">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-5 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-compass-navy mt-6 mb-3">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700">$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700">$1</li>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
      // Table rows (basic)
      .replace(/^\|(.+)\|$/gm, (_, row) => {
        const cells = row.split('|').map((c: string) => c.trim())
        return '<tr>' + cells.map((c: string) => `<td class="border border-gray-200 px-3 py-1.5 text-sm">${c}</td>`).join('') + '</tr>'
      })
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p class="text-gray-700 mb-3">')

    // Wrap in paragraph
    html = `<p class="text-gray-700 mb-3">${html}</p>`

    // Wrap tables
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table class="w-full border-collapse my-3">$1</table>')

    return html
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-compass-blue hover:text-compass-navy mb-4 text-sm font-medium"
      >
        ← Back to Resource Library
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {resource.code && (
                <span className="text-sm font-mono font-bold text-compass-blue bg-compass-blue/10 px-2 py-0.5 rounded">
                  {resource.code}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>
                {meta.label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{resource.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
              {resource.subject && resource.subject !== 'general' && (
                <span>{subjectLabels[resource.subject]?.icon} {subjectLabels[resource.subject]?.label}</span>
              )}
              {resource.grade_levels.length > 0 && (
                <span>🎒 {resource.grade_levels.map(g => gradeLevelLabels[g] || g).join(', ')}</span>
              )}
              {resource.standards.length > 0 && (
                <span className="font-mono text-xs">📏 {resource.standards.join(', ')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Print button */}
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(resource.content_markdown) }}
        />
      </div>

      {/* Related Files */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">📥 Downloadable Files</h3>
          <div className="space-y-2">
            {files.map(f => (
              <a
                key={f.id}
                href={getFileDownloadUrl(f.storage_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-2xl">{f.mime_type?.includes('pdf') ? '📄' : '📝'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{f.file_name}</p>
                  {f.description && <p className="text-sm text-gray-500 truncate">{f.description}</p>}
                  {f.file_size_bytes && (
                    <p className="text-xs text-gray-400">{(f.file_size_bytes / 1024).toFixed(0)} KB</p>
                  )}
                </div>
                <span className="text-compass-blue font-medium text-sm">Download ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
