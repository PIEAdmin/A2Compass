// A² Compass – Week 6: Mission Control – enhanced teacher dashboard

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { studentService } from '../../services/students';
import { getMilestones, upsertSoftSkillRating } from '../../services/milestones.service';
import type { MilestoneNotification, SoftSkillKey } from '../../types/milestones';
import { SOFT_SKILL_LABELS } from '../../types/milestones';
import ShareWinButton from '../../components/teacher/ShareWinButton';
import StudentSkillRadar from '../../components/teacher/StudentSkillRadar';

/* ─── Helpers ────────────────────────────────────────────────── */

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  parent_id?: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function currentRatingPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MILESTONE_EMOJI: Record<string, string> = {
  skill_mastered: '⭐',
  domain_progress: '📈',
  streak: '🔥',
  first_attempt: '🌱',
  breakthrough: '🚀',
  custom: '🎉',
};

const SOFT_SKILLS: SoftSkillKey[] = [
  'participation',
  'confidence',
  'persistence',
  'collaboration',
  'self_direction',
  'creativity',
];

/* ─── Sub-components ─────────────────────────────────────────── */

function QuickActions({
  onShareWin,
}: {
  onShareWin: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={onShareWin}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 transition-colors"
      >
        🎉 Share a Win
      </button>
      <button className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition-colors">
        📋 Generate Playlists
      </button>
      <button className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 transition-colors">
        📚 View Curriculum
      </button>
    </div>
  );
}

function MilestoneSidebar({ milestones }: { milestones: MilestoneNotification[] }) {
  if (milestones.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        No recent milestones yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {milestones.map((m) => (
        <li
          key={m.id}
          className="flex items-start gap-2 rounded-lg bg-white p-3 shadow-sm"
        >
          <span className="text-xl leading-none">
            {MILESTONE_EMOJI[m.milestone_type] ?? '🎉'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">
              {m.title}
            </p>
            <p className="text-xs text-gray-400">{relativeTime(m.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={`text-lg transition ${
            star <= value ? 'text-amber-400' : 'text-gray-300'
          } hover:text-amber-500`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

interface SoftSkillRaterProps {
  student: Student;
  teacherId: string;
}

function SoftSkillRater({ student, teacherId }: SoftSkillRaterProps) {
  const [ratings, setRatings] = useState<Record<SoftSkillKey, number>>({
    participation: 0,
    confidence: 0,
    persistence: 0,
    collaboration: 0,
    self_direction: 0,
    creativity: 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await upsertSoftSkillRating({
        student_id: student.id,
        teacher_id: teacherId,
        rating_period: currentRatingPeriod(),
        ...ratings,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save soft skill ratings', err);
    } finally {
      setSaving(false);
    }
  }, [ratings, student.id, teacherId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-sm font-bold text-gray-700">
        {student.first_name} {student.last_name}
      </h4>
      <div className="space-y-2">
        {SOFT_SKILLS.map((key) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{SOFT_SKILL_LABELS[key]}</span>
            <StarRating
              value={ratings[key]}
              onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {saving ? 'Saving…' : saved ? '✅ Saved' : 'Save Ratings'}
      </button>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function MissionControl() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [milestones, setMilestones] = useState<MilestoneNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareWinStudent, setShareWinStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const studs = await studentService.getStudentsByTeacher(user!.id);
        if (cancelled) return;
        setStudents(studs as Student[]);

        // Fetch latest milestones across all students (use first student as proxy or all)
        const allMilestones: MilestoneNotification[] = [];
        for (const s of studs.slice(0, 10)) {
          try {
            const m = await getMilestones((s as Student).id, 3);
            allMilestones.push(...m);
          } catch {
            /* skip */
          }
        }
        allMilestones.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        if (!cancelled) setMilestones(allMilestones.slice(0, 5));
      } catch (err) {
        console.error('MissionControl load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Please sign in to access Mission Control.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">🎯 Mission Control</h1>
        <p className="text-sm text-gray-500">Welcome back, {user.email}</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions
          onShareWin={() => {
            if (students.length > 0) setShareWinStudent(students[0]);
          }}
        />
      </div>

      {/* Main grid: content + sidebar */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Student Skill Overview */}
          <section>
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              📊 Student Skill Overview
            </h2>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            ) : students.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                No students found. Add students to get started.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {students.map((s) => (
                  <StudentSkillRadar
                    key={s.id}
                    studentId={s.id}
                    studentName={`${s.first_name} ${s.last_name}`}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Soft Skills Quick Rate */}
          <section>
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              🌟 Soft Skills Quick Rate
            </h2>
            {loading ? (
              <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((s) => (
                  <SoftSkillRater key={s.id} student={s} teacherId={user.id} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar (1/3) */}
        <aside className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-bold text-gray-800">
              🏆 Recent Milestones
            </h2>
            <MilestoneSidebar milestones={milestones} />
          </div>

          {/* Per-student Share Win buttons */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-gray-600">
              Quick Share
            </h3>
            <div className="space-y-2">
              {students.slice(0, 5).map((s) => (
                <ShareWinButton
                  key={s.id}
                  studentId={s.id}
                  studentName={`${s.first_name} ${s.last_name}`}
                  parentId={s.parent_id}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Share-a-Win modal trigger (from quick action bar) */}
      {shareWinStudent && (
        <div className="fixed inset-0 z-40" onClick={() => setShareWinStudent(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ShareWinButton
              studentId={shareWinStudent.id}
              studentName={`${shareWinStudent.first_name} ${shareWinStudent.last_name}`}
              parentId={shareWinStudent.parent_id}
              onSent={() => setShareWinStudent(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
