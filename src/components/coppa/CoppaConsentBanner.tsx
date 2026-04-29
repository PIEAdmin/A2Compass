import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks'
import { coppaService } from '../../services/coppa.service'
import { supabase } from '../../services/supabase'

interface ChildProfile {
  id: string
  full_name: string
}

export default function CoppaConsentBanner() {
  const { user } = useAuth()
  const [childrenNeedingConsent, setChildrenNeedingConsent] = useState<ChildProfile[]>([])
  const [consenting, setConsenting] = useState<string | null>(null)
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user) return
    checkConsent()
  }, [user])

  async function checkConsent() {
    if (!user) return
    const { data: children } = await supabase
      .from('student_profiles')
      .select('id, user_id, profiles!student_profiles_user_id_fkey(full_name)')
      .eq('parent_id', user.id)

    if (!children || children.length === 0) return

    const needConsent: ChildProfile[] = []
    for (const child of children) {
      const hasConsent = await coppaService.hasConsent(user.id, child.id)
      if (!hasConsent) {
        const profile = child.profiles as any
        needConsent.push({
          id: child.id,
          full_name: profile?.full_name || 'Your child',
        })
      }
    }
    setChildrenNeedingConsent(needConsent)
  }

  async function handleConsent(childId: string) {
    if (!user || !agreed[childId]) return
    setConsenting(childId)
    const success = await coppaService.giveConsent({
      parentId: user.id,
      childId,
    })
    if (success) {
      setChildrenNeedingConsent((prev) => prev.filter((c) => c.id !== childId))
      if (childrenNeedingConsent.length <= 1) setDone(true)
    }
    setConsenting(null)
  }

  if (childrenNeedingConsent.length === 0) {
    if (done) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-green-700 font-medium">✅ Parental consent recorded. Thank you!</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔒</span>
        <div>
          <h3 className="font-bold text-amber-900 text-base">Parental Consent Required</h3>
          <p className="text-sm text-amber-700 mt-1">
            Federal law (COPPA) requires us to obtain your consent before collecting personal information from children
            under 13. Please review and consent below for each child.
          </p>
        </div>
      </div>

      {childrenNeedingConsent.map((child) => (
        <div key={child.id} className="bg-white rounded-lg border border-amber-100 p-4 space-y-3">
          <p className="font-medium text-gray-800">Consent for: {child.full_name}</p>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 max-h-32 overflow-y-auto border">
            <p className="mb-2">
              I am the parent or legal guardian of this child. I consent to the collection and use of my
              child&apos;s personal information by A² Compass (Achievement Academy) for educational purposes, in accordance
              with the Children&apos;s Online Privacy Protection Act (COPPA).
            </p>
            <p className="mb-2">Information collected includes: name, age, grade level, learning progress, and assessment results.</p>
            <p className="mb-2">This information is used solely for educational purposes and is never sold or shared for advertising.</p>
            <p>
              I understand I can review my child&apos;s information, request deletion, or revoke this consent at any time by
              contacting{' '}
              <a href="mailto:hello@a2compass.org" className="text-indigo-600 underline">hello@a2compass.org</a>.
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed[child.id] || false}
              onChange={(e) => setAgreed((prev) => ({ ...prev, [child.id]: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              I confirm I am the parent/legal guardian and I consent to the above.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleConsent(child.id)}
              disabled={!agreed[child.id] || consenting === child.id}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {consenting === child.id ? 'Recording...' : 'Give Consent'}
            </button>
            <a
              href="https://a2compass.org/privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 underline"
            >
              Read Full Privacy Policy
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
