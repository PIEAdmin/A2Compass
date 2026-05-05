import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'

interface OrgForm {
  name: string
  type: 'daycare' | 'school' | 'homeschool_coop' | 'tutoring' | 'childcare' | 'other'
  contact_name: string
  contact_email: string
  contact_phone: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  student_count: string
  teacher_count: string
  notes: string
}

interface Organization {
  id: string
  name: string
  type: string
  contact_name: string
  contact_email: string
  contact_phone: string
  address: any
  student_count: number
  teacher_count: number
  status: string
  created_at: string
  notes: string
}

const ORG_TYPES = [
  { value: 'daycare', label: '🏫 Daycare / Childcare Center' },
  { value: 'school', label: '🎒 School (K-12)' },
  { value: 'homeschool_coop', label: '🏡 Homeschool Co-op' },
  { value: 'tutoring', label: '📚 Tutoring Program' },
  { value: 'childcare', label: '👶 After-School / Childcare' },
  { value: 'other', label: '🏢 Other Organization' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
]

export default function OrganizationIntake() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState<OrgForm>({
    name: '', type: 'daycare', contact_name: '', contact_email: '', contact_phone: '',
    address_line1: '', address_line2: '', city: '', state: '', zip: '',
    student_count: '', teacher_count: '', notes: '',
  })

  useEffect(() => { loadOrgs() }, [])

  async function loadOrgs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setOrgs(data)
    if (error) console.error('Failed to load organizations:', error)
    setLoading(false)
  }

  function updateForm(field: keyof OrgForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.name || !form.contact_name || !form.contact_email) {
      setError('Please fill in organization name, contact name, and email.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('organizations').insert({
      name: form.name,
      type: form.type,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || null,
      address: {
        line1: form.address_line1,
        line2: form.address_line2,
        city: form.city,
        state: form.state,
        zip: form.zip,
      },
      student_count: form.student_count ? parseInt(form.student_count) : null,
      teacher_count: form.teacher_count ? parseInt(form.teacher_count) : null,
      notes: form.notes || null,
      status: 'pending',
    })

    if (insertError) {
      setError(`Failed to save: ${insertError.message}`)
    } else {
      setSuccess(`${form.name} added successfully!`)
      setForm({
        name: '', type: 'daycare', contact_name: '', contact_email: '', contact_phone: '',
        address_line1: '', address_line2: '', city: '', state: '', zip: '',
        student_count: '', teacher_count: '', notes: '',
      })
      setShowForm(false)
      loadOrgs()
      setTimeout(() => setSuccess(''), 5000)
    }
    setSaving(false)
  }

  async function updateStatus(orgId: string, status: string) {
    await supabase.from('organizations').update({ status }).eq('id', orgId)
    loadOrgs()
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-500',
    trial: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-compass-navy">🏢 Organizations</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage daycare centers, schools, and tutoring programs
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
        >
          {showForm ? '✕ Close Form' : '+ Add Organization'}
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm flex items-center gap-2">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
          ❌ {error}
        </div>
      )}

      {/* Intake Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border p-6 mb-6 space-y-5">
          <h2 className="text-lg font-bold text-compass-navy flex items-center gap-2">
            📋 Organization Intake Form
          </h2>

          {/* Org Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-compass-blue"
                placeholder="e.g., Sunshine Daycare"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type *</label>
              <select
                value={form.type}
                onChange={e => updateForm('type', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-compass-blue"
              >
                {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Primary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={e => updateForm('contact_name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={e => updateForm('contact_email', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                  placeholder="jane@daycare.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={e => updateForm('contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Address</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={form.address_line1}
                onChange={e => updateForm('address_line1', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                placeholder="Street address"
              />
              <input
                type="text"
                value={form.address_line2}
                onChange={e => updateForm('address_line2', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                placeholder="Suite, unit, etc. (optional)"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={form.city}
                  onChange={e => updateForm('city', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                  placeholder="City"
                />
                <select
                  value={form.state}
                  onChange={e => updateForm('state', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                >
                  <option value="">State</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="text"
                  value={form.zip}
                  onChange={e => updateForm('zip', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Estimated Size</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Number of Students</label>
                <input
                  type="number"
                  value={form.student_count}
                  onChange={e => updateForm('student_count', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                  placeholder="e.g., 25"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Number of Teachers/Staff</label>
                <input
                  type="number"
                  value={form.teacher_count}
                  onChange={e => updateForm('teacher_count', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
                  placeholder="e.g., 5"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={form.notes}
              onChange={e => updateForm('notes', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-compass-blue"
              rows={3}
              placeholder="Grade levels served, special needs, schedule preferences, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-6 py-2 text-sm"
            >
              {saving ? 'Saving...' : '✅ Save Organization'}
            </button>
          </div>
        </form>
      )}

      {/* Organizations List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-3xl mb-2">🔄</div>
          <p className="text-gray-500 text-sm">Loading organizations...</p>
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border p-12 text-center">
          <div className="text-5xl mb-3">🏫</div>
          <h3 className="text-lg font-semibold text-compass-navy mb-2">No organizations yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Click "Add Organization" to register a daycare center, school, or tutoring program.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary px-4 py-2 text-sm"
          >
            + Add Your First Organization
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orgs.map(org => (
            <div key={org.id} className="bg-white rounded-2xl shadow border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-compass-navy">{org.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[org.status] || statusColors.pending}`}>
                      {org.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                    <div>
                      <span className="text-xs text-gray-400 block">Type</span>
                      {ORG_TYPES.find(t => t.value === org.type)?.label || org.type}
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">Contact</span>
                      {org.contact_name}
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">Email</span>
                      <a href={`mailto:${org.contact_email}`} className="text-compass-blue hover:underline">{org.contact_email}</a>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">Size</span>
                      {org.student_count || '?'} students · {org.teacher_count || '?'} teachers
                    </div>
                  </div>
                  {org.address && (org.address as any).line1 && (
                    <p className="text-xs text-gray-400 mt-2">
                      📍 {(org.address as any).line1}{(org.address as any).city ? `, ${(org.address as any).city}` : ''}{(org.address as any).state ? ` ${(org.address as any).state}` : ''} {(org.address as any).zip || ''}
                    </p>
                  )}
                  {org.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{org.notes}"</p>
                  )}
                  <p className="text-xs text-gray-300 mt-2">
                    Added {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={org.status}
                    onChange={e => updateStatus(org.id, e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-compass-blue"
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="trial">🔵 Trial</option>
                    <option value="active">✅ Active</option>
                    <option value="inactive">⬜ Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
