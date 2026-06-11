// ============================================================
// A² Compass — Assessment Service Layer
// ============================================================
// Hybrid approach: uses the new adaptive engine for skill/item
// selection and response processing, keeps direct table queries
// for reporting and session management.
// ============================================================
import { supabase } from './supabase';
import { adaptiveEngine } from './adaptive-assessment-engine';
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
  // Session Lifecycle — now powered by adaptive engine
  // ----------------------------------------------------------------

  /** Start a new assessment session — always begins at Pre-K level */
  async startAssessmentSession(
    studentId: string,
    type: SessionType,
    targetSkillIds?: string[]
  ): Promise<StartSessionResult> {
    return adaptiveEngine.startSession(studentId, type, targetSkillIds);
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
    return adaptiveEngine.processResponse(
      sessionId,
      itemId,
      response,
      isCorrect,
      score,
      timeSpent,
      hintUsed
    );
  },

  /** Fetch the next item for the current skill in a session */
  async getNextItem(sessionId: string, skillId: string): Promise<NextItemResult> {
    return adaptiveEngine.getNextItem(sessionId, skillId);
  },

  /** Determine the next skill to assess in a session */
  async getNextSkill(sessionId: string): Promise<NextSkillResult> {
    return adaptiveEngine.getNextSkill(sessionId);
  },

  // ----------------------------------------------------------------
  // Session State Management (direct table updates — unchanged)
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
  // Results & Reporting (unchanged)
  // ----------------------------------------------------------------

  /** Fetch skill-level results for a session */
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
    // Include completed, paused, AND in_progress sessions
    const { data: sessions, error: sessErr } = await supabase
      .from('assessment_sessions')
      .select('id, started_at, completed_at, status, skills_assessed, skills_mastered, items_attempted, items_correct')
      .eq('student_id', studentId)
      .in('status', ['completed', 'paused', 'in_progress'])
      .order('started_at', { ascending: false });
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
    const totalItemsAttempted = allSessions.reduce((sum, s: any) => sum + (s.items_attempted || 0), 0);
    const totalItemsCorrect = allSessions.reduce((sum, s: any) => sum + (s.items_correct || 0), 0);

    return {
      totalSessions: allSessions.length,
      totalSkillsAssessed: latestBySkill.size,
      totalSkillsMastered: [...latestBySkill.values()].filter(
        (r) => r.proficiency === 'mastered'
      ).length,
      latestSessionDate: allSessions[0]?.started_at,
      domainBreakdown: Array.from(domainMap.values()),
      totalItemsAttempted,
      totalItemsCorrect,
    } as any;
  },

  // ----------------------------------------------------------------
  // Item Bank Management (Teacher — unchanged)
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
