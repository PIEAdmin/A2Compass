import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppFooter from './AppFooter'
import { useAuth } from '../../hooks'

export default function DashboardLayout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-compass-navy flex items-center justify-between px-4 z-40 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="font-display text-lg font-bold text-white">A² Compass</h1>
        <div className="w-8 h-8 rounded-full bg-compass-blue flex items-center justify-center text-sm font-medium text-white">
          {initial}
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content + footer */}
      <div className="flex-1 flex flex-col pt-14 lg:pt-0">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
