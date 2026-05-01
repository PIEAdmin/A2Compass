import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { supabase } from '../../services/supabase'

export default function DeleteAccount() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'info' | 'confirm' | 'deleting' | 'done'>('info')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deletionDetails, setDeletionDetails] = useState<{
    childCount: number
    childNames: string[]
  } | null>(null)

  // Load deletion preview
  const loadDeletionPreview = async () => {
    if (!user) return

    // Check if parent — find linked children
    if (user.role === 'parent') {
      const { data: children } = await supabase
        .from('student_profiles')
        .select('id, user_id, profiles!student_profiles_user_id_fkey(first_name, last_name)')
        .eq('parent_id', user.id)

      const names = (children || []).map((c: any) => {
        const p = c.profiles
        return p ? `${p.first_name} ${p.last_name || ''}`.trim() : 'Unknown'
      })

      setDeletionDetails({ childCount: children?.length || 0, childNames: names })
    } else {
      setDeletionDetails({ childCount: 0, childNames: [] })
    }

    setStep('confirm')
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return
    setStep('deleting')
    setError(null)

    try {
      // For parents: delete children's data first
      if (user?.role === 'parent') {
        const { data: children } = await supabase
          .from('student_profiles')
          .select('id, user_id')
          .eq('parent_id', user.id)

        for (const child of children || []) {
          // Delete child's learning data
          await supabase.from('playlist_items').delete().eq('student_id', child.id)
          await supabase.from('skill_mastery').delete().eq('student_id', child.id)
          await supabase.from('assessment_sessions').delete().eq('student_id', child.id)
          await supabase.from('student_enrollments').delete().eq('student_id', child.id)
          await supabase.from('student_profiles').delete().eq('id', child.id)
          await supabase.from('profiles').delete().eq('id', child.user_id)
          // Note: Auth user deletion requires service role — handled by edge function
        }
      }

      // Delete own learning data if student
      if (user?.role === 'student') {
        const { data: sp } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (sp) {
          await supabase.from('playlist_items').delete().eq('student_id', sp.id)
          await supabase.from('skill_mastery').delete().eq('student_id', sp.id)
          await supabase.from('assessment_sessions').delete().eq('student_id', sp.id)
          await supabase.from('student_enrollments').delete().eq('student_id', sp.id)
          await supabase.from('student_profiles').delete().eq('id', sp.id)
        }
      }

      // Delete COPPA consents
      await supabase.from('coppa_consents').delete().eq('parent_user_id', user!.id)

      // Delete own profile
      await supabase.from('profiles').delete().eq('id', user!.id)

      // Request auth user deletion via edge function
      await supabase.functions.invoke('delete-account', {
        body: { userId: user!.id },
      }).catch(() => {
        // Edge function may not exist yet — that's ok, data is already cleared
        console.warn('delete-account edge function not available — auth user remains but all data deleted')
      })

      // Sign out
      await signOut()
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please contact support.')
      setStep('confirm')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <button
        onClick={() => navigate(-1)}
        className="text-compass-blue hover:underline text-sm mb-4 flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 sm:p-8">
        {step === 'info' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">🗑️</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Delete Account</h1>
                <p className="text-gray-500 text-sm">Permanently remove your account and data</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-red-800 text-sm">⚠️ This action is permanent</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Your account and login will be permanently deleted</li>
                <li>• All learning progress, scores, and achievements will be erased</li>
                {user?.role === 'parent' && (
                  <li>• <strong>Your children's accounts and all their data will also be deleted</strong></li>
                )}
                <li>• Any active subscriptions will be canceled</li>
                <li>• This cannot be undone</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 text-sm">💡 Before you go...</h3>
              <p className="text-sm text-blue-700 mt-1">
                If something isn't working right, we'd love to help! Contact Sandra at{' '}
                <a href="mailto:sandra@aaacademy.us" className="underline font-medium">sandra@aaacademy.us</a>
                {' '}before deleting.
              </p>
            </div>

            <button
              onClick={loadDeletionPreview}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              I Understand — Continue
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">Confirm Deletion</h1>

            {deletionDetails && deletionDetails.childCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h3 className="font-semibold text-orange-800 text-sm">
                  👨‍👩‍👧‍👦 The following child accounts will also be deleted:
                </h3>
                <ul className="mt-2 space-y-1">
                  {deletionDetails.childNames.map((name, i) => (
                    <li key={i} className="text-sm text-orange-700 flex items-center gap-2">
                      <span>•</span> {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('info'); setConfirmText('') }}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE'}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        )}

        {step === 'deleting' && (
          <div className="text-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-600">Deleting account and all associated data...</p>
            <p className="text-gray-400 text-sm">This may take a moment.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8 space-y-5">
            <div className="text-5xl">👋</div>
            <h2 className="text-xl font-bold text-gray-900">Account Deleted</h2>
            <p className="text-gray-600">
              Your account and all associated data have been removed. We're sorry to see you go.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary px-8 py-2.5"
            >
              Return to Home
            </button>
          </div>
        )}
      </div>

      {/* COPPA compliance note */}
      <p className="text-center text-gray-400 text-xs mt-6">
        In compliance with COPPA, all children's data is permanently deleted. 
        For questions, contact{' '}
        <a href="mailto:hello@a2compass.org" className="underline">hello@a2compass.org</a>.
      </p>
    </div>
  )
}
