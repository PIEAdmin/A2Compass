import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { usePlaylist } from '../../hooks/useSkills';
import { supabase } from '../../services/supabase';
import {
  PepperPenguin,
  FloatingStars,
  ConfettiBurst,
} from '../../components/shared/Illustrations';
import { ReadAloud, ReadAloudBlock } from '../../components/shared/ReadAloud';

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// ---------- Animation Keyframes ----------
function DashboardAnimationStyles() {
  return (
    <style>{`
      @keyframes slideInLeft {
        0% { transform: translateX(-120px) scale(0.8); opacity: 0; }
        60% { transform: translateX(10px) scale(1.05); opacity: 1; }
        100% { transform: translateX(0) scale(1); opacity: 1; }
      }
      @keyframes bounceIn {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.15); }
        70% { transform: scale(0.95); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes fadeInUp {
        0% { transform: translateY(15px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes sparkle {
        0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
      }
      .anim-slide-in-left { animation: slideInLeft 0.6s ease-out both; }
      .anim-bounce-in { animation: bounceIn 0.5s ease-out both; }
      .anim-fade-in-up { animation: fadeInUp 0.5s ease-out both; }
      .anim-sparkle { animation: sparkle 2s ease-in-out infinite; }
    `}</style>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.id || '';
  const studentName = user?.fullName?.split(' ')[0] || 'Explorer';
  const { items, loading } = usePlaylist(studentId);
  const [sparkPoints, setSparkPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const greeting = getGreeting();

  // Welcome animation state
  const [animPhase, setAnimPhase] = useState(0); // 0=not started, 1=pepper in, 2=bubble, 3=goal line
  const [welcomePlayed, setWelcomePlayed] = useState(false);
  const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // New sections state
  const [scheduleData, setScheduleData] = useState<{ start: string; end: string; breaks: { time: string; label: string }[] } | null>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [checkinCelebrating, setCheckinCelebrating] = useState(false);

  // Load spark points & streak
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      // Spark points
      const { data: sp } = await supabase
        .from('spark_points')
        .select('balance')
        .eq('student_id', studentId)
        .maybeSingle();
      if (sp) setSparkPoints(sp.balance || 0);

      // Streak from activity log
      const { data: logs } = await supabase
        .from('activity_log')
        .select('created_at')
        .eq('user_id', studentId)
        .eq('event_type', 'login')
        .order('created_at', { ascending: false })
        .limit(30);

      if (logs && logs.length > 0) {
        let s = 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 1; i < logs.length; i++) {
          const d = new Date(logs[i].created_at);
          d.setHours(0, 0, 0, 0);
          const expected = new Date(today);
          expected.setDate(expected.getDate() - i);
          if (d.getTime() === expected.getTime()) s++;
          else break;
        }
        setStreak(s);
      }

      // Check if already checked in today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: todayLog } = await supabase
        .from('activity_log')
        .select('id')
        .eq('user_id', studentId)
        .eq('event_type', 'login')
        .gte('created_at', todayStr)
        .limit(1);
      if (todayLog && todayLog.length > 0) setCheckedIn(true);

      // Auto-dismiss welcome after played
      const lastWelcome = localStorage.getItem(`a2c_welcome_${todayStr}`);
      if (lastWelcome) {
        setShowWelcome(false);
        setWelcomePlayed(true);
      }
    })();
  }, [studentId]);

  // Fetch schedule, assignments, and tests
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        // Get student profile for schedule + linking
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('id, school_start_time, school_end_time, break_times')
          .eq('user_id', studentId)
          .maybeSingle();

        if (profile) {
          if (profile.school_start_time || profile.school_end_time) {
            setScheduleData({
              start: profile.school_start_time || '08:00',
              end: profile.school_end_time || '15:00',
              breaks: Array.isArray(profile.break_times)
                ? profile.break_times.map((b: any) => typeof b === 'object' ? { time: b.time || '', label: b.label || 'Break' } : { time: String(b), label: 'Break' })
                : [],
            });
          }

          // Upcoming assignments — due within 7 days, pending or in_progress
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          const { data: assignments } = await supabase
            .from('student_assignments')
            .select('id, title, due_date, assignment_type, status')
            .eq('student_id', profile.id)
            .in('status', ['pending', 'in_progress'])
            .lte('due_date', nextWeek.toISOString())
            .order('due_date', { ascending: true })
            .limit(5);
          if (assignments) setUpcomingAssignments(assignments);
        }

        // Upcoming tests — not yet started
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: spForTests } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', studentId)
          .maybeSingle();

        if (spForTests) {
          const { data: tests } = await supabase
            .from('assessment_sessions')
            .select('id, created_at, updated_at, status')
            .eq('student_id', spForTests.id)
            .is('started_at', null)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);
          if (tests) setUpcomingTests(tests);
        }
      } catch (e) {
        console.error('Failed to load dashboard sections:', e);
      }
    })();
  }, [studentId]);

  // Welcome animation sequence
  const playWelcomeAnimation = () => {
    // Clear any existing timers
    animTimersRef.current.forEach(clearTimeout);
    animTimersRef.current = [];

    setAnimPhase(0);
    setShowConfetti(true);

    const t1 = setTimeout(() => setAnimPhase(1), 100); // Pepper slides in
    const t2 = setTimeout(() => setAnimPhase(2), 700); // Speech bubble appears
    const t3 = setTimeout(() => setAnimPhase(3), 1700); // Goal line fades in
    const t4 = setTimeout(() => setShowConfetti(false), 3500);

    animTimersRef.current = [t1, t2, t3, t4];
  };

  // Auto-play welcome animation on first load
  useEffect(() => {
    if (showWelcome && !welcomePlayed && !loading) {
      setWelcomePlayed(true);
      playWelcomeAnimation();
    }
  }, [showWelcome, loading]);

  // Cleanup timers
  useEffect(() => {
    return () => { animTimersRef.current.forEach(clearTimeout); };
  }, []);

  // Computed data
  const todayItems = useMemo(() => items.filter(i => i.status !== 'completed' && i.status !== 'skipped'), [items]);
  const completedToday = useMemo(() => items.filter(i => i.status === 'completed'), [items]);
  const priorityItems = useMemo(() => todayItems.slice(0, 2), [todayItems]);
  const leftoverItems = useMemo(() => items.filter(i => i.status === 'in_progress'), [items]);
  const totalGoal = Math.max(3, todayItems.length);
  const completedCount = completedToday.length;

  const handleCheckIn = async () => {
    setCheckedIn(true);
    setCheckinCelebrating(true);
    setShowConfetti(true);
    setTimeout(() => { setShowConfetti(false); setCheckinCelebrating(false); }, 3000);
    // Log attendance
    await supabase.from('activity_log').insert({
      user_id: studentId,
      event_type: 'attendance_checkin',
      details: { date: new Date().toISOString().split('T')[0] },
    });
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`a2c_welcome_${todayStr}`, 'true');
  };

  // Helpers for schedule display
  const formatTime12 = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const getCurrentTimeBlock = () => {
    if (!scheduleData) return -1;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const startMin = parseTime(scheduleData.start);
    const endMin = parseTime(scheduleData.end);

    if (nowMinutes < startMin) return -1; // before school
    if (nowMinutes >= endMin) return 999; // after school

    // Check breaks
    for (let i = 0; i < scheduleData.breaks.length; i++) {
      const breakTime = parseTime(scheduleData.breaks[i].time);
      if (Math.abs(nowMinutes - breakTime) < 15) return i + 1; // in a break (±15min)
    }
    return 0; // in class
  };

  const assignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'homework': return '📝';
      case 'project': return '🎨';
      case 'quiz': return '📋';
      case 'reading': return '📖';
      default: return '📌';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <PepperPenguin pose="waving" size={120} />
          <p className="mt-4 text-lg text-gray-600 animate-pulse">Loading your day...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <DashboardAnimationStyles />
      {showConfetti && <ConfettiBurst />}

      {/* ===== Animated Welcome Header ===== */}
      {showWelcome && (
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white relative overflow-hidden">
          <FloatingStars count={8} />

          {/* Sparkle decorations */}
          {animPhase >= 1 && (
            <>
              <span className="absolute top-3 right-8 text-xl anim-sparkle" style={{ animationDelay: '0s' }}>✨</span>
              <span className="absolute top-8 right-20 text-lg anim-sparkle" style={{ animationDelay: '0.5s' }}>⭐</span>
              <span className="absolute bottom-4 right-12 text-xl anim-sparkle" style={{ animationDelay: '1s' }}>💫</span>
            </>
          )}

          <div className="flex items-center gap-4 relative z-10">
            {/* Pepper slides in from left */}
            <div
              className={`cursor-pointer transform hover:scale-110 transition-transform flex-shrink-0
                ${animPhase >= 1 ? 'anim-slide-in-left' : 'opacity-0'}`}
              onClick={() => {
                // Replay full animation
                playWelcomeAnimation();
              }}
              title="Tap Pepper to replay!"
            >
              <PepperPenguin pose="waving" size={100} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Speech bubble with bounce-in */}
              {animPhase >= 2 ? (
                <div className="relative anim-bounce-in">
                  {/* Triangle pointer toward Pepper */}
                  <div className="absolute left-[-10px] top-4 w-0 h-0
                    border-t-[8px] border-t-transparent
                    border-r-[12px] border-r-white/20
                    border-b-[8px] border-b-transparent" />
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                    <ReadAloud
                      text={`${greeting.text}, ${studentName}! Ready to learn?`}
                      autoRead={true}
                      showIcon={false}
                    >
                      <h1 className="text-2xl md:text-3xl font-bold">
                        {greeting.emoji} {greeting.text}, {studentName}!
                      </h1>
                    </ReadAloud>
                    <p className="text-white/90 mt-1 text-lg">{formatDate()}</p>

                    {/* Goal line fades in after delay */}
                    {animPhase >= 3 && (
                      <div className="anim-fade-in-up mt-2">
                        <ReadAloud
                          text={`Today's goal: Complete ${totalGoal} activities. You've done ${completedCount} so far!`}
                          showIcon={true}
                          iconSize="sm"
                        >
                          <p className="text-white/80">
                            🎯 Today&apos;s goal: Complete <span className="font-bold">{totalGoal} activities</span>
                            {completedCount > 0 && <> — <span className="text-yellow-200 font-bold">{completedCount} done!</span></>}
                          </p>
                        </ReadAloud>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-24" /> /* placeholder before bubble appears */
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-white/60 hover:text-white/90 text-sm z-20 bg-white/10 rounded-full px-3 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===== Quick Stats Bar ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="🪙" label="Spark Points" value={sparkPoints} color="bg-amber-50 border-amber-200" />
        <StatCard icon="🔥" label="Day Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} color="bg-red-50 border-red-200" />
        <StatCard icon="✅" label="Done Today" value={`${completedCount}/${totalGoal}`} color="bg-green-50 border-green-200" />
        <StatCard icon="📚" label="Remaining" value={todayItems.length} color="bg-blue-50 border-blue-200" />
      </div>

      {/* ===== Attendance Check-In ===== */}
      {!checkedIn && (
        <ReadAloudBlock text="Tap the button to check in for today!" autoRead={false}>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 text-center">
            <p className="text-lg font-semibold text-green-800 mb-3">🙋 Ready to start your day?</p>
            <button
              onClick={handleCheckIn}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl
                text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
            >
              ✅ I&apos;m Here! Check In
            </button>
          </div>
        </ReadAloudBlock>
      )}

      {/* Check-in celebration */}
      {checkedIn && checkinCelebrating && (
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-2xl p-5 text-center anim-bounce-in">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-xl font-bold text-green-700">You&apos;re here!</p>
          <p className="text-green-600 mt-1">
            {streak > 1 ? `🔥 ${streak}-day streak! Keep it going!` : 'Great start to the day!'}
          </p>
        </div>
      )}

      {/* ===== Daily Schedule ===== */}
      {scheduleData && (
        <section>
          <ReadAloud text="Your daily schedule" showIcon={true} iconSize="sm">
            <h2 className="text-xl font-bold text-gray-800 mb-3">🕐 Daily Schedule</h2>
          </ReadAloud>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {/* Start time */}
              <TimeBlock
                label="Start"
                time={formatTime12(scheduleData.start)}
                icon="🏫"
                active={getCurrentTimeBlock() === 0}
              />

              {/* Break times */}
              {scheduleData.breaks.map((brk, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gray-300 flex-shrink-0" />
                  <TimeBlock
                    label={brk.label || `Break ${idx + 1}`}
                    time={formatTime12(brk.time)}
                    icon="☕"
                    active={getCurrentTimeBlock() === idx + 1}
                  />
                </div>
              ))}

              {/* End time */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-300 flex-shrink-0" />
                <TimeBlock
                  label="End"
                  time={formatTime12(scheduleData.end)}
                  icon="🏠"
                  active={getCurrentTimeBlock() === 999}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">School hours set by your teacher</p>
          </div>
        </section>
      )}

      {/* ===== Upcoming Assignments ===== */}
      <section>
        <ReadAloud text="Upcoming assignments due this week" showIcon={true} iconSize="sm">
          <h2 className="text-xl font-bold text-gray-800 mb-3">📝 Upcoming Assignments</h2>
        </ReadAloud>
        {upcomingAssignments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <PepperPenguin pose="celebrating" size={70} />
            <p className="text-gray-500 mt-2">No upcoming assignments — enjoy your free time! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingAssignments.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3
                  hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <span className="text-2xl">{assignmentTypeIcon(a.assignment_type)}</span>
                <div className="flex-1 min-w-0">
                  <ReadAloud text={a.title || 'Assignment'} showIcon={true} iconSize="sm">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {a.title || 'Assignment'}
                    </p>
                  </ReadAloud>
                  <p className="text-xs text-gray-500">
                    Due: {a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {a.status === 'in_progress' ? '◐ In Progress' : '○ Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Upcoming Tests ===== */}
      <section>
        <ReadAloud text="Upcoming tests" showIcon={true} iconSize="sm">
          <h2 className="text-xl font-bold text-gray-800 mb-3">📋 Upcoming Tests</h2>
        </ReadAloud>
        {upcomingTests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
            <p className="text-gray-500">No tests scheduled — keep up the good work! 📚</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingTests.map((test) => (
              <div
                key={test.id}
                className="bg-white border-2 border-purple-200 rounded-2xl p-4 text-center
                  hover:border-purple-400 hover:shadow-md transition-all"
              >
                <span className="text-3xl">📝</span>
                <p className="text-sm text-gray-500 mt-2">
                  Created: {new Date(test.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <button
                  onClick={() => navigate('/student/assessment')}
                  className="mt-3 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded-xl
                    text-sm shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all"
                >
                  🚀 Start Test
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Today's Priority ===== */}
      {priorityItems.length > 0 && (
        <section>
          <ReadAloud text="Today's Priority: Your most important skills to work on" showIcon={true} iconSize="sm">
            <h2 className="text-xl font-bold text-gray-800 mb-3">🎯 Today&apos;s Priority</h2>
          </ReadAloud>
          <div className="space-y-3">
            {priorityItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => navigate('/student/practice', { state: { skillId: item.skillId } })}
                className="bg-white border-2 border-indigo-200 rounded-2xl p-4 flex items-center gap-4
                  cursor-pointer hover:border-indigo-400 hover:shadow-lg transform hover:scale-[1.01]
                  active:scale-[0.99] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <ReadAloud text={item.skillName || 'Practice activity'} showIcon={true} iconSize="sm">
                    <p className="font-bold text-gray-800">{item.skillName}</p>
                  </ReadAloud>
                  <p className="text-sm text-gray-500">{item.domainName || 'Skill practice'}</p>
                </div>
                <div className="text-indigo-500 font-bold text-sm">Start →</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== Left from Yesterday ===== */}
      {leftoverItems.length > 0 && (
        <section>
          <ReadAloud text="Left from yesterday: Activities you started but didn't finish" showIcon={true} iconSize="sm">
            <h2 className="text-xl font-bold text-gray-800 mb-3">⏰ Left from Yesterday</h2>
          </ReadAloud>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
            {leftoverItems.slice(0, 3).map(item => (
              <div
                key={item.id}
                onClick={() => navigate('/student/practice', { state: { skillId: item.skillId } })}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-orange-100 cursor-pointer transition-colors"
              >
                <span className="text-xl">◐</span>
                <ReadAloud text={item.skillName || 'Unfinished activity'} showIcon={true} iconSize="sm">
                  <span className="font-medium text-gray-800">{item.skillName}</span>
                </ReadAloud>
                <span className="ml-auto text-orange-600 text-sm font-bold">Continue →</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== Today's Full Schedule ===== */}
      <section>
        <ReadAloud text="Your full list of activities for today" showIcon={true} iconSize="sm">
          <h2 className="text-xl font-bold text-gray-800 mb-3">📋 Today&apos;s Activities</h2>
        </ReadAloud>

        {todayItems.length === 0 ? (
          <div className="text-center py-8">
            <PepperPenguin pose="celebrating" size={100} />
            <ReadAloud text="All done for today! Amazing work!" autoRead={true} showIcon={false}>
              <p className="text-xl font-bold text-green-600 mt-3">🎉 All done for today!</p>
            </ReadAloud>
            <p className="text-gray-500 mt-1">Come back tomorrow for more adventures!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => navigate('/student/practice', { state: { skillId: item.skillId } })}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3
                  cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <span className="text-gray-400 text-sm w-6 text-center">{idx + 1}</span>
                <div className="flex-1">
                  <ReadAloud text={item.skillName || 'Activity'} showIcon={true} iconSize="sm">
                    <p className="font-medium text-gray-800 text-sm">{item.skillName}</p>
                  </ReadAloud>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {item.domainName || 'Skill'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Quick Actions ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <QuickAction icon="🗺️" label="Flight Plan" onClick={() => navigate('/student/flight-plan')} />
        <QuickAction icon="📊" label="My Progress" onClick={() => navigate('/student/progress')} />
        <QuickAction icon="🏆" label="Achievements" onClick={() => navigate('/student/achievements')} />
        <QuickAction icon="🛍️" label="Reward Shop" onClick={() => navigate('/student/rewards')} />
      </div>
    </div>
  );
}

// ---------- Helper Components ----------

function TimeBlock({ label, time, icon, active }: { label: string; time: string; icon: string; active: boolean }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[80px] flex-shrink-0 border-2 transition-all ${
      active
        ? 'bg-indigo-100 border-indigo-400 shadow-md'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <span className="text-xl">{icon}</span>
      <span className={`text-xs font-bold mt-1 ${active ? 'text-indigo-700' : 'text-gray-700'}`}>{time}</span>
      <span className={`text-[10px] ${active ? 'text-indigo-500 font-bold' : 'text-gray-400'}`}>
        {active ? '← Now' : label}
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className={`${color} border rounded-2xl p-3 text-center`}>
      <div className="text-2xl">{icon}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <ReadAloud text={`${label}: ${value}`} showIcon={false} iconSize="sm">
        <div className="text-xs text-gray-500">{label}</div>
      </ReadAloud>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl p-4 text-center
        hover:border-indigo-300 hover:shadow-md transform hover:scale-105
        active:scale-95 transition-all"
    >
      <div className="text-3xl mb-1">{icon}</div>
      <ReadAloud text={label} showIcon={false}>
        <div className="text-sm font-medium text-gray-700">{label}</div>
      </ReadAloud>
    </button>
  );
}
