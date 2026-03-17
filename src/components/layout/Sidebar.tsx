import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks'

interface NavItem {
  path: string
  label: string
  icon: string
  divider?: boolean
}

const navItems: Record<string, NavItem[]> = {
  admin: [
    { path: '/admin', label: 'Command Center', icon: '📊' },
    { path: '/admin/students', label: 'Students', icon: '👩‍🎓' },
    { path: '/admin/enrollment', label: 'Enrollment', icon: '📋' },
    { path: '/admin/billing', label: 'Billing', icon: '💳' },
    { path: '/admin/subjects', label: 'Subjects', icon: '📚' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
  ],
  teacher: [
    { path: '/teacher', label: 'Mission Control', icon: '🎯' },
    { path: '/teacher/students', label: 'My Students', icon: '👩‍🎓' },
    { path: '/teacher/skill-map', label: 'Skill Map', icon: '🧠' },
    { path: '/teacher/mastery', label: 'Mastery Tracker', icon: '📊' },
    { path: '/teacher/schedule', label: 'Schedule', icon: '📅' },
    // Content creation section
    { path: '/teacher/lessons', label: 'Lessons', icon: '📖', divider: true },
    { path: '/teacher/activities', label: 'Activities', icon: '🎮' },
    { path: '/teacher/library', label: 'Content Library', icon: '📚' },
    { path: '/teacher/curriculum', label: 'Curriculum', icon: '🗂️' },
    { path: '/teacher/assignments', label: 'Assignments', icon: '📝' },
  ],
  parent: [
    { path: '/parent', label: 'Family Hub', icon: '🏠' },
    { path: '/parent/progress', label: 'Progress', icon: '📈' },
    { path: '/parent/growth', label: 'Growth Timeline', icon: '🌱' },
    { path: '/parent/billing', label: 'Billing', icon: '💳' },
    { path: '/parent/enroll', label: 'Enroll', icon: '📋' },
    { path: '/parent/messages', label: 'Messages', icon: '✉️' },
  ],
  student: [
    { path: '/student', label: 'Flight Plan', icon: '🛫' },
    { path: '/student/subjects', label: 'My Subjects', icon: '📚' },
    { path: '/student/progress', label: 'My Progress', icon: '🎯' },
    { path: '/student/achievements', label: 'Achievements', icon: '🏆' },
  ],
}

export default function Sidebar() {
  const { user, signOut } = useAuth()
  if (!user) return null

  const items = navItems[user.role] || []

  return (
    <aside className="w-64 bg-compass-navy min-h-screen text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <h1 className="font-display text-xl font-bold">A² Compass</h1>
        <p className="text-sm text-white/60 mt-1">Achievement Academy</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item, i) => (
          <div key={item.path}>
            {item.divider && (
              <div className="pt-3 pb-1 mt-2 border-t border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-white/40 px-3">
                  Content Tools
                </span>
              </div>
            )}
            <NavLink
              to={item.path}
              end={item.path === `/${user.role}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-compass-blue flex items-center justify-center text-sm font-medium">
            {user.fullName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-xs text-white/50 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full text-sm text-white/60 hover:text-white py-1.5 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
