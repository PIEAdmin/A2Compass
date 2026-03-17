import { useState, useEffect } from 'react'
import type { EnrollmentType, StripeProduct, StudentProfile } from '../../types'
import { enrollmentService } from '../../services/enrollment'
import { stripeService, getStripe } from '../../services/stripe'
import { LoadingSpinner } from '../common'

interface Props {
  students: StudentProfile[]
  parentId: string
  onComplete?: () => void
}

type Step = 'type' | 'student' | 'plan' | 'checkout'

export default function EnrollmentWizard({ students, parentId, onComplete }: Props) {
  const [step, setStep] = useState<Step>('type')
  const [enrollmentTypes, setEnrollmentTypes] = useState<EnrollmentType[]>([])
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [selectedType, setSelectedType] = useState<EnrollmentType | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    Promise.all([
      enrollmentService.getEnrollmentTypes(),
      stripeService.getProducts(),
    ]).then(([types, prods]) => {
      setEnrollmentTypes(types)
      setProducts(prods)
      setLoading(false)
    })
  }, [])

  const handleCheckout = async (priceId: string) => {
    if (!selectedType || !selectedStudent) return
    setCheckingOut(true)
    try {
      const session = await stripeService.createCheckoutSession({
        priceId,
        enrollmentTypeId: selectedType.id,
        studentId: selectedStudent.id,
        parentId,
      })
      if (session?.url) {
        window.location.href = session.url
      }
    } catch (err) {
      console.error('Checkout failed:', err)
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Enrollment Type', 'Select Child', 'Choose Plan', 'Payment'].map((label, i) => {
          const steps: Step[] = ['type', 'student', 'plan', 'checkout']
          const isActive = steps.indexOf(step) >= i
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isActive ? 'bg-compass-blue text-white' : 'bg-gray-200 text-gray-500'
              }`}>{i + 1}</div>
              <span className={`text-sm ${isActive ? 'text-compass-navy font-medium' : 'text-gray-400'}`}>{label}</span>
              {i < 3 && <div className={`w-8 h-0.5 ${isActive ? 'bg-compass-blue' : 'bg-gray-200'}`} />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Enrollment Type */}
      {step === 'type' && (
        <div>
          <h3 className="text-lg font-semibold text-compass-navy mb-4">Choose Enrollment Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollmentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => { setSelectedType(type); setStep('student') }}
                className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-compass-blue hover:bg-blue-50/50 transition-all"
              >
                <h4 className="font-semibold text-compass-navy">{type.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Student */}
      {step === 'student' && (
        <div>
          <h3 className="text-lg font-semibold text-compass-navy mb-4">Select Child</h3>
          <div className="space-y-3">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedStudent(s); setStep('plan') }}
                className="w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-compass-blue transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-compass-blue/10 flex items-center justify-center font-medium text-compass-blue">
                  {s.profile?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium text-compass-navy">{s.profile?.full_name}</p>
                  <p className="text-sm text-gray-500">Grade {s.grade_level} · {s.tier?.name}</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('type')} className="mt-4 text-sm text-gray-500 hover:text-gray-700">← Back</button>
        </div>
      )}

      {/* Step 3: Choose Plan */}
      {step === 'plan' && selectedType && (
        <div>
          <h3 className="text-lg font-semibold text-compass-navy mb-2">Choose a Plan</h3>
          <p className="text-sm text-gray-500 mb-4">
            {selectedType.name} for {selectedStudent?.profile?.full_name}
          </p>
          {(() => {
            const product = products.find(p => p.enrollment_type_id === selectedType.id)
            if (!product) {
              return (
                <div className="p-4 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                  Pricing not yet configured for this enrollment type. Please contact your administrator.
                </div>
              )
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {product.price_monthly && product.stripe_price_id_monthly && (
                  <button
                    onClick={() => handleCheckout(product.stripe_price_id_monthly!)}
                    disabled={checkingOut}
                    className="p-4 rounded-xl border-2 border-gray-200 hover:border-compass-blue transition-all text-left"
                  >
                    <p className="text-sm text-gray-500">Monthly</p>
                    <p className="text-2xl font-bold text-compass-navy">${product.price_monthly}<span className="text-sm font-normal">/mo</span></p>
                  </button>
                )}
                {product.price_yearly && product.stripe_price_id_yearly && (
                  <button
                    onClick={() => handleCheckout(product.stripe_price_id_yearly!)}
                    disabled={checkingOut}
                    className="p-4 rounded-xl border-2 border-compass-blue bg-blue-50/50 transition-all text-left relative"
                  >
                    <span className="absolute -top-2 right-3 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Save 15%</span>
                    <p className="text-sm text-gray-500">Annual</p>
                    <p className="text-2xl font-bold text-compass-navy">${product.price_yearly}<span className="text-sm font-normal">/yr</span></p>
                  </button>
                )}
                {product.price_one_time && product.stripe_price_id_one_time && (
                  <button
                    onClick={() => handleCheckout(product.stripe_price_id_one_time!)}
                    disabled={checkingOut}
                    className="p-4 rounded-xl border-2 border-gray-200 hover:border-compass-blue transition-all text-left"
                  >
                    <p className="text-sm text-gray-500">One-time</p>
                    <p className="text-2xl font-bold text-compass-navy">${product.price_one_time}</p>
                  </button>
                )}
              </div>
            )
          })()}
          <button onClick={() => setStep('student')} className="mt-4 text-sm text-gray-500 hover:text-gray-700">← Back</button>
        </div>
      )}

      {checkingOut && (
        <div className="mt-4 flex items-center gap-2 text-compass-blue">
          <LoadingSpinner size="sm" />
          <span className="text-sm">Redirecting to payment...</span>
        </div>
      )}
    </div>
  )
}
