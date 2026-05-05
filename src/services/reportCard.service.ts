// ============================================================
// A² Compass — Unified Report Card Service
// Aggregates ALL student interaction data for comprehensive reporting
// ============================================================
import { supabase } from './supabase';

/* ── Types ─────────────────────────────────────────────────── */

export interface DomainReport {
  domainId: string;
  domainName: string;
  skillsTotal: number;
  skillsMastered: number;
  skillsDeveloping: number;
  skillsNotStarted: number;
  masteryPercent: number;
  gradeEquivalent: string;
  skills: SkillReport[];
}

export interface SkillReport {
  skillId: string;
  skillName: string;
  code: string;
  status: 'exceeding' | 'meeting' | 'developing' | 'not_started';
  score: number;
  attempts: number;
  masteredAt: string | null;
}

export interface AssessmentRecord {
  id: string;
  sessionType: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  itemsAttempted: number;
  itemsCorrect: number;
  skillsAssessed: number;
  skillsMastered: number;
  accuracy: number;
}

export interface ActivityRecord {
  date: string;
  activityName: string;
  activityType: string;
  domainName: string;
  score: number | null;
  durationMinutes: number;
}

export interface TimeOnTask {
  totalMinutes: number;
  dailyAverage: number;
  weeklyAverage: number;
  byDomain: { domain: string; minutes: number }[];
}

export interface TeacherNote {
  id: string;
  noteType: string;
  title: string;
  body: string;
  createdAt: string;
  teacherName: string;
}

export interface BadgeRecord {
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface UnifiedReportCard {
  student: {
    firstName: string;
    lastName: string;
    gradeLevel: number;
    dateOfBirth: string | null;
    avatarData: any;
    enrollmentDate: string;
  };
  generatedAt: string;
  domains: DomainReport[];
  overallMastery: number;
  overallGradeEquivalent: string;
  assessmentHistory: AssessmentRecord[];
  recentActivities: ActivityRecord[];
  timeOnTask: TimeOnTask;
  teacherNotes: TeacherNote[];
  badges: BadgeRecord[];
  streakDays: number;
  totalActivitiesCompleted: number;
  totalSkillsMastered: number;
  totalSkillsTotal: number;
}

/* ── Grade Equivalent Calculation ─────────────────────────── */

function computeGradeEquivalent(masteryPercent: number, baseGrade: number): string {
  if (masteryPercent >= 95) return `Grade ${baseGrade + 1}+`;
  if (masteryPercent >= 85) return `Grade ${baseGrade} (Exceeding)`;
  if (masteryPercent >= 60) return `Grade ${baseGrade} (Meeting)`;
  if (masteryPercent >= 30) return `Grade ${baseGrade} (Building Up)`;
  if (masteryPercent > 0) return `Grade ${Math.max(baseGrade - 1, 0)} (Developing)`;
  return 'Not Yet Assessed';
}

function computeOverallGrade(domains: DomainReport[], baseGrade: number): string {
  const assessed = domains.filter(d => d.skillsTotal > 0);
  if (assessed.length === 0) return 'Not Yet Assessed';
  const avgMastery = assessed.reduce((sum, d) => sum + d.masteryPercent, 0) / assessed.length;
  return computeGradeEquivalent(avgMastery, baseGrade);
}

/* ── Main Service ─────────────────────────────────────────── */

export const reportCardService = {

  async generateReport(studentProfileId: string): Promise<UnifiedReportCard> {
    // 1. Get student info
    const { data: sp, error: spErr } = await supabase
      .from('student_profiles')
      .select('*, profile:profiles!student_profiles_user_id_fkey(first_name, last_name, created_at)')
      .eq('id', studentProfileId)
      .single();
    if (spErr) throw new Error(`Student not found: ${spErr.message}`);

    const student = {
      firstName: sp.profile?.first_name || '',
      lastName: sp.profile?.last_name || '',
      gradeLevel: sp.grade_level || 1,
      dateOfBirth: sp.date_of_birth,
      avatarData: sp.avatar_data,
      enrollmentDate: sp.profile?.created_at || sp.created_at,
    };

    // 2. Get all domains and skills
    const { data: domains } = await supabase
      .from('skill_domains')
      .select('id, name')
      .order('name');

    const { data: skills } = await supabase
      .from('skill_nodes')
      .select('id, name, code, domain_id, grade_level_approx')
      .lte('grade_level_approx', student.gradeLevel + 1)
      .order('display_order');

    // 3. Get mastery data
    const { data: mastery } = await supabase
      .from('student_mastery')
      .select('standard_id, current_score, attempts, mastered, mastered_at')
      .eq('student_id', studentProfileId);

    const masteryMap = new Map<string, any>();
    (mastery || []).forEach(m => masteryMap.set(m.standard_id, m));

    // 4. Build domain reports
    const domainReports: DomainReport[] = (domains || []).map(domain => {
      const domainSkills = (skills || []).filter(s => s.domain_id === domain.id);
      const skillReports: SkillReport[] = domainSkills.map(skill => {
        const m = masteryMap.get(skill.id);
        let status: SkillReport['status'] = 'not_started';
        let score = 0;
        if (m) {
          score = Number(m.current_score) || 0;
          if (m.mastered) status = score >= 95 ? 'exceeding' : 'meeting';
          else if (m.attempts > 0) status = 'developing';
        }
        return {
          skillId: skill.id,
          skillName: skill.name,
          code: skill.code || '',
          status,
          score,
          attempts: m?.attempts || 0,
          masteredAt: m?.mastered_at || null,
        };
      });

      const total = skillReports.length;
      const mastered = skillReports.filter(s => s.status === 'meeting' || s.status === 'exceeding').length;
      const developing = skillReports.filter(s => s.status === 'developing').length;
      const notStarted = skillReports.filter(s => s.status === 'not_started').length;
      const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

      return {
        domainId: domain.id,
        domainName: domain.name,
        skillsTotal: total,
        skillsMastered: mastered,
        skillsDeveloping: developing,
        skillsNotStarted: notStarted,
        masteryPercent,
        gradeEquivalent: computeGradeEquivalent(masteryPercent, student.gradeLevel),
        skills: skillReports,
      };
    }).filter(d => d.skillsTotal > 0); // Only domains with skills

    // 5. Assessment history
    const { data: sessions } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('started_at', { ascending: false });

    const assessmentHistory: AssessmentRecord[] = (sessions || []).map(s => ({
      id: s.id,
      sessionType: s.session_type,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      status: s.status,
      itemsAttempted: s.items_attempted || 0,
      itemsCorrect: s.items_correct || 0,
      skillsAssessed: s.skills_assessed || 0,
      skillsMastered: s.skills_mastered || 0,
      accuracy: s.items_attempted > 0 ? Math.round((s.items_correct / s.items_attempted) * 100) : 0,
    }));

    // 6. Recent activities (from playlist completions)
    const { data: plItems } = await supabase
      .from('student_playlist')
      .select('*, skill:skill_nodes!skill_id(name, domain:skill_domains!domain_id(name))')
      .eq('student_id', sp.user_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50);

    const recentActivities: ActivityRecord[] = (plItems || []).map(item => ({
      date: item.completed_at || item.created_at,
      activityName: item.title || item.skill?.name || 'Activity',
      activityType: item.activity_type || 'practice',
      domainName: item.skill?.domain?.name || 'General',
      score: item.score || null,
      durationMinutes: Math.round((item.time_spent || 0) / 60),
    }));

    // 7. Time on task estimate
    const totalCompletedItems = (plItems || []).length;
    const totalMinutes = recentActivities.reduce((sum, a) => sum + a.durationMinutes, 0) || totalCompletedItems * 5;
    const daysSinceEnrollment = Math.max(1, Math.ceil((Date.now() - new Date(student.enrollmentDate).getTime()) / (86400 * 1000)));
    const weeksSinceEnrollment = Math.max(1, Math.ceil(daysSinceEnrollment / 7));

    const domainMinutes = new Map<string, number>();
    recentActivities.forEach(a => {
      domainMinutes.set(a.domainName, (domainMinutes.get(a.domainName) || 0) + a.durationMinutes);
    });

    const timeOnTask: TimeOnTask = {
      totalMinutes,
      dailyAverage: Math.round(totalMinutes / daysSinceEnrollment),
      weeklyAverage: Math.round(totalMinutes / weeksSinceEnrollment),
      byDomain: Array.from(domainMinutes.entries()).map(([domain, minutes]) => ({ domain, minutes })),
    };

    // 8. Teacher notes
    const { data: notes } = await supabase
      .from('teacher_notes')
      .select('*, teacher:profiles!teacher_id(first_name, last_name)')
      .eq('student_id', studentProfileId)
      .order('created_at', { ascending: false })
      .limit(20);

    const teacherNotes: TeacherNote[] = (notes || []).map(n => ({
      id: n.id,
      noteType: n.note_type,
      title: n.title || '',
      body: n.body,
      createdAt: n.created_at,
      teacherName: `${n.teacher?.first_name || ''} ${n.teacher?.last_name || ''}`.trim(),
    }));

    // 9. Badges
    const { data: studentBadges } = await supabase
      .from('student_badges')
      .select('*, badge:badges!badge_id(name, description, icon)')
      .eq('student_id', studentProfileId)
      .order('earned_at', { ascending: false });

    const badges: BadgeRecord[] = (studentBadges || []).map(sb => ({
      name: sb.badge?.name || 'Badge',
      description: sb.badge?.description || '',
      icon: sb.badge?.icon || '🏆',
      earnedAt: sb.earned_at,
    }));

    // 10. Streak
    let streakDays = 0;
    try {
      const { data: streakData } = await supabase.rpc('get_student_milestones', { p_user_id: sp.user_id });
      // streakData may include streak info
    } catch { /* ignore */ }

    // 11. Totals
    const totalSkillsMastered = domainReports.reduce((sum, d) => sum + d.skillsMastered, 0);
    const totalSkillsTotal = domainReports.reduce((sum, d) => sum + d.skillsTotal, 0);
    const overallMastery = totalSkillsTotal > 0 ? Math.round((totalSkillsMastered / totalSkillsTotal) * 100) : 0;

    return {
      student,
      generatedAt: new Date().toISOString(),
      domains: domainReports,
      overallMastery,
      overallGradeEquivalent: computeOverallGrade(domainReports, student.gradeLevel),
      assessmentHistory,
      recentActivities,
      timeOnTask,
      teacherNotes,
      badges,
      streakDays,
      totalActivitiesCompleted: totalCompletedItems,
      totalSkillsMastered,
      totalSkillsTotal,
    };
  },

  /** Get all students a user can view reports for */
  async getViewableStudents(userId: string, role: string): Promise<{ id: string; firstName: string; lastName: string; gradeLevel: number }[]> {
    if (role === 'admin' || role === 'teacher') {
      const { data } = await supabase
        .from('student_profiles')
        .select('id, grade_level, profile:profiles!student_profiles_user_id_fkey(first_name, last_name)')
        .order('created_at');
      return (data || []).map(s => ({
        id: s.id,
        firstName: s.profile?.first_name || '',
        lastName: s.profile?.last_name || '',
        gradeLevel: s.grade_level,
      }));
    }
    // Parent — see own children
    const { data } = await supabase
      .from('student_profiles')
      .select('id, grade_level, profile:profiles!student_profiles_user_id_fkey(first_name, last_name)')
      .eq('parent_id', userId)
      .order('created_at');
    return (data || []).map(s => ({
      id: s.id,
      firstName: s.profile?.first_name || '',
      lastName: s.profile?.last_name || '',
      gradeLevel: s.grade_level,
    }));
  },
};
