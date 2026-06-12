import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  bulletinBoardService,
  type BirthdayInfo,
  type SemesterInfo,
  type UpcomingEvent,
} from '../../services/bulletinBoard.service';

interface BulletinBoardProps {
  role: 'admin' | 'parent' | 'student';
  studentProfileId?: string;
}

export default function BulletinBoard({ role, studentProfileId }: BulletinBoardProps) {
  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [yearProgress, setYearProgress] = useState<{
    totalDaysAttended: number;
    totalDaysRequired: number;
    daysRemaining: number;
    progressPercent: number;
    onTrack: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentProfileId]);

  async function loadData() {
    setLoading(true);
    try {
      const [bdays, upcoming, progress] = await Promise.all([
        bulletinBoardService.getBirthdays(),
        bulletinBoardService.getUpcomingEvents(60),
        bulletinBoardService.getSchoolYearProgress(studentProfileId),
      ]);
      setBirthdays(bdays);
      setSemesters(bulletinBoardService.getCurrentSemester());
      setEvents(upcoming);
      setYearProgress(progress);
    } catch (err) {
      console.error('BulletinBoard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const currentSemester = semesters.find(s => s.isCurrent);
  const todayBirthdays = birthdays.filter(b => b.isToday);
  const upcomingBirthdays = birthdays.filter(b => !b.isToday && b.isThisMonth);

  if (loading) {
    return (
      <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-4 animate-pulse">
        <div className="h-6 bg-amber-200 rounded w-1/3 mb-3" />
        <div className="h-20 bg-amber-100 rounded" />
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, #D2B48C 0%, #C4A882 50%, #B8976B 100%)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
    }}>
      {/* Cork board texture overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' opacity='0.1'%3E%3Ccircle cx='5' cy='5' r='1'/%3E%3Ccircle cx='25' cy='15' r='1'/%3E%3Ccircle cx='15' cy='30' r='0.5'/%3E%3Ccircle cx='35' cy='35' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Pushpins */}
      <div className="absolute top-2 left-6 text-lg z-10" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4))' }}>📌</div>
      <div className="absolute top-2 right-6 text-lg z-10" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4))' }}>📌</div>

      <div className="relative z-5 p-4 pt-6">
        {/* Title */}
        <h2 className="text-center font-bold text-lg text-amber-900 mb-3" style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: '1.4rem' }}>
          📋 Bulletin Board
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* ─── Birthday Card ─── */}
          <div className={`rounded-lg p-3 shadow-md transform -rotate-1 border ${
            todayBirthdays.length > 0
              ? 'bg-gradient-to-br from-pink-100 to-yellow-100 border-pink-300 ring-2 ring-pink-400 ring-opacity-50'
              : 'bg-pink-50 border-pink-200'
          }`}>
            <p className="text-[10px] text-pink-700 font-bold tracking-wider uppercase">🎂 Birthdays</p>
            {todayBirthdays.length > 0 ? (
              <div className="mt-1">
                {todayBirthdays.map(b => (
                  <div key={b.studentProfileId} className="flex items-center gap-2 py-1">
                    <span className="text-2xl animate-bounce">🎂</span>
                    <div>
                      <p className="font-bold text-pink-800 text-sm" style={{ fontFamily: "'Caveat', cursive, sans-serif" }}>
                        Happy Birthday, {b.studentName.split(' ')[0]}!
                      </p>
                      <p className="text-[10px] text-pink-600">Turning {b.age} today! 🎉</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingBirthdays.length > 0 ? (
              <div className="mt-1 space-y-1">
                {upcomingBirthdays.slice(0, 3).map(b => (
                  <div key={b.studentProfileId} className="flex items-center gap-1.5">
                    <span className="text-sm">🎂</span>
                    <p className="text-xs text-pink-700">
                      <span className="font-medium">{b.studentName.split(' ')[0]}</span>
                      <span className="text-pink-500"> — {b.daysUntil} day{b.daysUntil !== 1 ? 's' : ''}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-pink-400 mt-1 italic">No upcoming birthdays</p>
            )}
          </div>

          {/* ─── Semester Info Card ─── */}
          <div className="bg-blue-50 rounded-lg p-3 shadow-md transform rotate-1 border border-blue-200">
            <p className="text-[10px] text-blue-700 font-bold tracking-wider uppercase">📚 Semester</p>
            {currentSemester ? (
              <div className="mt-1">
                <p className="font-bold text-blue-800 text-sm" style={{ fontFamily: "'Caveat', cursive, sans-serif" }}>
                  {currentSemester.emoji} {currentSemester.name}
                </p>
                <div className="mt-1.5 bg-blue-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${currentSemester.progress}%`,
                      background: 'linear-gradient(90deg, #3B82F6, #6366F1)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-blue-500">{currentSemester.progress}% complete</span>
                  <span className="text-[10px] text-blue-500">{currentSemester.daysRemaining} days left</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-blue-400 mt-1 italic">Between semesters</p>
            )}
          </div>

          {/* ─── 180-Day Progress Card ─── */}
          {yearProgress && (
            <div className={`rounded-lg p-3 shadow-md transform -rotate-1 border ${
              yearProgress.onTrack
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <p className={`text-[10px] font-bold tracking-wider uppercase ${
                yearProgress.onTrack ? 'text-green-700' : 'text-orange-700'
              }`}>📊 180-Day Progress</p>
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold" style={{ fontFamily: "'Caveat', cursive, sans-serif", color: yearProgress.onTrack ? '#15803D' : '#C2410C' }}>
                    {yearProgress.totalDaysAttended}
                  </span>
                  <span className="text-xs text-gray-500">/ {yearProgress.totalDaysRequired} days</span>
                </div>
                <div className={`mt-1 rounded-full h-2.5 overflow-hidden ${yearProgress.onTrack ? 'bg-green-200' : 'bg-orange-200'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${yearProgress.progressPercent}%`,
                      background: yearProgress.onTrack
                        ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                        : 'linear-gradient(90deg, #F97316, #EA580C)',
                    }}
                  />
                </div>
                <p className={`text-[10px] mt-0.5 ${yearProgress.onTrack ? 'text-green-600' : 'text-orange-600'}`}>
                  {yearProgress.daysRemaining > 0
                    ? `${yearProgress.daysRemaining} more day${yearProgress.daysRemaining !== 1 ? 's' : ''} to go!`
                    : '🎉 180-day goal reached!'
                  }
                </p>
              </div>
            </div>
          )}

          {/* ─── Upcoming Events Card (spans 2 cols on larger screens) ─── */}
          <div className="bg-yellow-50 rounded-lg p-3 shadow-md transform rotate-0 border border-yellow-200 md:col-span-2 lg:col-span-3">
            <p className="text-[10px] text-yellow-700 font-bold tracking-wider uppercase mb-1">📅 Coming Up</p>
            {events.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {events.slice(0, 8).map((evt, i) => (
                  <div key={`${evt.date}-${i}`} className={`flex items-center gap-1.5 p-1.5 rounded-md ${
                    evt.type === 'birthday' ? 'bg-pink-50' :
                    evt.type === 'holiday' ? 'bg-red-50' :
                    evt.type === 'break' ? 'bg-green-50' :
                    evt.type === 'fun' ? 'bg-purple-50' :
                    'bg-gray-50'
                  }`}>
                    <span className="text-lg flex-shrink-0">{evt.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{evt.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {evt.daysUntil === 0 ? 'Today!' : `${evt.daysUntil} day${evt.daysUntil !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-yellow-400 italic">No upcoming events</p>
            )}
          </div>
        </div>

        {/* Decorative shelf */}
        <div className="flex items-center justify-center gap-2 mt-3 text-sm opacity-40">
          <span>📎</span><span>🖍️</span><span>✂️</span><span>📐</span><span>🖊️</span>
        </div>
      </div>
    </div>
  );
}
