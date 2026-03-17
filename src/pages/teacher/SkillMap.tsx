import React, { useState, useCallback } from 'react';
import type { DomainSkillGroup, SkillProfileEntry, SkillStatus, DayMode } from '../../types/skills';
import { useStudentSkillProfile, usePlaylistConfig } from '../../hooks/useSkills';
import {
  teacherOverrideSkill,
  generatePlaylist,
} from '../../services/skills.service';

const STATUS_COLORS: Record<SkillStatus, { bg: string; text: string }> = {
  mastered: { bg: 'bg-green-100', text: 'text-green-700' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  needs_practice: { bg: 'bg-amber-100', text: 'text-amber-700' },
  struggling: { bg: 'bg-red-100', text: 'text-red-700' },
  ready_to_learn: { bg: 'bg-blue-100', text: 'text-blue-700' },
  not_started: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const DAY_MODES: { value: DayMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '🌤️' },
  { value: 'normal', label: 'Normal', icon: '☀️' },
  { value: 'power', label: 'Power', icon: '⚡' },
];

interface SkillMapProps {
  studentId: string;
  teacherId: string;
  studentName?: string;
}

export default function SkillMap({ studentId, teacherId, studentName = 'Student' }: SkillMapProps) {
  const { groups, loading, error, refresh } = useStudentSkillProfile(studentId);
  const { config, changeDayMode, changeDailySkillCap } = usePlaylistConfig(studentId);

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [overrideModal, setOverrideModal] = useState<{ skill: SkillProfileEntry } | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('mastered');
  const [overrideNote, setOverrideNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  const toggleDomain = (domainCode: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainCode)) next.delete(domainCode);
      else next.add(domainCode);
      return next;
    });
  };

  const handleOverride = async () => {
    if (!overrideModal) return;
    try {
      await teacherOverrideSkill(studentId, overrideModal.skill.skill_code, overrideStatus, teacherId, overrideNote || undefined);
      setOverrideModal(null);
      setOverrideNote('');
      await refresh();
    } catch {
      // Error handling in production
    }
  };

  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true);
      setGeneratedMessage(null);
      const result = await generatePlaylist(studentId);
      setGeneratedMessage(`Generated ${result.length} playlist items for today.`);
    } catch {
      setGeneratedMessage('Failed to generate playlist.');
    } finally {
      setGenerating(false);
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">Error loading skill map</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const totalMastered = groups.reduce((sum, g) => sum + g.masteredCount, 0);
  const totalSkills = groups.reduce((sum, g) => sum + g.totalCount, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skill Map — {studentName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalMastered} of {totalSkills} skills mastered ({totalSkills > 0 ? Math.round((totalMastered / totalSkills) * 100) : 0}%)
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Generating…' : "Generate Today's Playlist"}
        </button>
      </div>

      {generatedMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {generatedMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain Grid */}
        <div className="lg:col-span-2 space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedDomains.has(group.domain.code);
            return (
              <div key={group.domain.code} className="bg-white rounded-xl shadow-sm border">
                <button
                  onClick={() => toggleDomain(group.domain.code)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm">
                      {group.domain.code}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.domain.name}</h3>
                      <p className="text-xs text-gray-500">
                        {group.masteredCount}/{group.totalCount} mastered
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${group.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-10 text-right">{group.percentComplete}%</span>
                    <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="border-t pt-3 space-y-2">
                      {group.skills.map((skill) => {
                        const colors = STATUS_COLORS[skill.status] || STATUS_COLORS.not_started;
                        return (
                          <div
                            key={skill.skill_code}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-gray-400 w-8">{skill.skill_code}</span>
                              <span className="text-sm text-gray-900">{skill.skill_name}</span>
                              <span className="text-xs text-gray-400">{skill.grade_band}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                {skill.status.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-500 w-12 text-right">
                                {Math.round(skill.current_score * 100)}%
                              </span>
                              <span className="text-xs text-gray-400 w-6 text-right">{skill.attempts}×</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOverrideModal({ skill });
                                  setOverrideStatus(skill.status);
                                }}
                                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                              >
                                Override
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {group.skills.length === 0 && (
                        <p className="text-sm text-gray-400 py-2">No skills in this domain yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Config Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Playlist Settings</h3>

            {/* Day Mode */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Day Mode</label>
              <div className="flex gap-2">
                {DAY_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => changeDayMode(mode.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      config?.day_mode === mode.value
                        ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Skill Cap */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Daily Skill Cap: <span className="text-indigo-600">{config?.daily_skill_cap || 5}</span>
              </label>
              <input
                type="range"
                min={3}
                max={8}
                value={config?.daily_skill_cap || 5}
                onChange={(e) => changeDailySkillCap(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>3</span>
                <span>8</span>
              </div>
            </div>

            {/* Focus Skills */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Focus Skills</label>
              {config?.focus_skill_ids && config.focus_skill_ids.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {config.focus_skill_ids.map((id) => (
                    <span key={id} className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
                      {id.slice(0, 8)}…
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No focus skills set. Click Override on a skill to add focus.</p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Status Legend</h4>
            <div className="space-y-1.5">
              {(Object.entries(STATUS_COLORS) as [SkillStatus, { bg: string; text: string }][]).map(([status, colors]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${colors.bg}`} />
                  <span className="text-xs text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Override Skill Status</h3>
            <p className="text-sm text-gray-500 mb-4">
              {overrideModal.skill.skill_code} — {overrideModal.skill.skill_name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">New Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="mastered">Mastered</option>
                  <option value="in_progress">In Progress</option>
                  <option value="needs_practice">Needs Practice</option>
                  <option value="struggling">Struggling</option>
                  <option value="ready_to_learn">Ready to Learn</option>
                  <option value="not_started">Not Started</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Note (optional)</label>
                <textarea
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  rows={3}
                  placeholder="Reason for override…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setOverrideModal(null);
                  setOverrideNote('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
