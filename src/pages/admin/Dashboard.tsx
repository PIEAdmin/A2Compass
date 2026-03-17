import { Header } from '../../components/layout'
import { PlatformStats, EnrollmentManager } from '../../components/admin'
import { useAuth } from '../../hooks'

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="📊 Command Center" subtitle={`Welcome, ${user?.fullName?.split(' ')[0] || 'Admin'}`} />
      <div className="p-6 space-y-6">
        <PlatformStats />
        <EnrollmentManager />
      </div>
    </div>
  )
}
