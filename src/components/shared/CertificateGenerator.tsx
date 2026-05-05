import { useState, useEffect, useRef } from 'react'

interface CertificateGeneratorProps {
  studentName: string
  achievementTitle: string
  dateEarned: string
  teacherName: string
  schoolName: string
  onClose: () => void
}

export default function CertificateGenerator({
  studentName,
  achievementTitle,
  dateEarned,
  teacherName,
  schoolName,
  onClose,
}: CertificateGeneratorProps) {
  const certRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body > *:not(#certificate-modal) { display: none !important; }
          #certificate-modal { position: static !important; }
          #certificate-modal .no-print { display: none !important; }
          #certificate-card {
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          @page { size: landscape; margin: 0; }
        }
      `}</style>

      {/* Modal overlay */}
      <div
        id="certificate-modal"
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isVisible ? 'bg-black/60' : 'bg-transparent'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className={`flex flex-col items-center gap-4 transition-all duration-500 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
        >
          {/* Certificate card */}
          <div
            id="certificate-card"
            ref={certRef}
            className="relative overflow-hidden"
            style={{
              width: '800px',
              height: '560px',
              background: 'linear-gradient(145deg, #fefce8 0%, #fffbeb 30%, #fef3c7 100%)',
              borderRadius: '16px',
              boxShadow:
                '0 0 0 4px #b8860b, 0 0 0 8px #daa520, 0 0 0 10px #b8860b, 0 25px 60px rgba(0,0,0,0.4)',
              fontFamily: '"Georgia", "Times New Roman", serif',
            }}
          >
            {/* Inner ornate border */}
            <div
              className="absolute inset-4"
              style={{
                border: '2px solid #b8860b',
                borderRadius: '8px',
                boxShadow: 'inset 0 0 0 1px #daa520',
              }}
            />

            {/* Corner decorations */}
            {['top-6 left-6', 'top-6 right-6', 'bottom-6 left-6', 'bottom-6 right-6'].map(
              (pos, i) => (
                <span
                  key={i}
                  className={`absolute ${pos} text-2xl`}
                  style={{ opacity: 0.7 }}
                >
                  🏆
                </span>
              )
            )}

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center px-16 py-10 text-center">
              {/* Logo */}
              <div
                className="text-sm font-bold tracking-widest mb-2"
                style={{ color: '#b8860b' }}
              >
                A² COMPASS
              </div>

              {/* Title */}
              <h1
                className="text-3xl font-bold mb-1"
                style={{
                  color: '#78350f',
                  fontFamily: '"Georgia", serif',
                  letterSpacing: '2px',
                }}
              >
                Certificate of Achievement
              </h1>

              {/* Decorative line */}
              <div
                className="w-48 h-0.5 mb-6"
                style={{
                  background: 'linear-gradient(90deg, transparent, #b8860b, transparent)',
                }}
              />

              {/* Body text */}
              <p className="text-base mb-1" style={{ color: '#92400e' }}>
                This certifies that
              </p>

              <h2
                className="text-4xl font-bold mb-2"
                style={{
                  color: '#78350f',
                  fontFamily: '"Georgia", serif',
                  borderBottom: '2px solid #b8860b',
                  paddingBottom: '4px',
                }}
              >
                {studentName}
              </h2>

              <p className="text-base mb-1" style={{ color: '#92400e' }}>
                has successfully demonstrated mastery in
              </p>

              <h3
                className="text-2xl font-bold mb-6"
                style={{ color: '#b45309' }}
              >
                {achievementTitle}
              </h3>

              {/* Date */}
              <p className="text-sm mb-8" style={{ color: '#92400e' }}>
                Awarded on {dateEarned}
              </p>

              {/* Footer: signature + school */}
              <div className="w-full flex items-end justify-between px-8">
                <div className="flex flex-col items-center">
                  <div
                    className="w-40 border-b mb-1"
                    style={{ borderColor: '#b8860b' }}
                  />
                  <span className="text-sm" style={{ color: '#78350f' }}>
                    {teacherName}
                  </span>
                  <span className="text-xs" style={{ color: '#92400e' }}>
                    Teacher
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold" style={{ color: '#b8860b' }}>
                    {schoolName}
                  </span>
                  <span className="text-xs" style={{ color: '#92400e' }}>
                    Excellence in Education
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons (hidden when printing) */}
          <div className="no-print flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
            >
              🖨️ Print Certificate
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
