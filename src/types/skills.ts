export type SkillCategory = 'literacy' | 'numeracy';
export type SkillStatus = 'not_started' | 'needs_practice' | 'struggling' | 'ready_to_learn' | 'in_progress' | 'mastered';
export type PlaylistReason = 'needs_practice' | 'ready_to_learn' | 'foundational_gap' | 'spiral_review' | 'teacher_focus' | 'teacher_added';
export type PlaylistItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type DayMode = 'light' | 'normal' | 'power';

export interface SkillDomain {
  id: string;
  code: string;
  name: string;
  category: SkillCategory;
  subject_id: string | null;
  description: string | null;
  display_order: number;
  skill_count: number;
}

export interface SkillNode {
  id: string;
  domain_id: string;
  code: string;
  name: string;
  description: string | null;
  grade_band: string;
  grade_level_approx: number;
  display_order: number;
  is_entry_point: boolean;
  mastery_threshold: number;
  mastery_criteria: string | null;
  sample_activities: any[];
  domain?: SkillDomain;
}

export interface SkillPrerequisite {
  id: string;
  skill_id: string;
  prerequisite_id: string;
  is_cross_domain: boolean;
  rationale: string | null;
}

export interface StudentSkillProfile {
  id: string;
  student_id: string;
  skill_id: string;
  status: SkillStatus;
  current_score: number;
  highest_score: number;
  attempts: number;
  first_assessed_at: string | null;
  last_assessed_at: string | null;
  mastered_at: string | null;
  teacher_override: boolean;
  override_status: string | null;
  override_note: string | null;
  override_by: string | null;
  override_at: string | null;
  evidence: { score: number; at: string; attempt: number }[];
  skill?: SkillNode;
}

export interface PlaylistConfig {
  id: string;
  student_id: string;
  daily_skill_cap: number;
  session_counter: number;
  day_mode: DayMode;
  focus_skill_ids: string[];
  prefer_domains: string[];
  exclude_domains: string[];
}

export interface PlaylistItem {
  id: string;
  student_id: string;
  skill_id: string;
  playlist_date: string;
  display_order: number;
  reason: PlaylistReason;
  priority: number;
  activity_id: string | null;
  assignment_id: string | null;
  status: PlaylistItemStatus;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  mastery_met: boolean;
  skill?: SkillNode;
}

export interface SkillProfileEntry {
  domain_code: string;
  domain_name: string;
  category: string;
  skill_code: string;
  skill_name: string;
  grade_band: string;
  status: SkillStatus;
  current_score: number;
  attempts: number;
  mastered_at: string | null;
  teacher_override: boolean;
}

export interface DomainSkillGroup {
  domain: SkillDomain;
  skills: SkillProfileEntry[];
  masteredCount: number;
  totalCount: number;
  percentComplete: number;
}

export interface GeneratedPlaylistItem {
  skill_code: string;
  skill_name: string;
  domain_name: string;
  domain_code: string;
  reason: PlaylistReason;
  priority: number;
  grade_band: string;
  status: SkillStatus;
}
