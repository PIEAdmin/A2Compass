import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'

export default function LoginPage() {
  const { signIn, loading, error, clearError, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    signIn(email, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-compass-navy to-blue-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-white">A² Compass</h1>
          <p className="text-blue-200 mt-2">Achievement Academy — aaacademy.us</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-center text-compass-navy">Welcome Back</h2>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm" onClick={clearError}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Domain branding + legal footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-blue-300/70 text-xs">
            Platform by A² Compass ·{' '}
            <a href="https://a2compass.org" className="text-blue-300 hover:text-white underline" target="_blank" rel="noopener noreferrer">
              a2compass.org
            </a>
          </p>
          <p className="text-blue-300/50 text-xs">
            <a href="https://a2compass.org/privacy-policy.html" className="hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            {' · '}
            <a href="https://a2compass.org/terms-of-service.html" className="hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
          </p>
          <p className="text-blue-300/50 text-xs">
            Need help?{' '}
            <a href="mailto:hello@a2compass.org" className="hover:text-blue-300 underline">
              hello@a2compass.org
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
