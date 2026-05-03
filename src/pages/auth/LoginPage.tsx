import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { PepperPenguin, FloatingStars, FloatingClouds } from '../../components/shared/Illustrations'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 px-4 relative overflow-hidden">
      {/* Animated background */}
      <FloatingStars count={15} />
      <FloatingClouds />

      {/* Decorative circles */}
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Header with mascot */}
        <div className="text-center mb-6 illust-slide-up">
          <div className="flex justify-center mb-3">
            <PepperPenguin size={120} mood="waving" className="illust-bob" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white tracking-tight">A² Compass</h1>
          <p className="text-blue-200/80 mt-1 text-sm">Achievement Academy — aaacademy.us</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-5 illust-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-indigo-900">Welcome Back! 👋</h2>
            <p className="text-gray-500 text-sm mt-1">Ready for another learning adventure?</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 flex items-center gap-2" onClick={clearError}>
              <span>⚠️</span> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-gray-50/50 transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-gray-50/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 transform hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Let\'s Go! 🚀'
            )}
          </button>

          <div className="text-center pt-1">
            <span className="text-gray-500 text-sm">New family? </span>
            <Link to="/register" className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm font-medium transition-colors">
              Create an Account ✨
            </Link>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2 illust-slide-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-blue-300/60 text-xs">
            Platform by A² Compass ·{' '}
            <a href="https://a2compass.org" className="text-blue-300/80 hover:text-white underline transition-colors" target="_blank" rel="noopener noreferrer">
              a2compass.org
            </a>
          </p>
          <p className="text-blue-300/40 text-xs">
            <a href="https://a2compass.org/privacy-policy.html" className="hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            {' · '}
            <a href="https://a2compass.org/terms-of-service.html" className="hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
          </p>
          <p className="text-blue-300/40 text-xs">
            Need help?{' '}
            <a href="mailto:hello@a2compass.org" className="hover:text-blue-300 underline transition-colors">
              hello@a2compass.org
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
