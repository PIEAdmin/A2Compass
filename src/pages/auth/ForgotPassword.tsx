import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-compass-navy to-blue-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-white">A² Compass</h1>
          <p className="text-blue-200 mt-2">Achievement Academy — aaacademy.us</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <h2 className="text-xl font-semibold text-compass-navy">Check Your Email</h2>
              <p className="text-gray-600 text-sm">
                We sent a password reset link to <strong>{email}</strong>. 
                Click the link in the email to set a new password.
              </p>
              <p className="text-gray-400 text-xs">
                Don't see it? Check your spam folder.
              </p>
              <Link
                to="/login"
                className="inline-block mt-4 text-compass-blue hover:underline text-sm font-medium"
              >
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-center text-compass-navy">Forgot Password</h2>
              <p className="text-gray-500 text-sm text-center">
                Enter your email and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="text-center">
                <Link to="/login" className="text-compass-blue hover:underline text-sm">
                  ← Back to Sign In
                </Link>
              </div>
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
