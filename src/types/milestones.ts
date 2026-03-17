// A² Compass – Week 6: Milestone & Parent Story Engine types

export interface MilestoneNotification {
  id: string;
  student_id: string;
  teacher_id: string;
  parent_id: string | null;
  milestone_type:
    | 'skill_mastered'
    | 'domain_progress'
    | 'streak'
    | 'first_attempt'
    | 'breakthrough'
    | 'custom';
  title: string;
  message: string;
  skill_code: string | null;
  domain_code: string | null;
  metadata: Record<string, any>;
  read_at: string | null;
  shared_at: string | null;
  created_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  teacher_id: string | null;
  certificate_type:
    | 'skill_mastery'
    | 'domain_mastery'
    | 'streak_achievement'
    | 'assessment_complete'
    | 'custom';
  title: string;
  description: string | null;
  skill_code: string | null;
  domain_code: string | null;
  issued_at: string;
  metadata: Record<string, any>;
  pdf_url: string | null;
  created_at: string;
}

export interface ProgressSnapshot {
  id: string;
  student_id: string;
  created_by: string;
  snapshot_type: 'weekly_summary' | 'milestone' | 'growth_report' | 'custom';
  title: string;
  stats: Record<string, any>;
  share_token: string;
  expires_at: string;
  created_at: string;
}

export interface SoftSkillRating {
  id: string;
  student_id: string;
  teacher_id: string;
  rating_period: string;
  participation: number | null;
  confidence: number | null;
  persistence: number | null;
  collaboration: number | null;
  self_direction: number | null;
  creativity: number | null;
  notes: string | null;
  created_at: string;
}

export type SoftSkillKey =
  | 'participation'
  | 'confidence'
  | 'persistence'
  | 'collaboration'
  | 'self_direction'
  | 'creativity';

export const SOFT_SKILL_LABELS: Record<SoftSkillKey, string> = {
  participation: 'Participation',
  confidence: 'Confidence',
  persistence: 'Persistence',
  collaboration: 'Collaboration',
  self_direction: 'Self-Direction',
  creativity: 'Creativity',
};
