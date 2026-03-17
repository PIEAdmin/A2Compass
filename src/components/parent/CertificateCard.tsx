// A² Compass – Week 6: Printable Certificate card for parents

import React from 'react';
import type { Certificate } from '../../types/milestones';

interface CertificateCardProps {
  certificate: Certificate;
  studentName: string;
  onPrint?: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function CertificateCard({
  certificate,
  studentName,
  onPrint,
}: CertificateCardProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .certificate-printable, .certificate-printable * { visibility: visible; }
          .certificate-printable { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="certificate-printable mx-auto max-w-lg">
        {/* Outer decorative border */}
        <div className="rounded-2xl border-4 border-amber-400 bg-white p-2 shadow-lg">
          {/* Inner border */}
          <div className="rounded-xl border-2 border-amber-300 p-8 text-center">
            {/* Stars top */}
            <p className="mb-2 text-3xl">⭐ 🏆 ⭐</p>

            {/* Title */}
            <h1 className="mb-1 text-2xl font-extrabold text-amber-700">
              Certificate of Achievement
            </h1>

            <p className="mb-6 text-sm text-amber-600">{certificate.title}</p>

            {/* Divider */}
            <div className="mx-auto mb-6 h-px w-32 bg-amber-300" />

            {/* Student */}
            <p className="mb-1 text-sm text-gray-500">This certifies that</p>
            <h2 className="mb-4 text-3xl font-bold text-indigo-700">
              {studentName}
            </h2>

            {/* Description */}
            {certificate.description && (
              <p className="mb-6 text-gray-600">{certificate.description}</p>
            )}

            {/* Domain / Skill badge */}
            {(certificate.domain_code || certificate.skill_code) && (
              <p className="mb-4 text-sm text-gray-500">
                {certificate.domain_code && (
                  <span className="mr-2 inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-600">
                    Domain {certificate.domain_code}
                  </span>
                )}
                {certificate.skill_code && (
                  <span className="inline-block rounded-full bg-green-50 px-3 py-0.5 text-xs font-semibold text-green-600">
                    Skill {certificate.skill_code}
                  </span>
                )}
              </p>
            )}

            {/* Date */}
            <p className="mb-6 text-sm text-gray-400">
              Issued on {formatDate(certificate.issued_at)}
            </p>

            {/* Divider */}
            <div className="mx-auto mb-4 h-px w-32 bg-amber-300" />

            {/* Footer */}
            <p className="text-xs font-medium text-gray-400">
              Achievement Academy • A² Compass
            </p>

            {/* Stars bottom */}
            <p className="mt-2 text-2xl">🌟 ✨ 🌟</p>
          </div>
        </div>

        {/* Print button */}
        <div className="no-print mt-4 flex justify-center">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 transition-colors"
          >
            🖨️ Print Certificate
          </button>
        </div>
      </div>
    </>
  );
}
