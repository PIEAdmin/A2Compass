// A² Compass – Week 6: Shareable Progress Snapshot card for parents

import React, { useState, useCallback } from 'react';

interface ProgressSnapshotStats {
  skillsMastered: number;
  totalSkills: number;
  streakDays: number;
  topDomain: string;
  recentWin: string;
  memberSince: string;
}

interface ProgressSnapshotCardProps {
  studentName: string;
  stats: ProgressSnapshotStats;
  compact?: boolean;
}

/* SVG-free circular progress ring using conic-gradient */
function ProgressRing({ pct }: { pct: number }) {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#6366f1 ${pct * 3.6}deg, #e0e7ff ${pct * 3.6}deg)`,
        }}
      />
      <div className="relative flex h-22 w-22 items-center justify-center rounded-full bg-white"
        style={{ width: '5.25rem', height: '5.25rem' }}
      >
        <span className="text-2xl font-extrabold text-indigo-700">{pct}%</span>
      </div>
    </div>
  );
}

function Badge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
      {emoji} {label}
    </span>
  );
}

export default function ProgressSnapshotCard({
  studentName,
  stats,
  compact = false,
}: ProgressSnapshotCardProps) {
  const [copied, setCopied] = useState(false);

  const pct =
    stats.totalSkills > 0
      ? Math.round((stats.skillsMastered / stats.totalSkills) * 100)
      : 0;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/snapshot/shared?student=${encodeURIComponent(studentName)}`
      : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [shareUrl]);

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-xl">
      {/* Branding */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
          A² Compass
        </span>
        <span className="text-xs text-indigo-200">
          Member since {stats.memberSince}
        </span>
      </div>

      {/* Student name */}
      <h2 className="mb-5 text-2xl font-extrabold">{studentName}</h2>

      {/* Stats layout */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Progress ring */}
        <ProgressRing pct={pct} />

        {/* Badges */}
        <div className="flex flex-1 flex-wrap gap-2">
          <Badge emoji="🔥" label={`${stats.streakDays} Day Streak`} />
          <Badge emoji="⭐" label={`Top Domain: ${stats.topDomain}`} />
          <Badge emoji="🏆" label={`Recent Win: ${stats.recentWin}`} />
          <Badge
            emoji="📊"
            label={`${stats.skillsMastered} / ${stats.totalSkills} skills mastered`}
          />
        </div>
      </div>

      {/* Actions (non-compact) */}
      {!compact && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 transition"
          >
            📸 Save Snapshot
          </button>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs text-indigo-100 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/30 transition"
            >
              {copied ? '✅ Copied' : '📤 Share'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-6 text-center text-[10px] text-indigo-300">
        Powered by Achievement Academy • A² Compass
      </p>
    </div>
  );
}
