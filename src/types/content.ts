export type LessonStatus = 'draft' | 'published' | 'archived';
export type ActivityStatus = 'draft' | 'published' | 'archived';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'graded' | 'returned' | 'completed' | 'skipped';
export type SubmissionType = 'response' | 'file_upload' | 'quiz_answers' | 'discussion_post' | 'project' | 'recording';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive';
export type AISuggestionType = 'lesson_generator' | 'diagnostic_summary' | 'practice_questions' | 'feedback_draft';
export type AISuggestionStatus = 'pending' | 'accepted' | 'modified' | 'rejected';
export type FormatSlug = 'live-seminar' | 'discussion-board' | 'choice-board' | 'independent-project' | 'partner-quest' | 'one-on-one' | 'practice-arena';

export interface PracticeQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  correct_answer: string;
  explanation?: string;
  points: number;
}

export interface LiveSeminarConfig { scheduled_at: string; duration_min: number; meeting_url?: string; materials: { name: string; url: string }[]; discussion_questions: string[]; }
export interface DiscussionBoardConfig { prompt: string; rubric: string; peer_response_count: number; word_minimum: number; }
export interface ChoiceBoardConfig { choices: { title: string; instructions: string; rubric: string; points: number }[]; min_choices: number; max_choices: number; }
export interface IndependentProjectConfig { prompt: string; milestones: { title: string; due_date?: string; description: string }[]; rubric: string; due_date?: string; }
export interface PartnerQuestConfig { instructions: string; partner_count: number; deliverables: { title: string; description: string }[]; rubric: string; }
export interface OneOnOneConfig { scheduled_at: string; duration_min: number; focus_areas: string[]; prep_materials: { name: string; url: string }[]; }
export interface PracticeArenaConfig { questions: PracticeQuestion[]; time_limit_min?: number; passing_score: number; }

export interface Lesson {
  id: string; teacher_id: string; title: string; description: string | null;
  subject_id: string | null; tier_id: string | null; objectives: string[];
  content: Record<string, any>; attachments: { name: string; url: string; type: string }[];
  tags: string[]; status: LessonStatus; ai_generated: boolean;
  created_at: string; updated_at: string;
  subject?: { name: string; icon: string; color: string };
  tier?: { name: string; slug: string };
  activities?: Activity[];
}

export interface Activity {
  id: string; lesson_id: string | null; teacher_id: string; title: string;
  description: string | null; subject_id: string | null; learning_format_id: string | null;
  tier_id: string | null; config: Record<string, any>; content: Record<string, any>;
  attachments: { name: string; url: string; type: string }[];
  standard_id: string | null; mastery_weight: number; estimated_minutes: number;
  difficulty_level: DifficultyLevel; tags: string[]; status: ActivityStatus;
  ai_generated: boolean; created_at: string; updated_at: string;
  subject?: { name: string; icon: string; color: string };
  tier?: { name: string; slug: string };
  learning_format?: { name: string; slug: string; icon: string };
}

export interface ContentLibraryItem {
  id: string; teacher_id: string; activity_id: string | null; title: string;
  description: string | null; subject_id: string | null; learning_format_id: string | null;
  tier_ids: string[]; tags: string[]; content_snapshot: Record<string, any>;
  usage_count: number; is_template: boolean; created_at: string; updated_at: string;
  subject?: { name: string; icon: string; color: string };
  learning_format?: { name: string; slug: string; icon: string };
}

export interface CurriculumUnit {
  id: string; teacher_id: string; title: string; description: string | null;
  subject_id: string | null; tier_id: string | null; sort_order: number;
  status: 'draft' | 'active' | 'archived'; standard_ids: string[];
  created_at: string; updated_at: string;
  subject?: { name: string; icon: string; color: string };
  tier?: { name: string; slug: string };
  items?: CurriculumUnitItem[];
}

export interface CurriculumUnitItem {
  id: string; unit_id: string; lesson_id: string | null; activity_id: string | null;
  sort_order: number; is_required: boolean; created_at: string;
  lesson?: Lesson; activity?: Activity;
}

export interface StudentAssignment {
  id: string; student_id: string; activity_id: string; assigned_by: string;
  assigned_date: string; due_date: string | null; available_from: string;
  status: AssignmentStatus; started_at: string | null; submitted_at: string | null;
  completed_at: string | null; score: number | null; max_score: number;
  percentage: number | null; mastery_met: boolean; feedback: string | null;
  feedback_audio_url: string | null; feedback_at: string | null;
  flight_plan_item_id: string | null; display_order: number;
  metadata: Record<string, any>; created_at: string; updated_at: string;
  activity?: Activity;
  student?: { user_id: string; grade_level: number; profiles?: { first_name: string; last_name: string } };
}

export interface StudentSubmission {
  id: string; assignment_id: string; student_id: string;
  submission_type: SubmissionType; content: Record<string, any>;
  attachments: { name: string; url: string; type: string }[];
  answers: { question_id: string; answer: string; correct: boolean; points: number }[];
  score: number | null; max_score: number | null; time_spent_seconds: number | null;
  version: number; is_final: boolean; created_at: string; updated_at: string;
}

export interface AISuggestion {
  id: string; teacher_id: string; suggestion_type: AISuggestionType;
  context: Record<string, any>; suggestion: Record<string, any>;
  status: AISuggestionStatus; teacher_edits: Record<string, any> | null;
  model_used: string; tokens_used: number | null; cost_cents: number | null;
  response_time_ms: number | null; created_at: string; updated_at: string;
}

export interface DiscussionPost {
  id: string; activity_id: string; author_id: string; parent_post_id: string | null;
  content: string; attachments: { name: string; url: string; type: string }[];
  is_pinned: boolean; created_at: string; updated_at: string;
  author?: { first_name: string; last_name: string; avatar_url: string };
  replies?: DiscussionPost[];
}

export interface LessonFormData {
  title: string; description: string; subject_id: string; tier_id: string;
  objectives: string[]; content: Record<string, any>; tags: string[]; status: LessonStatus;
}

export interface ActivityFormData {
  title: string; description: string; subject_id: string; learning_format_id: string;
  tier_id: string; config: Record<string, any>; content: Record<string, any>;
  standard_id?: string; estimated_minutes: number; difficulty_level: DifficultyLevel;
  tags: string[]; status: ActivityStatus;
}

export interface AssignActivityData {
  student_ids: string[]; activity_id: string; assigned_date: string;
  due_date?: string; display_order?: number;
}
