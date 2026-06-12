import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { supabase } from '../../services/supabase'
import { PepperPenguin, FloatingStars, FloatingClouds } from '../../components/shared/Illustrations'

export default function DemoLogin() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [status, setStatus] = useState('Preparing your adventure...')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
      return
    }

    let cancelled = false

    async function autoLogin() {
      try {
        setStatus('Signing in as demo student...')
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: 'Adela@aaacademy.app',
          password: 'Adela1',
        })
        if (signInError) throw signInError

        if (!cancelled) {
          setStatus('Welcome aboard! Redirecting...')
          // Auth state change will trigger redirect via isAuthenticated
          setTimeout(() => {
            if (!cancelled) navigate('/', { replace: true })
          }, 1200)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Could not sign in. Please try again.')
        }
      }
    }

    autoLogin()
    return () => { cancelled = true }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 px-4 relative overflow-hidden">
      <FloatingStars count={15} />
      <FloatingClouds />

      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="mb-6 illust-slide-up">
          <div className="flex justify-center mb-3">
            <PepperPenguin size={120} mood="waving" className="illust-bob" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white tracking-tight">A² Compass</h1>
          <p className="text-blue-200/80 mt-1 text-sm">Achievement Academy — Demo Mode</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 illust-scale-in" style={{ animationDelay: '0.2s' }}>
          {error ? (
            <div className="space-y-4">
              <div className="text-5xl">😕</div>
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg className="animate-spin h-10 w-10 text-indigo-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-indigo-900 font-semibold text-lg">{status}</p>
              <p className="text-gray-500 text-sm">Logging in as <strong>Adela</strong> 🎒</p>
            </div>
          )}
        </div>

        <div className="text-center mt-6 illust-slide-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-blue-300/60 text-xs">
            Platform by A² Compass ·{' '}
            <a href="https://a2compass.org" className="text-blue-300/80 hover:text-white underline transition-colors" target="_blank" rel="noopener noreferrer">
              a2compass.org
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
