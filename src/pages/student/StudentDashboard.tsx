import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { usePlaylist } from '../../hooks/useSkills';
import { supabase } from '../../services/supabase';
import {
  PepperPenguin,
  FloatingStars,
  ConfettiBurst,
} from '../../components/shared/Illustrations';
import ReadAloud, { ReadAloudBlock } from '../../components/shared/ReadAloud';

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
      if (lastWelcome) setShowWelcome(false);
    })();
  }, [studentId]);

  // Computed data
  const todayItems = useMemo(() => items.filter(i => i.status !== 'completed' && i.status !== 'skipped'), [items]);
  const completedToday = useMemo(() => items.filter(i => i.status === 'completed'), [items]);
  const priorityItems = useMemo(() => todayItems.slice(0, 2), [todayItems]);
  const leftoverItems = useMemo(() => items.filter(i => i.status === 'in_progress'), [items]);
  const totalGoal = Math.max(3, todayItems.length);
  const completedCount = completedToday.length;

  const handleCheckIn = async () => {
    setCheckedIn(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
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
      {showConfetti && <ConfettiBurst />}

      {/* ===== Welcome Header ===== */}
      {showWelcome && (
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white relative overflow-hidden">
          <FloatingStars count={8} />
          <div className="flex items-center gap-4 relative z-10">
            <div
              className="cursor-pointer transform hover:scale-110 transition-transform"
              onClick={dismissWelcome}
              title="Tap Pepper to dismiss"
            >
              <PepperPenguin pose="waving" size={100} />
            </div>
            <div className="flex-1">
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
              <ReadAloud
                text={`Today's goal: Complete ${totalGoal} activities. You've done ${completedCount} so far!`}
                showIcon={true}
                iconSize="sm"
              >
                <p className="text-white/80 mt-2">
                  🎯 Today's goal: Complete <span className="font-bold">{totalGoal} activities</span>
                  {completedCount > 0 && <> — <span className="text-yellow-200 font-bold">{completedCount} done!</span></>}
                </p>
              </ReadAloud>
            </div>
          </div>
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
              ✅ I'm Here! Check In
            </button>
          </div>
        </ReadAloudBlock>
      )}

      {/* ===== Today's Priority ===== */}
      {priorityItems.length > 0 && (
        <section>
          <ReadAloud text="Today's Priority: Your most important skills to work on" showIcon={true} iconSize="sm">
            <h2 className="text-xl font-bold text-gray-800 mb-3">🎯 Today's Priority</h2>
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
          <h2 className="text-xl font-bold text-gray-800 mb-3">📋 Today's Activities</h2>
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
