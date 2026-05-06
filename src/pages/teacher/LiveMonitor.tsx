// ============================================================
// A² Compass — Live Assessment Monitor
// Real-time view of student assessment progress for admin/teacher
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Header } from '../../components/layout';

interface LiveSession {
  id: string;
  student_id: string;
  session_type: string;
  status: string;
  started_at: string;
  items_attempted: number;
  items_correct: number;
  skills_assessed: number;
  skills_mastered: number;
  first_name: string;
  last_name: string;
  grade_level: number;
}

interface LiveResponse {
  id: string;
  session_id: string;
  is_correct: boolean;
  hint_used: boolean;
  time_spent_seconds: number;
  responded_at: string;
  skill_name: string;
  skill_code: string;
  domain_name: string;
  question_type: string;
  question_text: string;
  student_name: string;
  difficulty: number;
}

const REFRESH_INTERVAL = 5000; // 5 seconds

export default function LiveMonitor() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [responses, setResponses] = useState<LiveResponse[]>([]);
  const [allSessions, setAllSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevResponseCount = useRef(0);

  // Load data
  async function loadData() {
    try {
      // Get all sessions (active first, then recent completed)
      const { data: sessionData, error: sessErr } = await supabase.rpc('get_live_assessment_sessions');
      if (sessErr) throw sessErr;
      
      const allSess = (sessionData || []) as LiveSession[];
      setAllSessions(allSess);
      setSessions(allSess.filter(s => s.status === 'in_progress'));

      // Get recent responses across all active sessions (or selected session)
      const { data: respData, error: respErr } = await supabase.rpc('get_live_assessment_responses', {
        p_session_id: selectedSession || null,
        p_limit: 50
      });
      if (respErr) throw respErr;

      const newResponses = (respData || []) as LiveResponse[];
      
      // Flash animation for new responses
      if (newResponses.length > prevResponseCount.current && prevResponseCount.current > 0) {
        // New response came in
      }
      prevResponseCount.current = newResponses.length;
      setResponses(newResponses);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Live monitor fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Initial load + auto-refresh
  useEffect(() => {
    loadData();
  }, [selectedSession]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(loadData, REFRESH_INTERVAL);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, selectedSession]);

  const activeSessions = sessions;
  const totalActive = activeSessions.length;
  const totalResponsesToday = responses.length;

  function getScorePercent(correct: number, attempted: number) {
    if (attempted === 0) return 0;
    return Math.round((correct / attempted) * 100);
  }

  function getTimeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  }

  function getSessionDuration(startedAt: string) {
    const diff = Date.now() - new Date(startedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading live data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="📡 Live Assessment Monitor"
        subtitle="Watch student assessments in real-time"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-600">
                {autoRefresh ? 'Live — updates every 5s' : 'Paused'}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {autoRefresh ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              🔄 Refresh Now
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl">
                {totalActive > 0 ? '🟢' : '⚪'}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalActive}</p>
                <p className="text-xs text-gray-500">Active Now</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl">📝</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalResponsesToday}</p>
                <p className="text-xs text-gray-500">Responses</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl">✅</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {responses.length > 0
                    ? Math.round((responses.filter(r => r.is_correct).length / responses.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xl">💡</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {responses.filter(r => r.hint_used).length}
                </p>
                <p className="text-xs text-gray-500">Hints Used</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🟢 Active Assessment Sessions
              {totalActive > 0 && (
                <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {totalActive} live
                </span>
              )}
            </h2>
          </div>
          {activeSessions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">😴</p>
              <p className="text-gray-500">No active assessments right now.</p>
              <p className="text-gray-400 text-sm mt-1">Sessions will appear here when students start an assessment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeSessions.map((session) => {
                const score = getScorePercent(session.items_correct, session.items_attempted);
                const isSelected = selectedSession === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(isSelected ? null : session.id)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {session.first_name?.[0]}{session.last_name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {session.first_name} {session.last_name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Grade {session.grade_level} · {session.session_type.replace(/_/g, ' ')} · Started {getTimeSince(session.started_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">{session.items_attempted}</p>
                          <p className="text-[10px] text-gray-400">Questions</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${
                            score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-500'
                          }`}>
                            {session.items_attempted > 0 ? `${score}%` : '—'}
                          </p>
                          <p className="text-[10px] text-gray-400">Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-600">{getSessionDuration(session.started_at)}</p>
                          <p className="text-[10px] text-gray-400">Duration</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Active" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    {session.items_attempted > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, (session.items_attempted / 30) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{session.items_correct}/{session.items_attempted} correct</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Response Feed */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              📝 Live Response Feed
              {selectedSession && (
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-gray-200"
                >
                  Showing 1 session · Clear filter ✕
                </button>
              )}
            </h2>
          </div>
          {responses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No responses yet. Waiting for student activity...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {responses.map((resp, idx) => (
                <div
                  key={resp.id}
                  className={`p-4 flex items-start gap-3 ${idx === 0 ? 'bg-indigo-50/50' : ''}`}
                >
                  {/* Correct/Incorrect indicator */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    resp.is_correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                  }`}>
                    {resp.is_correct ? '✓' : '✗'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{resp.student_name}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{resp.domain_name}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-indigo-600 font-medium">{resp.skill_name}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 truncate">
                      {resp.question_text || resp.question_type.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>⏱ {resp.time_spent_seconds || 0}s</span>
                      {resp.hint_used && <span className="text-amber-500">💡 Hint used</span>}
                      <span>Difficulty: {'⭐'.repeat(Math.min(5, resp.difficulty || 1))}</span>
                      <span>{getTimeSince(resp.responded_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed Sessions */}
        {allSessions.filter(s => s.status !== 'in_progress').length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">📊 Recent Sessions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Questions</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {allSessions.filter(s => s.status !== 'in_progress').map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.first_name} {s.last_name}</td>
                      <td className="px-4 py-3 text-gray-500">{s.session_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === 'completed' ? 'bg-green-100 text-green-700' :
                          s.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.items_correct}/{s.items_attempted}</td>
                      <td className="px-4 py-3 font-medium">
                        {s.items_attempted > 0 ? `${getScorePercent(s.items_correct, s.items_attempted)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{getTimeSince(s.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
