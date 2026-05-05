import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks'
import DiscoverOER from '../../components/student/DiscoverOER'

/* ── Inline types ─────────────────────────────────────── */

interface ContentItem {
  id: string
  title: string
  description: string | null
  activity_type: string
  grade_level: string | null
  tags: string[] | null
  status: string
  skill_node_id: string | null
  created_at: string
  subject_name: string | null
}

interface SkillDomain {
  id: string
  name: string
}

/* ── Constants ────────────────────────────────────────── */

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  interactive_game: { emoji: '🎮', label: 'Games' },
  animated_story: { emoji: '📺', label: 'Videos' },
  practice_arena: { emoji: '✏️', label: 'Practice' },
  hands_on_activity: { emoji: '🎨', label: 'Activities' },
  holiday_activity: { emoji: '🎄', label: 'Holiday' },
}

const GRADE_OPTIONS = ['All', 'Pre-K', 'K', '1st', '2nd', '3rd', '4th']

const SUBJECT_COLORS: Record<string, string> = {
  Math: 'bg-blue-100 text-blue-700',
  'Language Arts': 'bg-green-100 text-green-700',
  Science: 'bg-yellow-100 text-yellow-700',
  'Social Studies': 'bg-orange-100 text-orange-700',
  Art: 'bg-pink-100 text-pink-700',
  Music: 'bg-purple-100 text-purple-700',
}

function subjectColor(name: string | null) {
  if (!name) return 'bg-gray-100 text-gray-600'
  return SUBJECT_COLORS[name] ?? 'bg-indigo-100 text-indigo-700'
}

function gradeColor(grade: string | null) {
  if (!grade) return 'bg-gray-100 text-gray-500'
  return 'bg-amber-100 text-amber-700'
}

/* ── Helpers ──────────────────────────────────────────── */

function favKey(userId: string | undefined) {
  return `a2c_favorites_${userId ?? 'guest'}`
}

function loadFavorites(userId: string | undefined): Set<string> {
  try {
    const raw = localStorage.getItem(favKey(userId))
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    /* ignore */
  }
  return new Set()
}

function saveFavorites(userId: string | undefined, favs: Set<string>) {
  localStorage.setItem(favKey(userId), JSON.stringify([...favs]))
}

/* ── Skeleton card ────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow animate-pulse space-y-3">
      <div className="h-5 w-16 rounded-full bg-gray-200" />
      <div className="h-6 w-3/4 rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-200" />
        <div className="h-5 w-12 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  )
}

/* ── Pill button ──────────────────────────────────────── */

function Pill({
  label,
  active,
  onClick,
  emoji,
}: {
  label: string
  active: boolean
  onClick: () => void
  emoji?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all
        ${
          active
            ? 'bg-indigo-600 text-white shadow-md scale-105'
            : 'bg-white text-gray-700 hover:bg-indigo-50 border border-gray-200'
        }`}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  )
}

/* ── Main component ───────────────────────────────────── */

export default function StudentLibrary() {
  const { user } = useAuth()
  const userId = user?.id

  /* Data */
  const [items, setItems] = useState<ContentItem[]>([])
  const [domains, setDomains] = useState<SkillDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Filters */
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedGrade, setSelectedGrade] = useState('All')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  /* Favorites */
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites(userId))

  useEffect(() => {
    setFavorites(loadFavorites(userId))
  }, [userId])

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        saveFavorites(userId, next)
        return next
      })
    },
    [userId],
  )

  /* Fetch content + domains */
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch domains for subject filter
        const { data: domainData } = await supabase
          .from('skill_domains')
          .select('id, name')
          .order('name')

        if (!cancelled && domainData) setDomains(domainData)

        // Fetch published content with subject join
        // We go: content_library → skill_nodes → skill_domains
        let { data, error: fetchErr } = await supabase
          .from('content_library')
          .select(`
            id,
            title,
            description,
            activity_type,
            grade_level,
            tags,
            status,
            skill_node_id,
            created_at,
            skill_nodes!left (
              domain_id,
              skill_domains!left ( name )
            )
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        // Fallback: if no published items, show draft
        if (!fetchErr && (!data || data.length === 0)) {
          const fallback = await supabase
            .from('content_library')
            .select(`
              id,
              title,
              description,
              activity_type,
              grade_level,
              tags,
              status,
              skill_node_id,
              created_at,
              skill_nodes!left (
                domain_id,
                skill_domains!left ( name )
              )
            `)
            .eq('status', 'draft')
            .order('created_at', { ascending: false })

          data = fallback.data
          fetchErr = fallback.error
        }

        if (fetchErr) throw fetchErr

        // Normalise the nested join into a flat subject_name
        const normalised: ContentItem[] = (data ?? []).map((row: any) => {
          let subjectName: string | null = null
          try {
            const node = row.skill_nodes
            if (node) {
              const dom = node.skill_domains
              if (dom) subjectName = dom.name ?? null
            }
          } catch {
            /* ignore */
          }
          return {
            id: row.id,
            title: row.title,
            description: row.description,
            activity_type: row.activity_type,
            grade_level: row.grade_level,
            tags: row.tags,
            status: row.status,
            skill_node_id: row.skill_node_id,
            created_at: row.created_at,
            subject_name: subjectName,
          }
        })

        if (!cancelled) setItems(normalised)
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load content')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  /* Derived filtered list */
  const filtered = useMemo(() => {
    let list = items

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((i) => i.title.toLowerCase().includes(q))
    }

    // Subject
    if (selectedSubject !== 'All') {
      list = list.filter((i) => i.subject_name === selectedSubject)
    }

    // Type
    if (selectedType !== 'All') {
      const typeKey = Object.entries(TYPE_META).find(
        ([, v]) => v.label === selectedType,
      )?.[0]
      if (typeKey) list = list.filter((i) => i.activity_type === typeKey)
    }

    // Grade
    if (selectedGrade !== 'All') {
      list = list.filter((i) => i.grade_level === selectedGrade)
    }

    // Favorites
    if (showFavoritesOnly) {
      list = list.filter((i) => favorites.has(i.id))
    }

    return list
  }, [items, search, selectedSubject, selectedType, selectedGrade, showFavoritesOnly, favorites])

  /* Build type filter options */
  const typeOptions = [
    { label: 'All', emoji: undefined },
    ...Object.values(TYPE_META).map((t) => ({ label: t.label, emoji: t.emoji })),
  ]

  const subjectOptions = ['All', ...domains.map((d) => d.name)]

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          📚 My Library
        </h1>
        <p className="mt-1 text-gray-500 text-base sm:text-lg">
          Explore lessons, games, and activities
        </p>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          {/* Row 1: search + favorites toggle */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search activities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none text-sm transition"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFavoritesOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all border
                ${
                  showFavoritesOnly
                    ? 'bg-red-50 border-red-300 text-red-600 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-red-50'
                }`}
            >
              ❤️ {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites Only'}
            </button>
          </div>

          {/* Row 2: subject pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {subjectOptions.map((s) => (
              <Pill
                key={s}
                label={s}
                active={selectedSubject === s}
                onClick={() => setSelectedSubject(s)}
              />
            ))}
          </div>

          {/* Row 3: type + grade pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
              Type
            </span>
            {typeOptions.map((t) => (
              <Pill
                key={t.label}
                label={t.label}
                emoji={t.emoji}
                active={selectedType === t.label}
                onClick={() => setSelectedType(t.label)}
              />
            ))}
            <span className="ml-3 text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
              Grade
            </span>
            {GRADE_OPTIONS.map((g) => (
              <Pill
                key={g}
                label={g}
                active={selectedGrade === g}
                onClick={() => setSelectedGrade(g)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error state */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-lg font-semibold text-gray-600">No activities found</p>
            <p className="text-gray-400 mt-1">Try a different filter!</p>
          </div>
        )}

        {/* Content grid */}
        {!loading && filtered.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-4">
              {filtered.length} {filtered.length === 1 ? 'activity' : 'activities'} found
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => {
                const meta = TYPE_META[item.activity_type] ?? {
                  emoji: '📄',
                  label: item.activity_type,
                }
                const isFav = favorites.has(item.id)

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => alert(`Opening "${item.title}"…`)}
                    className="group relative flex flex-col rounded-2xl bg-white p-5 shadow-sm border border-gray-100 text-left transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {/* Top row: type badge + favorite */}
                    <div className="flex items-start justify-between mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {meta.emoji} {meta.label}
                      </span>

                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(item.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            toggleFavorite(item.id)
                          }
                        }}
                        className={`text-xl transition-transform duration-200 hover:scale-125 ${
                          isFav ? 'drop-shadow-sm' : 'opacity-40 group-hover:opacity-70'
                        }`}
                        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFav ? '❤️' : '🤍'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                      {item.title}
                    </h3>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {item.subject_name && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${subjectColor(
                            item.subject_name,
                          )}`}
                        >
                          {item.subject_name}
                        </span>
                      )}
                      {item.grade_level && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${gradeColor(
                            item.grade_level,
                          )}`}
                        >
                          {item.grade_level}
                        </span>
                      )}
                      {item.status === 'draft' && (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Bottom decorative bar */}
                    <div className="mt-auto pt-3">
                      <div className="h-1 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <DiscoverOER />
    </div>
  )
}
