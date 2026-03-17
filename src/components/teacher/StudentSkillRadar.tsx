// A² Compass – Week 6: Student Skill Radar card for Mission Control

import React from 'react';
import { useStudentSkillProfile } from '../../hooks/useSkills';

interface StudentSkillRadarProps {
  studentId: string;
  studentName: string;
  onViewDetails?: () => void;
}

const DOMAIN_ICONS: Record<string, string> = {
  A: '📖',
  B: '🔤',
  C: '👂',
  D: '🔊',
  E: '📝',
  F: '📚',
  G: '🔢',
  H: '➕',
  I: '📐',
  J: '📏',
};

const LITERACY_DOMAINS = ['A', 'B', 'C', 'D', 'E', 'F'];
const NUMERACY_DOMAINS = ['G', 'H', 'I', 'J'];

function barColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct > 0) return 'bg-blue-500';
  return 'bg-gray-300';
}

function SkeletonBars() {
  return (
    <div className="animate-pulse space-y-3 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-3 flex-1 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

interface DomainRowProps {
  code: string;
  name: string;
  mastered: number;
  total: number;
}

function DomainRow({ code, name, mastered, total }: DomainRowProps) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 text-center">{DOMAIN_ICONS[code] ?? '📘'}</span>
      <span className="w-28 truncate font-medium text-gray-700">{name}</span>
      <div className="relative flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-xs text-gray-500">
        {mastered}/{total}
      </span>
    </div>
  );
}

export default function StudentSkillRadar({
  studentId,
  studentName,
  onViewDetails,
}: StudentSkillRadarProps) {
  const { data: profile, isLoading, error } = useStudentSkillProfile(studentId);

  /* Derive domain summaries from profile entries */
  const domainMap = React.useMemo(() => {
    const map: Record<string, { name: string; mastered: number; total: number }> = {};
    if (!profile) return map;
    for (const entry of profile) {
      const code = (entry as any).domain_code ?? (entry as any).skill_code?.charAt(0) ?? '?';
      if (!map[code]) {
        map[code] = {
          name: (entry as any).domain_name ?? code,
          mastered: 0,
          total: 0,
        };
      }
      map[code].total += 1;
      if ((entry as any).status === 'mastered') {
        map[code].mastered += 1;
      }
    }
    return map;
  }, [profile]);

  const totalSkills = profile?.length ?? 0;
  const totalMastered = Object.values(domainMap).reduce((s, d) => s + d.mastered, 0);
  const overallPct = totalSkills > 0 ? Math.round((totalMastered / totalSkills) * 100) : 0;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Failed to load skills for {studentName}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">{studentName}</h3>
        {!isLoading && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            {overallPct}%
          </span>
        )}
      </div>

      {isLoading ? (
        <SkeletonBars />
      ) : (
        <>
          {/* Summary */}
          <p className="mb-4 text-xs text-gray-500">
            {totalMastered} skill{totalMastered !== 1 ? 's' : ''} mastered / {totalSkills} total
          </p>

          {/* Literacy */}
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            📚 Literacy
          </h4>
          <div className="mb-4 space-y-2">
            {LITERACY_DOMAINS.map((code) => {
              const d = domainMap[code];
              if (!d) return null;
              return (
                <DomainRow
                  key={code}
                  code={code}
                  name={d.name}
                  mastered={d.mastered}
                  total={d.total}
                />
              );
            })}
          </div>

          {/* Numeracy */}
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            🔢 Numeracy
          </h4>
          <div className="space-y-2">
            {NUMERACY_DOMAINS.map((code) => {
              const d = domainMap[code];
              if (!d) return null;
              return (
                <DomainRow
                  key={code}
                  code={code}
                  name={d.name}
                  mastered={d.mastered}
                  total={d.total}
                />
              );
            })}
          </div>

          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              View Full Profile →
            </button>
          )}
        </>
      )}
    </div>
  );
}
