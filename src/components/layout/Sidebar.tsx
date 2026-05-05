import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks'

interface NavItem {
  path: string
  label: string
  icon: string
  divider?: boolean
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navItems: Record<string, NavItem[]> = {
  admin: [
    { path: '/admin', label: 'Command Center', icon: '📊' },
    { path: '/admin/students', label: 'Students', icon: '👩‍🎓' },
    { path: '/admin/enrollment', label: 'Enrollment', icon: '📋' },
    { path: '/admin/billing', label: 'Billing', icon: '💳' },
    { path: '/admin/subjects', label: 'Subjects', icon: '📚' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
    { path: '/admin/api-settings', label: 'API Settings', icon: '🔌' },
  ],
  teacher: [
    { path: '/teacher', label: 'Dashboard', icon: '🏠' },
    { path: '/teacher/mission-control', label: 'Mission Control', icon: '🎯' },
    { path: '/teacher/students', label: 'My Students', icon: '👩‍🎓' },
    { path: '/teacher/subjects', label: 'Subject Manager', icon: '📚' },
    { path: '/teacher/skill-map', label: 'Skill Map', icon: '🧠' },
    { path: '/teacher/assessments', label: 'Assessments', icon: '📋' },
    { path: '/teacher/discovery-results', label: 'Discovery Results', icon: '🎮' },
    { path: '/teacher/mastery', label: 'Mastery Tracker', icon: '📊' },
    { path: '/teacher/schedule', label: 'Schedule', icon: '📅' },
    { path: '/teacher/lessons', label: 'Lessons', icon: '📖', divider: true },
    { path: '/teacher/activities', label: 'Activities', icon: '🎮' },
    { path: '/teacher/library', label: 'Content Library', icon: '📚' },
    { path: '/teacher/curriculum', label: 'Curriculum', icon: '🗂️' },
    { path: '/teacher/resources', label: 'Resource Library', icon: '📕' },
    { path: '/teacher/assignments', label: 'Assignments', icon: '📝' },
    { path: '/teacher/item-bank', label: 'Item Bank', icon: '🏦' },
  ],
  parent: [
    { path: '/parent', label: 'Family Hub', icon: '🏠' },
    { path: '/parent/progress', label: 'Progress', icon: '📈' },
    { path: '/parent/growth', label: 'Growth Timeline', icon: '🌱' },
    { path: '/parent/assessments', label: 'Assessments', icon: '📋' },
    { path: '/parent/curriculum', label: 'Curriculum Guide', icon: '📚' },
    { path: '/parent/milestones', label: 'Milestones', icon: '🎉' },
    { path: '/parent/certificates', label: 'Certificates', icon: '🏆' },
    { path: '/parent/billing', label: 'Billing', icon: '💳' },
    { path: '/parent/enroll', label: 'Enroll', icon: '📋' },
    { path: '/parent/messages', label: 'Messages', icon: '✉️' },
    { path: '/settings/delete-account', label: 'Delete Account', icon: '🗑️', divider: true },
  ],
  student: [
    { path: '/student', label: 'Flight Plan', icon: '🛫' },
    { path: '/student/assessment', label: 'My Assessment', icon: '🌟' },
    { path: '/student/subjects', label: 'My Subjects', icon: '📚' },
    { path: '/student/progress', label: 'My Progress', icon: '🎯' },
    { path: '/student/achievements', label: 'Achievements', icon: '🏆' },
    { path: '/student/library', label: 'Library', icon: '📖' },
    { path: '/student/learning-path', label: 'Learning Path', icon: '🗺️' },
    { path: '/student/data-explorer', label: 'Data Explorer', icon: '📊' },
  ],
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user, signOut } = useAuth()
  if (!user) return null

  const items = navItems[user.role] || []

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-compass-navy text-white flex flex-col z-50 shrink-0
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-white/10">
          <h1 className="font-display text-xl font-bold">A² Compass</h1>
          <p className="text-sm text-white/60 mt-1">
            Achievement Academy
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">a2compass.org</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <div key={item.path}>
              {item.divider && (
                <div className="pt-3 pb-1 mt-2 border-t border-white/10">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 px-3">
                    {item.path.startsWith('/settings') ? 'Account' : 'Content Tools'}
                  </span>
                </div>
              )}
              <NavLink
                to={item.path}
                end={item.path === `/${user.role}`}
                onClick={handleNavClick}
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
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => signOut()}
              className="text-sm text-white/60 hover:text-white py-1.5 transition-colors"
            >
              Sign Out
            </button>
            <button
              onClick={() => {
                const isDark = document.documentElement.classList.toggle('dark')
                localStorage.setItem('a2c_darkMode', isDark ? 'true' : 'false')
              }}
              className="text-lg hover:scale-110 transition-transform"
              title="Toggle dark mode"
            >
              {typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
