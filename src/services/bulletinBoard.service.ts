import { supabase } from './supabase';

// ─── School Year Config ─────────────────────────────────
export const SCHOOL_YEAR = {
  start: '2025-09-01',
  end: '2026-05-31',
  summerStart: '2026-06-01',
  summerEnd: '2026-07-31',
  totalDaysRequired: 180,
  enrollmentStart: '2025-09-15', // Hernandez kids started late
};

// ─── Semester Dates ─────────────────────────────────────
export const SEMESTERS = [
  { name: 'Fall Semester', start: '2025-09-01', end: '2026-01-16', emoji: '🍂' },
  { name: 'Spring Semester', start: '2026-01-20', end: '2026-05-31', emoji: '🌸' },
  { name: 'Summer School', start: '2026-06-01', end: '2026-07-31', emoji: '☀️' },
];

// ─── Holidays & School Closings (2025-2026) ────────────
export const HOLIDAYS = [
  { date: '2025-09-01', name: 'Labor Day', emoji: '🇺🇸', type: 'holiday' as const },
  { date: '2025-10-13', name: 'Columbus Day / Indigenous Peoples Day', emoji: '🌎', type: 'holiday' as const },
  { date: '2025-10-31', name: 'Halloween 🎃', emoji: '🎃', type: 'fun' as const },
  { date: '2025-11-11', name: 'Veterans Day', emoji: '🎖️', type: 'holiday' as const },
  { date: '2025-11-24', name: 'Thanksgiving Break Starts', emoji: '🦃', type: 'break' as const },
  { date: '2025-11-25', name: 'Thanksgiving Break', emoji: '🦃', type: 'break' as const },
  { date: '2025-11-26', name: 'Thanksgiving Break', emoji: '🦃', type: 'break' as const },
  { date: '2025-11-27', name: 'Thanksgiving Day', emoji: '🦃', type: 'holiday' as const },
  { date: '2025-11-28', name: 'Thanksgiving Break', emoji: '🦃', type: 'break' as const },
  { date: '2025-12-22', name: 'Winter Break Starts', emoji: '❄️', type: 'break' as const },
  { date: '2025-12-25', name: 'Christmas Day', emoji: '🎄', type: 'holiday' as const },
  { date: '2026-01-01', name: "New Year's Day", emoji: '🎆', type: 'holiday' as const },
  { date: '2026-01-02', name: 'Winter Break Ends', emoji: '❄️', type: 'break' as const },
  { date: '2026-01-19', name: 'MLK Jr. Day', emoji: '✊', type: 'holiday' as const },
  { date: '2026-02-16', name: "Presidents' Day", emoji: '🇺🇸', type: 'holiday' as const },
  { date: '2026-03-30', name: 'Spring Break Starts', emoji: '🌴', type: 'break' as const },
  { date: '2026-03-31', name: 'Spring Break', emoji: '🌴', type: 'break' as const },
  { date: '2026-04-01', name: 'Spring Break', emoji: '🌴', type: 'break' as const },
  { date: '2026-04-02', name: 'Spring Break', emoji: '🌴', type: 'break' as const },
  { date: '2026-04-03', name: 'Spring Break Ends', emoji: '🌴', type: 'break' as const },
  { date: '2026-05-25', name: 'Memorial Day', emoji: '🇺🇸', type: 'holiday' as const },
  { date: '2026-05-29', name: 'Last Day of School!', emoji: '🎉', type: 'fun' as const },
  { date: '2026-06-19', name: 'Juneteenth', emoji: '✊🏿', type: 'holiday' as const },
  { date: '2026-07-04', name: 'Independence Day', emoji: '🎆', type: 'holiday' as const },
];

// ─── Teacher Workdays (no school for students) ─────────
export const TEACHER_WORKDAYS = [
  { date: '2025-09-01', name: 'Teacher Workday' },
  { date: '2026-01-02', name: 'Teacher Workday' },
  { date: '2026-01-16', name: 'Teacher Workday' },
  { date: '2026-03-13', name: 'Teacher Workday' },
];

export interface BirthdayInfo {
  studentName: string;
  studentProfileId: string;
  dateOfBirth: string;
  age: number;
  isToday: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
  daysUntil: number;
}

export interface SemesterInfo {
  name: string;
  emoji: string;
  isCurrent: boolean;
  daysRemaining: number;
  daysTotal: number;
  progress: number;
}

export interface UpcomingEvent {
  date: string;
  name: string;
  emoji: string;
  type: 'holiday' | 'break' | 'fun' | 'birthday' | 'workday';
  daysUntil: number;
}

export const bulletinBoardService = {
  /** Fetch student birthdays from the database */
  async getBirthdays(): Promise<BirthdayInfo[]> {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('id, date_of_birth, user_id, profiles:user_id(first_name, last_name)')

    if (error || !data) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    return data
      .filter((s: any) => s.date_of_birth)
      .map((s: any) => {
        const dob = new Date(s.date_of_birth + 'T00:00:00');
        const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
        // If birthday has passed this year, look at next year
        if (birthdayThisYear < today) {
          birthdayThisYear.setFullYear(currentYear + 1);
        }
        const diffMs = birthdayThisYear.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const age = currentYear - dob.getFullYear() + (birthdayThisYear.getFullYear() > currentYear ? 0 : 0);
        // Calculate actual age on next birthday
        const ageOnBirthday = birthdayThisYear.getFullYear() - dob.getFullYear();

        const profile = s.profiles as any;
        const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Student';

        const isToday = daysUntil === 0 || (daysUntil === 365 || daysUntil === 366);
        const isThisWeek = daysUntil <= 7;
        const isThisMonth = daysUntil <= 30;

        return {
          studentName: name,
          studentProfileId: s.id,
          dateOfBirth: s.date_of_birth,
          age: ageOnBirthday,
          isToday: daysUntil === 0,
          isThisWeek,
          isThisMonth,
          daysUntil: daysUntil === 0 ? 0 : daysUntil,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  },

  /** Get current semester info */
  getCurrentSemester(): SemesterInfo[] {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return SEMESTERS.map(sem => {
      const start = new Date(sem.start + 'T00:00:00');
      const end = new Date(sem.end + 'T00:00:00');
      const isCurrent = todayStr >= sem.start && todayStr <= sem.end;
      const totalMs = end.getTime() - start.getTime();
      const elapsedMs = today.getTime() - start.getTime();
      const daysTotal = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.max(0, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, daysTotal - daysElapsed);
      const progress = isCurrent ? Math.min(100, Math.round((daysElapsed / daysTotal) * 100)) : (todayStr > sem.end ? 100 : 0);

      return { name: sem.name, emoji: sem.emoji, isCurrent, daysRemaining, daysTotal, progress };
    });
  },

  /** Get upcoming events (holidays, breaks, birthdays) */
  async getUpcomingEvents(days = 30): Promise<UpcomingEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events: UpcomingEvent[] = [];

    // Add holidays
    for (const h of HOLIDAYS) {
      const hDate = new Date(h.date + 'T00:00:00');
      const diff = Math.ceil((hDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= days) {
        events.push({ date: h.date, name: h.name, emoji: h.emoji, type: h.type, daysUntil: diff });
      }
    }

    // Add teacher workdays
    for (const tw of TEACHER_WORKDAYS) {
      const twDate = new Date(tw.date + 'T00:00:00');
      const diff = Math.ceil((twDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= days) {
        events.push({ date: tw.date, name: tw.name, emoji: '📋', type: 'workday', daysUntil: diff });
      }
    }

    // Add birthdays
    const birthdays = await this.getBirthdays();
    for (const b of birthdays) {
      if (b.daysUntil <= days) {
        events.push({
          date: b.dateOfBirth,
          name: `🎂 ${b.studentName}'s Birthday (turning ${b.age})`,
          emoji: '🎂',
          type: 'birthday',
          daysUntil: b.daysUntil,
        });
      }
    }

    return events.sort((a, b) => a.daysUntil - b.daysUntil);
  },

  /** Get school year progress */
  async getSchoolYearProgress(studentProfileId?: string): Promise<{
    totalDaysAttended: number;
    totalDaysRequired: number;
    daysRemaining: number;
    progressPercent: number;
    onTrack: boolean;
  }> {
    let totalAttended = 0;

    if (studentProfileId) {
      const { count } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentProfileId)
        .eq('status', 'present');
      totalAttended = count || 0;
    }

    const remaining = SCHOOL_YEAR.totalDaysRequired - totalAttended;
    const percent = Math.round((totalAttended / SCHOOL_YEAR.totalDaysRequired) * 100);

    return {
      totalDaysAttended: totalAttended,
      totalDaysRequired: SCHOOL_YEAR.totalDaysRequired,
      daysRemaining: Math.max(0, remaining),
      progressPercent: Math.min(100, percent),
      onTrack: remaining <= 30, // On track if 30 or fewer days remaining
    };
  },
};
