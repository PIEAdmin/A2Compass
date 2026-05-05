import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

interface ChildForm {
  firstName: string
  lastName: string
  dateOfBirth: string
  gradeLevel: string
}

const GRADE_OPTIONS = [
  { value: '-1', label: 'Pre-K' },
  { value: '0', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
]

/** Auto-calculate recommended grade from date of birth */
function calculateGradeFromDOB(dob: string): string {
  if (!dob) return '1'
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--
  }
  // Age → Grade mapping: 4=PreK, 5=K, 6=1st, 7=2nd, 8=3rd, 9=4th
  if (age <= 4) return '-1'
  if (age === 5) return '0'
  if (age >= 10) return '4'
  return String(age - 5)
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'parent' | 'children' | 'done'>('parent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parent fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [coppaConsent, setCoppaConsent] = useState(false)
  const [termsConsent, setTermsConsent] = useState(false)

  // Children
  const [children, setChildren] = useState<ChildForm[]>([
    { firstName: '', lastName: '', dateOfBirth: '', gradeLevel: '1' },
  ])

  // Created parent ID (for linking children)
  const [parentUserId, setParentUserId] = useState<string | null>(null)
  // Track created child credentials for display
  const [childCredentials, setChildCredentials] = useState<{ name: string; email: string; password: string }[]>([])

  const addChild = () => {
    setChildren([...children, { firstName: '', lastName: '', dateOfBirth: '', gradeLevel: '1' }])
  }

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index))
    }
  }

  const updateChild = (index: number, field: keyof ChildForm, value: string) => {
    const updated = [...children]
    updated[index] = { ...updated[index], [field]: value }
    // Auto-calculate grade when DOB changes
    if (field === 'dateOfBirth' && value) {
      updated[index].gradeLevel = calculateGradeFromDOB(value)
    }
    setChildren(updated)
  }

  const handleParentSubmit = async (e: FormEvent) => {
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
    if (!coppaConsent || !termsConsent) {
      setError('Please agree to the terms and COPPA consent to continue.')
      return
    }

    setLoading(true)

    // 1. Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: `${firstName} ${lastName}`, role: 'parent' },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setLoading(false)
      setError('Account creation failed. Please try again.')
      return
    }

    // 2. Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'parent',
        is_active: true,
      })

    if (profileError) {
      setLoading(false)
      setError('Account created but profile setup failed. Please contact support.')
      return
    }

    // 3. Record COPPA consent
    await supabase.from('coppa_consents').insert({
      parent_user_id: userId,
      consent_given: true,
      consent_method: 'registration_checkbox',
      ip_address: null,
    }).catch(() => {}) // Non-blocking

    setParentUserId(userId)
    setLoading(false)
    setStep('children')
  }

  const handleChildrenSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate children have required fields
    const validChildren = children.filter(c => c.firstName.trim())
    if (validChildren.length === 0) {
      setError('Please add at least one child.')
      setLoading(false)
      return
    }

    for (const child of validChildren) {
      // Create auth account for child (email = firstname.lastname@a2compass.student)
      const childEmail = `${child.firstName.toLowerCase().replace(/\s+/g, '')}.${(child.lastName || lastName).toLowerCase().replace(/\s+/g, '')}@a2compass.student`
      const childPassword = `Welcome${new Date().getFullYear()}!`

      const { data: childAuth, error: childAuthError } = await supabase.auth.signUp({
        email: childEmail,
        password: childPassword,
        options: {
          data: { full_name: `${child.firstName} ${child.lastName || lastName}`, role: 'student' },
        },
      })

      if (childAuthError) {
        // If email taken, try with a number suffix
        const altEmail = `${child.firstName.toLowerCase().replace(/\s+/g, '')}.${(child.lastName || lastName).toLowerCase().replace(/\s+/g, '')}${Math.floor(Math.random() * 99)}@a2compass.student`
        const { data: altAuth, error: altError } = await supabase.auth.signUp({
          email: altEmail,
          password: childPassword,
          options: {
            data: { full_name: `${child.firstName} ${child.lastName || lastName}`, role: 'student' },
          },
        })
        if (altError) {
          console.error('Child signup error:', altError)
          continue
        }
        if (altAuth.user) {
          await createChildRecords(altAuth.user.id, child, altEmail, childPassword)
        }
        continue
      }

      if (childAuth.user) {
        await createChildRecords(childAuth.user.id, child, childEmail, childPassword)
        setChildCredentials(prev => [...prev, { name: `${child.firstName} ${child.lastName || lastName}`, email: childEmail, password: childPassword }])
      }
    }

    setLoading(false)
    setStep('done')
  }

  const createChildRecords = async (
    childUserId: string,
    child: ChildForm,
    childEmail: string,
    childPassword: string
  ) => {
    // Create profile
    await supabase.from('profiles').upsert({
      id: childUserId,
      email: childEmail,
      first_name: child.firstName,
      last_name: child.lastName || lastName,
      role: 'student',
      is_active: true,
    })

    // Get default tier
    const { data: tiers } = await supabase
      .from('tiers')
      .select('id')
      .eq('key', 'full_time')
      .limit(1)

    const tierId = tiers?.[0]?.id

    // Create student profile
    await supabase.from('student_profiles').insert({
      user_id: childUserId,
      grade_level: parseInt(child.gradeLevel) || 1,
      tier_id: tierId || null,
      date_of_birth: child.dateOfBirth || null,
      parent_id: parentUserId,
      notes: `Self-registered. Login: ${childEmail} / ${childPassword}`,
    })
  }

  const handleSkipChildren = () => {
    setStep('done')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-compass-navy to-blue-900 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-white">A² Compass</h1>
          <p className="text-blue-200 mt-2">Achievement Academy — aaacademy.us</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Parent Account', 'Add Children', 'Done'].map((label, i) => {
            const stepIndex = ['parent', 'children', 'done'].indexOf(step)
            const isActive = i <= stepIndex
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isActive ? 'bg-compass-gold text-compass-navy' : 'bg-blue-800 text-blue-400'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${isActive ? 'text-white' : 'text-blue-400'} hidden sm:inline`}>
                  {label}
                </span>
                {i < 2 && <div className="w-8 h-0.5 bg-blue-700 hidden sm:block" />}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* STEP 1: Parent Account */}
          {step === 'parent' && (
            <form onSubmit={handleParentSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold text-center text-compass-navy">Create Your Account</h2>
              <p className="text-gray-500 text-sm text-center">
                Start your family's learning journey with Achievement Academy.
              </p>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                  placeholder="Type it again"
                  required
                />
              </div>

              {/* COPPA + Terms consent */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coppaConsent}
                    onChange={(e) => setCoppaConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-compass-blue focus:ring-compass-blue"
                  />
                  <span className="text-xs text-gray-600">
                    I am the parent or legal guardian of the child(ren) I am enrolling. I consent to the collection and use of my child's information as described in the{' '}
                    <a href="https://a2compass.org/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-compass-blue underline">
                      Privacy Policy
                    </a>
                    , in compliance with COPPA.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsConsent}
                    onChange={(e) => setTermsConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-compass-blue focus:ring-compass-blue"
                  />
                  <span className="text-xs text-gray-600">
                    I agree to the{' '}
                    <a href="https://a2compass.org/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="text-compass-blue underline">
                      Terms of Service
                    </a>
                    .
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !coppaConsent || !termsConsent}
                className="btn-primary w-full py-2.5 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Continue →'}
              </button>

              <div className="text-center pt-2">
                <span className="text-gray-500 text-sm">Already have an account? </span>
                <Link to="/login" className="text-compass-blue hover:underline text-sm font-medium">
                  Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Add Children */}
          {step === 'children' && (
            <form onSubmit={handleChildrenSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold text-center text-compass-navy">Add Your Children</h2>
              <p className="text-gray-500 text-sm text-center">
                We'll create learning accounts for each child. You can always add more later.
              </p>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              {children.map((child, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-compass-navy text-sm">
                      👦 Child {index + 1}
                    </h3>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                      <input
                        type="text"
                        value={child.firstName}
                        onChange={(e) => updateChild(index, 'firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={child.lastName}
                        onChange={(e) => updateChild(index, 'lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                        placeholder={lastName || 'Optional'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={child.dateOfBirth}
                        onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Grade Level</label>
                      <select
                        value={child.gradeLevel}
                        onChange={(e) => updateChild(index, 'gradeLevel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-compass-blue focus:border-transparent"
                      >
                        {GRADE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addChild}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-compass-blue hover:text-compass-blue text-sm transition-colors"
              >
                + Add Another Child
              </button>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSkipChildren}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary py-2.5 disabled:opacity-50"
                >
                  {loading ? 'Setting Up...' : 'Create Accounts →'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Done! */}
          {step === 'done' && (
            <div className="text-center space-y-5">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-compass-navy">Welcome to A² Compass!</h2>
              <p className="text-gray-600">
                Your family is all set! Here are the login details for your children.
              </p>

              {/* Child credentials */}
              {childCredentials.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 text-left space-y-3">
                  <h3 className="font-semibold text-compass-navy text-sm flex items-center gap-2">
                    🔑 Student Login Credentials
                  </h3>
                  <p className="text-xs text-gray-500">Save these — your children will use them to sign in!</p>
                  {childCredentials.map((cred, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="font-medium text-compass-navy text-sm">{cred.name}</p>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <p className="text-xs text-gray-500">Email:</p>
                        <p className="text-xs font-mono text-compass-blue">{cred.email}</p>
                        <p className="text-xs text-gray-500">Password:</p>
                        <p className="text-xs font-mono text-compass-blue">{cred.password}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Next steps */}
              <div className="bg-gradient-to-r from-compass-gold/10 to-orange-50 rounded-xl p-4 text-left space-y-2">
                <h3 className="font-semibold text-compass-navy text-sm">🚀 What happens next?</h3>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li><strong>Log in as your child</strong> using the credentials above</li>
                  <li><strong>Take the Discovery Assessment</strong> — a fun, adaptive quiz that figures out your child's strengths</li>
                  <li><strong>Get a personalized Flight Plan</strong> — daily learning activities tailored just for them!</li>
                </ol>
              </div>

              {/* Parent credentials reminder */}
              <div className="bg-gray-50 rounded-xl p-3 text-left">
                <p className="text-xs text-gray-500">
                  <strong>Your parent account:</strong> {email} — Sign in anytime to view progress, reports, and manage enrollment.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary px-8 py-2.5 text-base"
                >
                  Sign In & Start Learning! 🎓
                </button>
                <p className="text-xs text-blue-200/60">
                  Tip: Log in as your child first to start the Discovery Assessment
                </p>
              </div>
            </div>
          )}
        </div>

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
        </div>
      </div>
    </div>
  )
}
