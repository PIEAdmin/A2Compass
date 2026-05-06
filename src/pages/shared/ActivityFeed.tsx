import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'

interface ActivityEvent {
  event_id: string
  event_type: string
  student_name: string
  student_profile_id: string
  event_time: string
  status: string | null
  items_attempted: number | null
  items_correct: number | null
  accuracy: number | null
  duration_seconds: number | null
  session_type: string | null
  details: Record<string, unknown>
}

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  login:                   { icon: '🔑', label: 'Logged In',              color: 'bg-blue-100 text-blue-800 border-blue-200' },
  assessment_started:      { icon: '🚀', label: 'Assessment Started',     color: 'bg-purple-100 text-purple-800 border-purple-200' },
  assessment_in_progress:  { icon: '📝', label: 'Assessment In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  assessment_paused:       { icon: '⏸️', label: 'Assessment Paused',      color: 'bg-orange-100 text-orange-800 border-orange-200' },
  assessment_complete:     { icon: '✅', label: 'Assessment Complete',    color: 'bg-green-100 text-green-800 border-green-200' },
  assessment_abandoned:    { icon: '⚠️', label: 'Assessment Incomplete',  color: 'bg-red-100 text-red-800 border-red-200' },
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterStudent, setFilterStudent] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchEvents = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { p_limit: 200 }
      if (filterStudent !== 'all') params.p_student_id = filterStudent

      const { data, error } = await supabase.rpc('get_student_activity_feed', params)
      if (error) throw error

      let filtered = data || []
      if (filterType !== 'all') {
        filtered = filtered.filter((e: ActivityEvent) => e.event_type === filterType)
      }

      setEvents(filtered)
      setLastRefresh(new Date())

      // Extract unique students for filter
      const unique = new Map<string, string>()
      ;(data || []).forEach((e: ActivityEvent) => {
        if (!unique.has(e.student_profile_id)) {
          unique.set(e.student_profile_id, e.student_name)
        }
      })
      setStudents(Array.from(unique, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      console.error('Failed to fetch activity feed:', err)
    } finally {
      setLoading(false)
    }
  }, [filterStudent, filterType])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchEvents, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchEvents])

  // Group events by date
  const groupedByDate = events.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
    const { date } = formatDateTime(e.event_time)
    if (!acc[date]) acc[date] = []
    acc[date].push(e)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Student Activity Feed</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time logins, assessments, and progress — auto-refreshes every 5 seconds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? '🟢 Live' : '⏸ Paused'}
          </button>
          <button
            onClick={fetchEvents}
            className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Student</label>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Event Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Events</option>
            <option value="login">🔑 Logins</option>
            <option value="assessment_started">🚀 Assessment Started</option>
            <option value="assessment_in_progress">📝 In Progress</option>
            <option value="assessment_paused">⏸️ Paused</option>
            <option value="assessment_complete">✅ Completed</option>
            <option value="assessment_abandoned">⚠️ Incomplete</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">
            {events.filter(e => e.event_type === 'login').length}
          </div>
          <div className="text-xs text-blue-600">Total Logins</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <div className="text-2xl font-bold text-yellow-700">
            {events.filter(e => e.event_type === 'assessment_in_progress').length}
          </div>
          <div className="text-xs text-yellow-600">In Progress</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="text-2xl font-bold text-green-700">
            {events.filter(e => e.event_type === 'assessment_complete').length}
          </div>
          <div className="text-xs text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="text-2xl font-bold text-red-700">
            {events.filter(e => ['assessment_abandoned', 'assessment_paused'].includes(e.event_type)).length}
          </div>
          <div className="text-xs text-red-600">Paused / Incomplete</div>
        </div>
      </div>

      {/* Activity feed */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading activity feed...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-500 font-medium">No student activity yet</div>
          <div className="text-gray-400 text-sm mt-1">Events will appear here as students log in and take assessments</div>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, dayEvents]) => (
          <div key={date} className="mb-6">
            <div className="sticky top-0 bg-gray-50 px-3 py-2 rounded-lg mb-3 z-10">
              <span className="text-sm font-semibold text-gray-700">📅 {date}</span>
              <span className="text-xs text-gray-400 ml-2">({dayEvents.length} events)</span>
            </div>
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const cfg = EVENT_CONFIG[event.event_type] || { icon: '📌', label: event.event_type, color: 'bg-gray-100 text-gray-700 border-gray-200' }
                const { time } = formatDateTime(event.event_time)
                const isAssessment = event.event_type.startsWith('assessment')
                
                return (
                  <div
                    key={event.event_id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-colors hover:shadow-sm ${cfg.color}`}
                  >
                    {/* Time column */}
                    <div className="text-center min-w-[70px]">
                      <div className="text-lg">{cfg.icon}</div>
                      <div className="text-xs font-mono font-semibold mt-1">{time}</div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{event.student_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 font-medium">
                          {cfg.label}
                        </span>
                      </div>

                      {isAssessment && (
                        <div className="flex flex-wrap gap-4 mt-2 text-xs">
                          {event.items_attempted != null && event.items_attempted > 0 && (
                            <>
                              <span>
                                📊 <strong>{event.items_correct}</strong> / {event.items_attempted} correct
                              </span>
                              <span>
                                🎯 <strong>{event.accuracy}%</strong> accuracy
                              </span>
                            </>
                          )}
                          {event.duration_seconds != null && event.duration_seconds > 0 && (
                            <span>⏱ {formatDuration(event.duration_seconds)}</span>
                          )}
                          {event.details?.skills_assessed != null && Number(event.details.skills_assessed) > 0 && (
                            <span>🧠 {String(event.details.skills_assessed)} skills assessed</span>
                          )}
                          {event.details?.skills_mastered != null && Number(event.details.skills_mastered) > 0 && (
                            <span>⭐ {String(event.details.skills_mastered)} mastered</span>
                          )}
                          {event.session_type && (
                            <span className="italic opacity-75">
                              ({event.session_type.replace(/_/g, ' ')})
                            </span>
                          )}
                        </div>
                      )}

                      {event.event_type === 'login' && (
                        <div className="text-xs mt-1 opacity-75">Student signed in to the app</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
