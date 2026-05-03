// ============================================================
// A² Compass — Assessment Service Layer
// ============================================================
import { supabase } from './supabase';
import type {
  AssessmentItem,
  AssessmentSession,
  AssessmentSkillResult,
  AssessmentSummary,
  DomainProgress,
  StartSessionResult,
  NextSkillResult,
  NextItemResult,
  ProcessResponseResult,
  SessionType,
} from '../types/assessment';

export const assessmentService = {
  // ----------------------------------------------------------------
  // Session Lifecycle (RPC calls)
  // ----------------------------------------------------------------

  /** Start a new assessment session via the DB engine */
  async startAssessmentSession(
    studentId: string,
    type: SessionType,
    targetSkillIds?: string[]
  ): Promise<StartSessionResult> {
    const { data, error } = await supabase.rpc('start_assessment_session', {
      p_student_id: studentId,
      p_session_type: type,
      p_target_skill_ids: targetSkillIds ?? null,
    });
    if (error) throw error;
    return data as StartSessionResult;
  },

  /** Submit a student response and get the next-action decision */
  async processResponse(
    sessionId: string,
    itemId: string,
    response: Record<string, any>,
    isCorrect: boolean,
    score?: number,
    timeSpent?: number,
    hintUsed?: boolean
  ): Promise<ProcessResponseResult> {
    const { data, error } = await supabase.rpc('process_assessment_response', {
      p_session_id: sessionId,
      p_item_id: itemId,
      p_student_response: response,
      p_is_correct: isCorrect,
      p_score: score ?? (isCorrect ? 1 : 0),
      p_time_spent: timeSpent ?? 0,
      p_hint_used: hintUsed ?? false,
    });
    if (error) throw error;
    return data as ProcessResponseResult;
  },

  /** Fetch the next item for the current skill in a session */
  async getNextItem(sessionId: string, skillId: string): Promise<NextItemResult> {
    const { data, error } = await supabase.rpc('get_next_assessment_item', {
      p_session_id: sessionId,
      p_skill_id: skillId,
    });
    if (error) throw error;
    return data as NextItemResult;
  },

  /** Determine the next skill to assess in a session */
  async getNextSkill(sessionId: string): Promise<NextSkillResult> {
    const { data, error } = await supabase.rpc('get_next_skill_for_assessment', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data as NextSkillResult;
  },

  // ----------------------------------------------------------------
  // Session State Management (direct table updates)
  // ----------------------------------------------------------------

  /** Pause an in-progress session */
  async pauseSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('assessment_sessions')
      .update({ status: 'paused', paused_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  },

  /** Resume a paused session */
  async resumeSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('assessment_sessions')
      .update({ status: 'in_progress', paused_at: null })
      .eq('id', sessionId);
    if (error) throw error;
  },

  /** Mark a session as abandoned */
  async abandonSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('assessment_sessions')
      .update({ status: 'abandoned', completed_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  },

  // ----------------------------------------------------------------
  // Results & Reporting
  // ----------------------------------------------------------------

  /** Fetch skill-level results for a completed session */
  async getSessionResults(sessionId: string): Promise<AssessmentSkillResult[]> {
    const { data, error } = await supabase
      .from('assessment_skill_results')
      .select(`
        *,
        skill:skill_nodes!skill_id (
          code,
          name,
          domain:skill_domains!domain_id ( name )
        )
      `)
      .eq('session_id', sessionId)
      .order('assessed_at');
    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      skill_code: row.skill?.code,
      skill_name: row.skill?.name,
      domain_name: row.skill?.domain?.name,
    }));
  },

  /** List all assessment sessions for a student */
  async getStudentSessions(studentId: string): Promise<AssessmentSession[]> {
    const { data, error } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** Aggregated assessment summary for a student */
  async getAssessmentSummary(studentId: string): Promise<AssessmentSummary> {
    // Fetch latest completed sessions
    const { data: sessions, error: sessErr } = await supabase
      .from('assessment_sessions')
      .select('id, started_at, skills_assessed, skills_mastered')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });
    if (sessErr) throw sessErr;

    // Fetch all skill results for the student (latest per skill)
    const { data: results, error: resErr } = await supabase
      .from('assessment_skill_results')
      .select(`
        skill_id,
        proficiency,
        skill:skill_nodes!skill_id (
          domain_id,
          domain:skill_domains!domain_id ( name )
        )
      `)
      .eq('student_id', studentId)
      .order('assessed_at', { ascending: false });
    if (resErr) throw resErr;

    // Deduplicate — keep only the latest result per skill
    const latestBySkill = new Map<string, any>();
    (results || []).forEach((r: any) => {
      if (!latestBySkill.has(r.skill_id)) latestBySkill.set(r.skill_id, r);
    });

    // Build domain breakdown
    const domainMap = new Map<string, DomainProgress>();
    latestBySkill.forEach((r) => {
      const domainId = r.skill?.domain_id || 'unknown';
      const domainName = r.skill?.domain?.name || 'Unknown';
      if (!domainMap.has(domainId)) {
        domainMap.set(domainId, {
          domainId,
          domainName,
          skillsTotal: 0,
          skillsMastered: 0,
          skillsNeedsPractice: 0,
          skillsNotReady: 0,
          skillsNotAssessed: 0,
        });
      }
      const d = domainMap.get(domainId)!;
      d.skillsTotal++;
      if (r.proficiency === 'mastered') d.skillsMastered++;
      else if (r.proficiency === 'needs_practice') d.skillsNeedsPractice++;
      else if (r.proficiency === 'not_ready') d.skillsNotReady++;
      else d.skillsNotAssessed++;
    });

    const allSessions = sessions || [];
    return {
      totalSessions: allSessions.length,
      totalSkillsAssessed: latestBySkill.size,
      totalSkillsMastered: [...latestBySkill.values()].filter(
        (r) => r.proficiency === 'mastered'
      ).length,
      latestSessionDate: allSessions[0]?.started_at,
      domainBreakdown: Array.from(domainMap.values()),
    };
  },

  // ----------------------------------------------------------------
  // Item Bank Management (Teacher)
  // ----------------------------------------------------------------

  /** Browse items, optionally filtered by skill */
  async getItemBank(skillId?: string): Promise<AssessmentItem[]> {
    let query = supabase
      .from('assessment_items')
      .select('*')
      .order('difficulty');
    if (skillId) {
      query = query.eq('skill_id', skillId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /** Update an item's question data / metadata */
  async updateItem(
    itemId: string,
    updates: Partial<Pick<AssessmentItem, 'question_data' | 'hint_text' | 'explanation' | 'audio_prompt' | 'difficulty'>>
  ): Promise<AssessmentItem> {
    const { data, error } = await supabase
      .from('assessment_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Enable or disable an item */
  async toggleItemActive(itemId: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('assessment_items')
      .update({ is_active: active })
      .eq('id', itemId);
    if (error) throw error;
  },
};
