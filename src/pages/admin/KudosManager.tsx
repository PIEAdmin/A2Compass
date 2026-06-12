import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { supabase } from '../../services/supabase';
import { kudosService, KUDOS_CATEGORIES, type Kudos } from '../../services/kudos.service';

interface StudentOption {
  id: string;
  name: string;
  grade: number;
}

export default function KudosManager() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [allKudos, setAllKudos] = useState<Kudos[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('great_effort');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Stats
  const [kudosStats, setKudosStats] = useState<Record<string, { count: number; sparks: number }>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load students
      const { data: studentData } = await supabase
        .from('student_profiles')
        .select('id, grade_level, user_id, profiles:user_id(first_name, last_name)')
        .order('created_at');

      if (studentData) {
        setStudents(studentData.map((s: any) => ({
          id: s.id,
          name: s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : 'Unknown',
          grade: s.grade_level || 0,
        })));
        if (studentData.length > 0 && !selectedStudent) {
          setSelectedStudent(studentData[0].id);
        }
      }

      // Load all kudos
      const kudos = await kudosService.getAllKudos(200);
      setAllKudos(kudos);

      // Build stats per student
      const stats: Record<string, { count: number; sparks: number }> = {};
      for (const k of kudos) {
        if (!stats[k.student_id]) stats[k.student_id] = { count: 0, sparks: 0 };
        stats[k.student_id].count++;
        stats[k.student_id].sparks += k.spark_bonus;
      }
      setKudosStats(stats);
    } catch (err) {
      console.error('KudosManager load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGiveKudos(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !selectedCategory) return;

    setSending(true);
    setSuccessMsg('');
    setErrorMsg('');

    const result = await kudosService.giveKudos(
      selectedStudent,
      selectedCategory,
      message,
      user?.id || '',
    );

    if (result.success) {
      const cat = KUDOS_CATEGORIES.find(c => c.id === selectedCategory);
      const student = students.find(s => s.id === selectedStudent);
      setSuccessMsg(`${cat?.emoji} Kudos sent to ${student?.name}! (+${cat?.sparks} Spark Points)`);
      setMessage('');
      await loadData(); // Refresh
    } else {
      setErrorMsg(result.error || 'Failed to send kudos');
    }
    setSending(false);
  }

  const cat = KUDOS_CATEGORIES.find(c => c.id === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading Kudos Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🌟 Kudos Manager</h1>
        <p className="text-gray-500 mt-1">
          Recognize your students' achievements! Kudos award Spark Points and show up in parent dashboards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Give Kudos Form ─── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🎖️ Give Kudos</h2>

            <form onSubmit={handleGiveKudos} className="space-y-4">
              {/* Student Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Grade {s.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {KUDOS_CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      className={`p-2 rounded-xl text-center text-xs transition-all ${
                        selectedCategory === c.id
                          ? 'bg-amber-100 border-2 border-amber-400 shadow-sm'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{c.emoji}</div>
                      <div className="font-medium text-gray-700 leading-tight">{c.label}</div>
                      <div className="text-amber-600 text-[10px] mt-0.5">+{c.sparks}⚡</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm resize-none"
                  placeholder="Great job solving those fractions today!"
                />
              </div>

              {/* Preview */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Preview</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl">{cat?.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{cat?.label}</p>
                    <p className="text-xs text-amber-600">+{cat?.sparks} Spark Points ⚡</p>
                  </div>
                </div>
                {message && (
                  <p className="text-xs text-gray-600 mt-1 italic">"{message}"</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={sending || !selectedStudent}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  `🌟 Send Kudos (+${cat?.sparks}⚡)`
                )}
              </button>

              {/* Success/Error Messages */}
              {successMsg && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm border border-green-200 flex items-center gap-2">
                  <span>✅</span> {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200 flex items-center gap-2">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ─── Kudos Feed + Stats ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">📊 Kudos Leaderboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {students.map((s, idx) => {
                const stat = kudosStats[s.id] || { count: 0, sparks: 0 };
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xl">{idx < 3 ? medals[idx] : '⭐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{s.name}</p>
                      <p className="text-xs text-gray-500">Grade {s.grade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{stat.count} kudos</p>
                      <p className="text-[10px] text-amber-500">+{stat.sparks}⚡</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Kudos Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">🎖️ Recent Kudos</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {allKudos.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-2">🌟</div>
                  <p>No kudos given yet. Be the first!</p>
                </div>
              ) : (
                allKudos.slice(0, 30).map(k => {
                  const catInfo = KUDOS_CATEGORIES.find(c => c.id === k.category);
                  const studentName = students.find(s => s.id === k.student_id)?.name || 'Student';
                  return (
                    <div key={k.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{catInfo?.emoji || '🌟'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium text-gray-800">{studentName}</span>
                            <span className="text-gray-500"> earned </span>
                            <span className="font-medium text-amber-600">{catInfo?.label || k.category}</span>
                          </p>
                          {k.message && (
                            <p className="text-xs text-gray-500 mt-0.5 italic">"{k.message}"</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-amber-500 font-medium">+{k.spark_bonus}⚡</span>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(k.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
