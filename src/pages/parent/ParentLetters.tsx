import { useState, useEffect, useRef } from 'react'
import { Header } from '../../components/layout'
import { LoadingSpinner } from '../../components/common'
import { useAuth } from '../../hooks'
import {
  getParentTemplates,
  type ParentCommTemplate,
} from '../../services/curriculum.service'
import { supabase } from '../../services/supabase'

const typeEmoji: Record<string, string> = {
  welcome_letter: '👋',
  progress_snapshot: '📊',
  lightbulb_certificate: '💡',
  term_report: '📋',
}

const typeLabel: Record<string, string> = {
  welcome_letter: 'Welcome Letter',
  progress_snapshot: 'Progress Snapshot',
  lightbulb_certificate: 'Lightbulb Certificate',
  term_report: 'Term Report',
}

const typeColor: Record<string, string> = {
  welcome_letter: 'from-blue-500 to-blue-600',
  progress_snapshot: 'from-green-500 to-green-600',
  lightbulb_certificate: 'from-yellow-500 to-amber-500',
  term_report: 'from-purple-500 to-purple-600',
}

const typeBorderColor: Record<string, string> = {
  welcome_letter: 'border-blue-200 hover:border-blue-300',
  progress_snapshot: 'border-green-200 hover:border-green-300',
  lightbulb_certificate: 'border-yellow-200 hover:border-yellow-300',
  term_report: 'border-purple-200 hover:border-purple-300',
}

export default function ParentLetters() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<ParentCommTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ParentCommTemplate | null>(null)
  const [studentName, setStudentName] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getParentTemplates()
        setTemplates(data)

        // Try to get student name for the current parent
        if (user?.id) {
          const { data: children } = await supabase
            .from('student_profiles')
            .select('first_name, last_name')
            .eq('parent_id', user.id)
            .limit(1)
          if (children && children.length > 0) {
            setStudentName(`${children[0].first_name} ${children[0].last_name}`)
          }
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  function populateTemplate(template: string): string {
    const now = new Date()
    const replacements: Record<string, string> = {
      '{{student_name}}': studentName || '[Student Name]',
      '{{student_first_name}}': studentName.split(' ')[0] || '[First Name]',
      '{{parent_name}}': user?.name || '[Parent Name]',
      '{{teacher_name}}': '[Teacher Name]',
      '{{date}}': now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      '{{school_year}}': '2025-2026',
      '{{term}}': 'Term 1',
      '{{school_name}}': 'A² Academy',
      '{{grade_level}}': '[Grade Level]',
    }

    let result = template
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
    })
    return result
  }

  function handlePrint() {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedTemplate?.template_name || 'Letter'}</title>
          <style>
            body { font-family: Georgia, serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1a1a1a; }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            p { margin: 0.5rem 0; }
            @media print { body { padding: 1rem; } }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>window.print(); window.close();<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
      <Header
        title="✉️ Parent Letters"
        subtitle="View and print communication templates"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">{error}</div>}

        {!selectedTemplate ? (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Select a template to preview and print. Templates are automatically personalized with your child's information.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`bg-white rounded-xl shadow-sm border ${typeBorderColor[template.type] || 'border-gray-200 hover:border-gray-300'} p-6 text-left hover:shadow-md transition-all group`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeColor[template.type] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                    {typeEmoji[template.type] || '📄'}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{template.template_name}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {typeLabel[template.type] || template.type}
                  </p>
                  <p className="text-xs text-gray-400">{template.subject}</p>
                  {template.design_notes && (
                    <p className="text-xs text-gray-300 mt-2 italic">{template.design_notes}</p>
                  )}
                </button>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">✉️</p>
                  <p>No communication templates available.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            {/* Back + Actions */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Templates
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                🖨️ Print
              </button>
            </div>

            {/* Template Info Header */}
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeColor[selectedTemplate.type] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-2xl`}>
                  {typeEmoji[selectedTemplate.type] || '📄'}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{selectedTemplate.template_name}</h2>
                  <p className="text-sm text-gray-500">{selectedTemplate.subject}</p>
                </div>
              </div>
              {selectedTemplate.design_notes && (
                <p className="mt-3 text-xs text-gray-400 italic bg-gray-50 rounded-lg p-2">
                  💡 Design Note: {selectedTemplate.design_notes}
                </p>
              )}
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {selectedTemplate.variables.map((v, i) => (
                    <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Letter Preview */}
            <div className="bg-white rounded-xl shadow-sm border p-8 md:p-12">
              <div ref={printRef} className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif">
                  {populateTemplate(selectedTemplate.body_template)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
