// ============================================================
// A² Compass — Assessment Engine Types
// ============================================================

// ---------- Enums ----------

export type QuestionType =
  | 'multiple_choice'
  | 'tap_select'
  | 'drag_drop'
  | 'sequence'
  | 'counting'
  | 'fill_blank'
  | 'matching'
  | 'audio_response'
  | 'teacher_observed';

export type SessionType =
  | 'initial_placement'
  | 'skill_check'
  | 'spiral_review'
  | 'mastery_attempt'
  | 'teacher_initiated';

export type SessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'abandoned';

export type Proficiency =
  | 'mastered'
  | 'needs_practice'
  | 'not_ready'
  | 'not_assessed';

// ---------- Core Entities ----------

/** A single question from the item bank */
export interface AssessmentItem {
  id: string;
  skill_id: string;
  difficulty: number;
  question_type: QuestionType;
  question_data: Record<string, any>;
  audio_prompt?: string;
  hint_text?: string;
  explanation?: string;
  is_practice: boolean;
}

/** Algorithm state persisted in the session's JSONB column */
export interface AlgorithmState {
  consecutiveCorrect: number;
  consecutiveWrong: number;
  direction: 'up' | 'down';
  lastSkillId?: string;
  lastSkillScore?: number;
  lastAction?: string;
}

/** A complete assessment session */
export interface AssessmentSession {
  id: string;
  student_id: string;
  session_type: SessionType;
  status: SessionStatus;
  current_domain_id?: string;
  current_skill_id?: string;
  current_item_index: number;
  algorithm_state: AlgorithmState;
  target_skill_ids: string[];
  started_at?: string;
  paused_at?: string;
  completed_at?: string;
  total_active_time_seconds: number;
  items_attempted: number;
  items_correct: number;
  skills_assessed: number;
  skills_mastered: number;
}

/** A single student response to an item */
export interface AssessmentResponse {
  id: string;
  session_id: string;
  item_id: string;
  skill_id: string;
  student_response: Record<string, any>;
  is_correct?: boolean;
  score: number;
  time_spent_seconds: number;
  hint_used: boolean;
  attempt_number: number;
}

/** Aggregated result per skill per session */
export interface AssessmentSkillResult {
  id: string;
  session_id: string;
  student_id: string;
  skill_id: string;
  items_attempted: number;
  items_correct: number;
  score_percent: number;
  proficiency: Proficiency;
  is_ceiling: boolean;
  is_floor: boolean;
  assessed_at: string;
  // Joined fields
  skill_code?: string;
  skill_name?: string;
  domain_name?: string;
}

// ---------- RPC Return Types ----------

export interface StartSessionResult {
  sessionId: string;
  done: boolean;
  currentSkill?: NextSkillResult;
  currentItem?: NextItemResult;
}

export interface NextSkillResult {
  done: boolean;
  skillId?: string;
  skillCode?: string;
  skillName?: string;
  domainName?: string;
  reason?: string;
  summary?: {
    totalSkillsAssessed: number;
    mastered: number;
    needsPractice: number;
    notReady: number;
  };
}

export interface NextItemResult {
  exhausted: boolean;
  item?: {
    id: string;
    skillId: string;
    skillCode: string;
    skillName: string;
    difficulty: number;
    questionType: QuestionType;
    questionData: Record<string, any>;
    audioPrompt?: string;
    hintText?: string;
    isPractice: boolean;
  };
  progress?: {
    itemsOnSkill: number;
    currentScore: number;
  };
}

export interface ProcessResponseResult {
  responseId: string;
  isCorrect: boolean;
  skillScore: number;
  skillItemsTotal: number;
  nextAction: 'continue_skill' | 'advance_up' | 'go_down';
  currentSkillId: string;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  explanation?: string;
}

// ---------- Player UI State ----------

export interface PlayerState {
  session: AssessmentSession | null;
  currentSkill: NextSkillResult | null;
  currentItem: NextItemResult | null;
  showFeedback: boolean;
  lastResponse: ProcessResponseResult | null;
  showHint: boolean;
  isPaused: boolean;
  isComplete: boolean;
  completionSummary: NextSkillResult['summary'] | null;
  domainTransition: string | null; // domain name when switching domains
  itemHistory: Array<{skill: NextSkillResult | null, item: NextItemResult | null}>;
}

// ---------- Dashboard Aggregates ----------

export interface AssessmentSummary {
  totalSessions: number;
  totalSkillsAssessed: number;
  totalSkillsMastered: number;
  latestSessionDate?: string;
  domainBreakdown: DomainProgress[];
}

export interface DomainProgress {
  domainId: string;
  domainName: string;
  skillsTotal: number;
  skillsMastered: number;
  skillsNeedsPractice: number;
  skillsNotReady: number;
  skillsNotAssessed: number;
}
