// A² Compass – Teacher Subject Manager
// Allows teachers to add/remove subjects for each student and configure daily requirements

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Header } from '../../components/layout';

/* ─── Types ──────────────────────────────────────────────────── */

interface Student {
  id: string; // profiles.id (auth UUID)
  email: string;
  full_name: string;
  grade_level: number;
}

interface Domain {
  id: string;
  code: string;
  name: string;
  category: string;
  display_order: number;
}

interface SubjectConfig {
  id: string;
  student_id: string;
  domain_id: string;
  is_required: boolean;
  is_enabled: boolean;
  daily_min_items: number;
  daily_max_items: number;
}

interface PlaylistItem {
  id: string;
  skill_code: string;
  skill_name: string;
  domain_name: string;
  category: string;
  status: string;
  current_score: number | null;
}

/* ─── Helpers ────────────────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  literacy: { label: 'Language Arts', emoji: '📖', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  numeracy: { label: 'Mathematics', emoji: '🔢', color: 'bg-green-50 border-green-200 text-green-700' },
  life_skills: { label: 'Daily Living', emoji: '🏠', color: 'bg-amber-50 border-amber-200 text-amber-700' },
};

const GRADE_LABELS: Record<number, string> = {
  '-1': 'Pre-K',
  0: 'Kindergarten',
  1: 'Grade 1',
  2: 'Grade 2',
  3: 'Grade 3',
  4: 'Grade 4',
};

function gradeLabel(g: number): string {
  return GRADE_LABELS[g] ?? `Grade ${g}`;
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function SubjectManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [configs, setConfigs] = useState<SubjectConfig[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load students and domains
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Get all students
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('role', 'student');

        const { data: studentProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, grade_level');

        const studentList = (profiles ?? []).map(p => {
          const sp = (studentProfiles ?? []).find(s => s.user_id === p.id);
          return {
            id: p.id,
            email: p.email,
            full_name: p.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            grade_level: sp?.grade_level ?? 1,
          };
        });
        setStudents(studentList);

        // Get all domains
        const { data: domainData } = await supabase
          .from('skill_domains')
          .select('*')
          .order('display_order');
        setDomains(domainData ?? []);

        // Auto-select first student
        if (studentList.length > 0) {
          setSelectedStudent(studentList[0]);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load configs + playlist when student changes
  const loadStudentData = useCallback(async (student: Student) => {
    const { data: cfgs } = await supabase
      .from('student_subject_config')
      .select('*')
      .eq('student_id', student.id);

    setConfigs(cfgs ?? []);

    // Load today's playlist
    const { data: pl } = await supabase
      .from('student_playlist')
      .select(`
        id, status, current_score, position,
        skill_nodes!inner(code, name, domain_id, skill_domains!inner(name, category))
      `)
      .eq('student_id', student.id)
      .order('position');

    const items: PlaylistItem[] = (pl ?? []).map((row: any) => ({
      id: row.id,
      skill_code: row.skill_nodes?.code ?? '?',
      skill_name: row.skill_nodes?.name ?? 'Unknown',
      domain_name: row.skill_nodes?.skill_domains?.name ?? 'Unknown',
      category: row.skill_nodes?.skill_domains?.category ?? 'literacy',
      status: row.status,
      current_score: row.current_score,
    }));
    setPlaylist(items);
  }, []);

  useEffect(() => {
    if (selectedStudent) loadStudentData(selectedStudent);
  }, [selectedStudent, loadStudentData]);

  // Toggle domain enabled/disabled
  async function toggleDomain(domainId: string, enabled: boolean) {
    if (!selectedStudent) return;
    setSaving(true);

    const existing = configs.find(c => c.domain_id === domainId);
    if (existing) {
      await supabase
        .from('student_subject_config')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('student_subject_config')
        .insert({
          student_id: selectedStudent.id,
          domain_id: domainId,
          is_enabled: enabled,
          is_required: false,
          daily_min_items: 1,
          daily_max_items: 2,
        });
    }

    await loadStudentData(selectedStudent);
    setSaving(false);
    showMessage('success', `Subject ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Toggle required
  async function toggleRequired(domainId: string, required: boolean) {
    if (!selectedStudent) return;
    setSaving(true);

    const existing = configs.find(c => c.domain_id === domainId);
    if (existing) {
      await supabase
        .from('student_subject_config')
        .update({
          is_required: required,
          daily_min_items: required ? 2 : 1,
          daily_max_items: required ? 3 : 2,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }

    await loadStudentData(selectedStudent);
    setSaving(false);
    showMessage('success', `Subject ${required ? 'marked as required' : 'made optional'}`);
  }

  // Update daily item counts
  async function updateDailyItems(domainId: string, field: 'daily_min_items' | 'daily_max_items', value: number) {
    if (!selectedStudent) return;
    const existing = configs.find(c => c.domain_id === domainId);
    if (!existing) return;

    await supabase
      .from('student_subject_config')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    await loadStudentData(selectedStudent);
  }

  // Generate playlist
  async function regeneratePlaylist() {
    if (!selectedStudent) return;
    setGenerating(true);

    const { data, error } = await supabase.rpc('generate_daily_playlist', {
      p_student_id: selectedStudent.id,
      p_target_items: 12,
    });

    if (error) {
      showMessage('error', `Failed: ${error.message}`);
    } else {
      showMessage('success', `Playlist generated: ${data?.items_added ?? 0} items added!`);
      await loadStudentData(selectedStudent);
    }
    setGenerating(false);
  }

  // Remove a single playlist item
  async function removePlaylistItem(itemId: string) {
    await supabase.from('student_playlist').delete().eq('id', itemId);
    if (selectedStudent) await loadStudentData(selectedStudent);
    showMessage('success', 'Item removed from playlist');
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // Group configs by category
  function getConfigForDomain(domainId: string): SubjectConfig | undefined {
    return configs.find(c => c.domain_id === domainId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="📚 Subject Manager" subtitle="Configure subjects and daily plans for each student" />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Message Toast */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-bounce ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Student Selector */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
          <div className="flex flex-wrap gap-2">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedStudent?.id === s.id
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                👤 {s.full_name} ({gradeLabel(s.grade_level)})
              </button>
            ))}
          </div>
        </div>

        {selectedStudent && (
          <>
            {/* Subject Configuration */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  📋 Subject Configuration — {selectedStudent.full_name}
                </h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  85% mastery required to advance
                </span>
              </div>

              {Object.entries(CATEGORY_META).map(([category, meta]) => {
                const categoryDomains = domains.filter(d => d.category === category);
                if (categoryDomains.length === 0) return null;

                return (
                  <div key={category} className="mb-6">
                    <h3 className={`text-sm font-bold mb-3 px-3 py-1.5 rounded-lg border inline-block ${meta.color}`}>
                      {meta.emoji} {meta.label}
                      {category === 'literacy' || category === 'numeracy' ? ' ★ Core Subject' : ''}
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {categoryDomains.map(domain => {
                        const cfg = getConfigForDomain(domain.id);
                        const isEnabled = cfg?.is_enabled ?? true;
                        const isRequired = cfg?.is_required ?? false;

                        return (
                          <div
                            key={domain.id}
                            className={`border rounded-lg p-3 transition-all ${
                              isEnabled
                                ? isRequired
                                  ? 'border-indigo-300 bg-indigo-50/50'
                                  : 'border-gray-200 bg-white'
                                : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm text-gray-800">
                                {domain.name}
                              </span>
                              <div className="flex items-center gap-2">
                                {isEnabled && (
                                  <button
                                    onClick={() => toggleRequired(domain.id, !isRequired)}
                                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                      isRequired
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                    disabled={saving}
                                  >
                                    {isRequired ? '★ Required' : 'Optional'}
                                  </button>
                                )}
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={(e) => toggleDomain(domain.id, e.target.checked)}
                                    className="sr-only peer"
                                    disabled={saving}
                                  />
                                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                                </label>
                              </div>
                            </div>

                            {isEnabled && cfg && (
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Min: {cfg.daily_min_items}</span>
                                <input
                                  type="range"
                                  min={1}
                                  max={5}
                                  value={cfg.daily_min_items}
                                  onChange={(e) => updateDailyItems(domain.id, 'daily_min_items', Number(e.target.value))}
                                  className="flex-1 h-1.5 accent-indigo-600"
                                />
                                <span>Max: {cfg.daily_max_items}</span>
                                <input
                                  type="range"
                                  min={1}
                                  max={6}
                                  value={cfg.daily_max_items}
                                  onChange={(e) => updateDailyItems(domain.id, 'daily_max_items', Number(e.target.value))}
                                  className="flex-1 h-1.5 accent-indigo-600"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generate / Current Playlist */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  🛫 Today's Flight Plan ({playlist.length} items)
                </h2>
                <button
                  onClick={regeneratePlaylist}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    '🔄'
                  )}
                  {generating ? 'Generating...' : 'Regenerate Playlist'}
                </button>
              </div>

              {/* Playlist stats */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(() => {
                  const literacy = playlist.filter(p => p.category === 'literacy').length;
                  const math = playlist.filter(p => p.category === 'numeracy').length;
                  const life = playlist.filter(p => p.category === 'life_skills').length;
                  const mastered = playlist.filter(p => p.status === 'mastered').length;
                  return (
                    <>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        📖 Language Arts: {literacy}
                      </span>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                        🔢 Math: {math}
                      </span>
                      {life > 0 && (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
                          🏠 Daily Living: {life}
                        </span>
                      )}
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                        ⭐ Mastered: {mastered}/{playlist.length}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                        ⏱ ~{Math.round(playlist.length * 10)}-{Math.round(playlist.length * 15)} min
                      </span>
                    </>
                  );
                })()}
              </div>

              {playlist.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-4xl mb-2">📋</p>
                  <p>No items in today's playlist. Click <b>Regenerate Playlist</b> to create one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlist.map((item, i) => {
                    const catMeta = CATEGORY_META[item.category] ?? CATEGORY_META.literacy;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          item.status === 'mastered'
                            ? 'bg-green-50 border-green-200'
                            : item.status === 'in_progress'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <span className="text-sm font-bold text-gray-400 w-6 text-center">
                          {i + 1}
                        </span>
                        <span className="text-lg">{catMeta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">
                            {item.skill_name}
                          </p>
                          <p className="text-xs text-gray-500">{item.domain_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.current_score !== null && item.current_score > 0 && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              item.current_score >= 85
                                ? 'bg-green-100 text-green-700'
                                : item.current_score >= 50
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {item.current_score}%
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.status === 'mastered'
                              ? 'bg-green-200 text-green-800'
                              : item.status === 'in_progress'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {item.status === 'mastered' ? '✅ Mastered' :
                             item.status === 'in_progress' ? '📝 In Progress' : '🔓 Ready'}
                          </span>
                          <button
                            onClick={() => removePlaylistItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Remove from playlist"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mastery Requirements Info Box */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4 sm:p-6">
              <h3 className="font-bold text-indigo-800 mb-2">📏 Mastery Requirements</h3>
              <div className="grid gap-2 text-sm text-indigo-700">
                <p>✅ <b>85% score required</b> on quizzes, assessments, and exams to advance</p>
                <p>✅ <b>Math & Language Arts</b> are required subjects every day</p>
                <p>✅ Teacher can <b>add or remove</b> subjects for any student</p>
                <p>✅ Daily playlist targets <b>~12 items</b> for 1–2 hours of learning</p>
                <p>✅ Prerequisite skills must be mastered before dependent skills unlock</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
