import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Supabase handles the token exchange automatically via the URL hash
    // We just need to check if there's a valid session
    const checkSession = async () => {
      // Handle the hash fragment from the email link
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && type === 'recovery') {
        // Set the session from the recovery link
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })
        if (sessionError) {
          setError('This reset link is invalid or has expired. Please request a new one.')
          setChecking(false)
          return
        }
        setHasSession(true)
        setChecking(false)
        // Clean up the URL
        window.history.replaceState(null, '', window.location.pathname)
        return
      }

      // Also check if there's already a session (e.g., auto-exchanged)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasSession(true)
      } else {
        setError('This reset link is invalid or has expired. Please request a new one.')
      }
      setChecking(false)
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      // Sign out so they can log in fresh
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-compass-navy to-blue-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-compass-navy to-blue-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-white">A² Compass</h1>
          <p className="text-blue-200 mt-2">Achievement Academy — aaacademy.us</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-xl font-semibold text-compass-navy">Password Updated!</h2>
              <p className="text-gray-600 text-sm">
                Your password has been changed. Redirecting to sign in...
              </p>
            </div>
          ) : !hasSession ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">⚠️</div>
              <h2 className="text-xl font-semibold text-compass-navy">Link Expired</h2>
              <p className="text-gray-600 text-sm">{error}</p>
              <Link
                to="/forgot-password"
                className="inline-block btn-primary px-6 py-2"
              >
                Request New Link
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-center text-compass-navy">Set New Password</h2>
              <p className="text-gray-500 text-sm text-center">
                Choose a new password for your account.
              </p>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                    placeholder="Type it again"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-blue-300/50 text-xs">
            <a href="https://a2compass.org/privacy-policy.html" className="hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            {' · '}
            <a href="https://a2compass.org/terms-of-service.html" className="hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
