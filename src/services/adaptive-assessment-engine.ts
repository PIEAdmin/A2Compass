// ============================================================
// A² Compass — Adaptive Assessment Engine
// ============================================================
// Replaces server-side RPC functions with a front-end engine
// that implements Sandra's progressive difficulty philosophy:
//   1) Start at Pre-K (easiest) — always
//   2) Require 3+ correct per skill before mastery
//   3) Increase difficulty gradually (1 → 2 → 3 → 4 → 5)
//   4) Walk through grade bands: Toddler → Pre-K 2 → Pre-K → Pre-K/K → K → K/1st → 1st → ...
//   5) Stop advancing if student struggles (2 wrong at same difficulty = ceiling)
// ============================================================

import { supabase } from './supabase';
import type {
  StartSessionResult,
  NextSkillResult,
  NextItemResult,
  ProcessResponseResult,
  SessionType,
  AlgorithmState,
} from '../types/assessment';

// ---------- Grade band ordering ----------
const GRADE_ORDER: Record<string, number> = {
  'Toddler': 0,
  'Pre-K 2': 1,
  'Pre-K': 2,
  'Pre-K/K': 3,
  'K': 4,
  'K/1st': 5,
  '1st': 6,
  '1st/2nd': 7,
  '2nd': 8,
  '2nd/3rd': 9,
  '3rd': 10,
  '3rd+': 11,
  '3rd/4th': 12,
};

// ---------- Tuning constants ----------
const MIN_CORRECT_FOR_MASTERY = 3;       // Need 3+ correct on a skill
const MIN_ITEMS_FOR_MASTERY = 3;         // Must attempt at least 3 items
const MASTERY_THRESHOLD_PERCENT = 80;    // 80%+ to master
const MAX_ITEMS_PER_SKILL = 5;           // Cap items per skill
const MAX_WRONG_BEFORE_CEILING = 2;      // 2 wrong at same difficulty = stop
const CORRECT_TO_ADVANCE_DIFFICULTY = 2; // 2 correct at same difficulty → next level

// ---------- Helpers ----------

function gradeBandOrder(band: string): number {
  return GRADE_ORDER[band] ?? 99;
}

/** Fetch all skill nodes ordered by grade level */
async function fetchSkillsByGrade(): Promise<any[]> {
  const { data, error } = await supabase
    .from('skill_nodes')
    .select('id, code, name, domain_id, grade_band, grade_level_approx, display_order, is_entry_point, mastery_threshold')
    .order('grade_level_approx')
    .order('display_order');
  if (error) throw error;
  // Sort by our grade band order then display_order
  return (data || []).sort((a: any, b: any) => {
    const ga = gradeBandOrder(a.grade_band);
    const gb = gradeBandOrder(b.grade_band);
    if (ga !== gb) return ga - gb;
    return (a.display_order || 0) - (b.display_order || 0);
  });
}

/** Fetch domain names */
async function fetchDomains(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('skill_domains')
    .select('id, name');
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach((d: any) => { map[d.id] = d.name; });
  return map;
}

/** Fetch items for a skill ordered by difficulty */
async function fetchItemsForSkill(skillId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('assessment_items')
    .select('*')
    .eq('skill_id', skillId)
    .eq('is_active', true)
    .order('difficulty')
    .order('is_practice', { ascending: false }); // practice items first
  if (error) throw error;
  return data || [];
}

/** Get items already answered in this session */
async function fetchSessionResponses(sessionId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('assessment_responses')
    .select('item_id, skill_id, is_correct, score')
    .eq('session_id', sessionId)
    .order('responded_at');
  if (error) throw error;
  return data || [];
}

/** Get skill results for this session */
async function fetchSessionSkillResults(sessionId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('assessment_skill_results')
    .select('skill_id, items_attempted, items_correct, proficiency, score_percent')
    .eq('session_id', sessionId);
  if (error) throw error;
  return data || [];
}

// ============================================================
// Main Adaptive Engine
// ============================================================

export const adaptiveEngine = {

  // ----------------------------------------------------------------
  // START SESSION — always start from the lowest grade band
  // ----------------------------------------------------------------
  async startSession(
    studentId: string,
    type: SessionType,
    _targetSkillIds?: string[]
  ): Promise<StartSessionResult> {
    // Create session record
    const { data: session, error: sessErr } = await supabase
      .from('assessment_sessions')
      .insert({
        student_id: studentId,
        session_type: type,
        status: 'in_progress',
        current_item_index: 0,
        items_attempted: 0,
        items_correct: 0,
        skills_assessed: 0,
        skills_mastered: 0,
        total_active_time_seconds: 0,
        algorithm_state: {
          consecutiveCorrect: 0,
          consecutiveWrong: 0,
          direction: 'up',
          currentGradeBandIndex: 0,
          currentDifficulty: 1,
          correctAtCurrentDifficulty: 0,
          wrongAtCurrentDifficulty: 0,
        } as any,
        target_skill_ids: _targetSkillIds || [],
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (sessErr) throw sessErr;

    // Find first skill
    const nextSkill = await this.getNextSkill(session.id);
    if (nextSkill.done) {
      return { sessionId: session.id, done: true, currentSkill: nextSkill };
    }

    // Find first item for that skill
    const nextItem = await this.getNextItem(session.id, nextSkill.skillId!);

    return {
      sessionId: session.id,
      done: false,
      currentSkill: nextSkill,
      currentItem: nextItem,
    };
  },

  // ----------------------------------------------------------------
  // GET NEXT SKILL — walk through grade bands progressively
  // ----------------------------------------------------------------
  async getNextSkill(sessionId: string): Promise<NextSkillResult> {
    const allSkills = await fetchSkillsByGrade();
    const domains = await fetchDomains();
    const skillResults = await fetchSessionSkillResults(sessionId);

    // Skills already assessed in this session
    const assessedSkillIds = new Set(skillResults.map((r: any) => r.skill_id));

    // Get session's algorithm state
    const { data: session } = await supabase
      .from('assessment_sessions')
      .select('algorithm_state')
      .eq('id', sessionId)
      .single();

    const algState = (session?.algorithm_state || {}) as any;
    const currentGradeIndex = algState.currentGradeBandIndex || 0;

    // Get ordered grade bands
    const gradeBands = Object.keys(GRADE_ORDER).sort(
      (a, b) => GRADE_ORDER[a] - GRADE_ORDER[b]
    );

    // Track how many skills assessed and mastered for summary
    let totalAssessed = assessedSkillIds.size;
    let mastered = skillResults.filter((r: any) => r.proficiency === 'mastered').length;
    let needsPractice = skillResults.filter((r: any) => r.proficiency === 'needs_practice').length;
    let notReady = skillResults.filter((r: any) => r.proficiency === 'not_ready').length;

    // Find the next unanswered skill, starting from current grade band
    for (let gi = currentGradeIndex; gi < gradeBands.length; gi++) {
      const band = gradeBands[gi];
      const bandSkills = allSkills.filter(
        (s: any) => s.grade_band === band && !assessedSkillIds.has(s.id)
      );

      // Within a band, try entry_point skills first, then others
      const entrySkills = bandSkills.filter((s: any) => s.is_entry_point);
      const otherSkills = bandSkills.filter((s: any) => !s.is_entry_point);
      const orderedSkills = [...entrySkills, ...otherSkills];

      if (orderedSkills.length > 0) {
        const skill = orderedSkills[0];
        // Check: if the student has been struggling (2+ "not_ready" at this grade), stop
        const notReadyAtThisGrade = skillResults.filter((r: any) => {
          const s = allSkills.find((sk: any) => sk.id === r.skill_id);
          return s?.grade_band === band && r.proficiency === 'not_ready';
        }).length;

        if (notReadyAtThisGrade >= 2 && gi > currentGradeIndex) {
          // Student hit ceiling at this grade — stop
          return {
            done: true,
            reason: `Ceiling reached at ${band} level`,
            summary: {
              totalSkillsAssessed: totalAssessed,
              mastered,
              needsPractice,
              notReady,
            },
          };
        }

        // Update session with current grade band
        await supabase
          .from('assessment_sessions')
          .update({
            current_skill_id: skill.id,
            algorithm_state: {
              ...algState,
              currentGradeBandIndex: gi,
              lastSkillId: skill.id,
            },
          })
          .eq('id', sessionId);

        return {
          done: false,
          skillId: skill.id,
          skillCode: skill.code,
          skillName: skill.name,
          domainName: domains[skill.domain_id] || 'Unknown',
          reason: `Grade band: ${band}`,
        };
      }
    }

    // All skills assessed
    return {
      done: true,
      reason: 'All skills assessed',
      summary: {
        totalSkillsAssessed: totalAssessed,
        mastered,
        needsPractice,
        notReady,
      },
    };
  },

  // ----------------------------------------------------------------
  // GET NEXT ITEM — serve easiest items first, progressively harder
  // ----------------------------------------------------------------
  async getNextItem(sessionId: string, skillId: string): Promise<NextItemResult> {
    const allItems = await fetchItemsForSkill(skillId);
    const responses = await fetchSessionResponses(sessionId);

    // Items already answered for this skill in this session
    const answeredItemIds = new Set(
      responses.filter((r: any) => r.skill_id === skillId).map((r: any) => r.item_id)
    );

    // Get current state
    const { data: session } = await supabase
      .from('assessment_sessions')
      .select('algorithm_state')
      .eq('id', sessionId)
      .single();

    const algState = (session?.algorithm_state || {}) as any;
    const currentDifficulty = algState.currentDifficulty || 1;
    const correctAtDiff = algState.correctAtCurrentDifficulty || 0;
    const wrongAtDiff = algState.wrongAtCurrentDifficulty || 0;

    // Count items answered for this skill
    const skillResponses = responses.filter((r: any) => r.skill_id === skillId);
    const skillCorrect = skillResponses.filter((r: any) => r.is_correct).length;
    const itemsOnSkill = skillResponses.length;

    // Check if we've hit the cap for this skill
    if (itemsOnSkill >= MAX_ITEMS_PER_SKILL) {
      return {
        exhausted: true,
        progress: { itemsOnSkill, currentScore: itemsOnSkill > 0 ? Math.round((skillCorrect / itemsOnSkill) * 100) : 0 },
      };
    }

    // Determine target difficulty: start at 1, advance if doing well
    let targetDifficulty = currentDifficulty;
    if (correctAtDiff >= CORRECT_TO_ADVANCE_DIFFICULTY && targetDifficulty < 5) {
      targetDifficulty = Math.min(targetDifficulty + 1, 5);
    }
    if (wrongAtDiff >= MAX_WRONG_BEFORE_CEILING && targetDifficulty > 1) {
      // Don't go higher, stay or drop
      targetDifficulty = Math.max(targetDifficulty - 1, 1);
    }

    // Find unanswered items, preferring target difficulty
    const unanswered = allItems.filter((item: any) => !answeredItemIds.has(item.id));

    if (unanswered.length === 0) {
      return {
        exhausted: true,
        progress: { itemsOnSkill, currentScore: itemsOnSkill > 0 ? Math.round((skillCorrect / itemsOnSkill) * 100) : 0 },
      };
    }

    // Sort by proximity to target difficulty, then prefer practice items for first attempt
    const sorted = unanswered.sort((a: any, b: any) => {
      const aDist = Math.abs(a.difficulty - targetDifficulty);
      const bDist = Math.abs(b.difficulty - targetDifficulty);
      if (aDist !== bDist) return aDist - bDist;
      // For first item on a skill, prefer practice items
      if (itemsOnSkill === 0) {
        if (a.is_practice && !b.is_practice) return -1;
        if (!a.is_practice && b.is_practice) return 1;
      }
      return a.difficulty - b.difficulty;
    });

    const chosen = sorted[0];

    // Look up skill info
    const { data: skill } = await supabase
      .from('skill_nodes')
      .select('code, name')
      .eq('id', skillId)
      .single();

    return {
      exhausted: false,
      item: {
        id: chosen.id,
        skillId: skillId,
        skillCode: skill?.code || '',
        skillName: skill?.name || '',
        difficulty: chosen.difficulty,
        questionType: chosen.question_type,
        questionData: chosen.question_data,
        audioPrompt: chosen.audio_prompt,
        hintText: chosen.hint_text,
        isPractice: chosen.is_practice,
      },
      progress: {
        itemsOnSkill: itemsOnSkill + 1,
        currentScore: itemsOnSkill > 0 ? Math.round((skillCorrect / itemsOnSkill) * 100) : 0,
      },
    };
  },

  // ----------------------------------------------------------------
  // PROCESS RESPONSE — require 3+ correct for mastery, track difficulty
  // ----------------------------------------------------------------
  async processResponse(
    sessionId: string,
    itemId: string,
    response: Record<string, any>,
    isCorrect: boolean,
    score?: number,
    timeSpent?: number,
    hintUsed?: boolean
  ): Promise<ProcessResponseResult> {
    // Get current session + item info
    const [{ data: session }, { data: item }] = await Promise.all([
      supabase.from('assessment_sessions').select('*').eq('id', sessionId).single(),
      supabase.from('assessment_items').select('skill_id, difficulty, explanation').eq('id', itemId).single(),
    ]);

    if (!session) throw new Error('Session not found');
    if (!item) throw new Error('Item not found');

    const skillId = item.skill_id;
    const algState = (session.algorithm_state || {}) as any;
    const currentDifficulty = algState.currentDifficulty || 1;
    const effectiveScore = score ?? (isCorrect ? 1 : 0);

    // Record the response
    const { data: resp, error: respErr } = await supabase
      .from('assessment_responses')
      .insert({
        session_id: sessionId,
        item_id: itemId,
        skill_id: skillId,
        student_response: response,
        is_correct: isCorrect,
        score: effectiveScore,
        time_spent_seconds: timeSpent || 0,
        hint_used: hintUsed || false,
        attempt_number: 1,
      })
      .select()
      .single();
    if (respErr) throw respErr;

    // Get all responses for this skill in this session
    const { data: skillResponses } = await supabase
      .from('assessment_responses')
      .select('is_correct')
      .eq('session_id', sessionId)
      .eq('skill_id', skillId);

    const skillTotal = (skillResponses || []).length;
    const skillCorrect = (skillResponses || []).filter((r: any) => r.is_correct).length;
    const skillScorePercent = skillTotal > 0 ? Math.round((skillCorrect / skillTotal) * 100) : 0;

    // Update difficulty tracking
    let newDifficulty = currentDifficulty;
    let correctAtDiff = (algState.correctAtCurrentDifficulty || 0);
    let wrongAtDiff = (algState.wrongAtCurrentDifficulty || 0);

    if (item.difficulty === currentDifficulty) {
      if (isCorrect) {
        correctAtDiff++;
        if (correctAtDiff >= CORRECT_TO_ADVANCE_DIFFICULTY) {
          newDifficulty = Math.min(currentDifficulty + 1, 5);
          correctAtDiff = 0;
          wrongAtDiff = 0;
        }
      } else {
        wrongAtDiff++;
        if (wrongAtDiff >= MAX_WRONG_BEFORE_CEILING && newDifficulty > 1) {
          newDifficulty = Math.max(currentDifficulty - 1, 1);
          correctAtDiff = 0;
          wrongAtDiff = 0;
        }
      }
    }

    // Determine next action
    let nextAction: 'continue_skill' | 'advance_up' | 'go_down' = 'continue_skill';

    // Check if we have enough data to make a decision on this skill
    if (skillTotal >= MIN_ITEMS_FOR_MASTERY) {
      if (skillCorrect >= MIN_CORRECT_FOR_MASTERY && skillScorePercent >= MASTERY_THRESHOLD_PERCENT) {
        // Mastered! Record skill result and advance
        nextAction = 'advance_up';
        await this._recordSkillResult(sessionId, session.student_id, skillId, skillTotal, skillCorrect, 'mastered');
      } else if (skillTotal >= MAX_ITEMS_PER_SKILL) {
        // Hit item cap — evaluate
        if (skillScorePercent >= 60) {
          await this._recordSkillResult(sessionId, session.student_id, skillId, skillTotal, skillCorrect, 'needs_practice');
        } else {
          await this._recordSkillResult(sessionId, session.student_id, skillId, skillTotal, skillCorrect, 'not_ready');
          nextAction = 'go_down';
        }
        nextAction = nextAction === 'continue_skill' ? 'advance_up' : nextAction;
      }
    } else if (skillTotal < MIN_ITEMS_FOR_MASTERY) {
      // Not enough data yet — continue on this skill
      nextAction = 'continue_skill';
    }

    // Update session counters + algorithm state
    const newAlgState = {
      ...algState,
      consecutiveCorrect: isCorrect ? (algState.consecutiveCorrect || 0) + 1 : 0,
      consecutiveWrong: isCorrect ? 0 : (algState.consecutiveWrong || 0) + 1,
      direction: nextAction === 'go_down' ? 'down' : 'up',
      lastSkillId: skillId,
      lastSkillScore: skillScorePercent,
      lastAction: nextAction,
      currentDifficulty: newDifficulty,
      correctAtCurrentDifficulty: correctAtDiff,
      wrongAtCurrentDifficulty: wrongAtDiff,
    };

    await supabase
      .from('assessment_sessions')
      .update({
        items_attempted: (session.items_attempted || 0) + 1,
        items_correct: (session.items_correct || 0) + (isCorrect ? 1 : 0),
        algorithm_state: newAlgState,
      })
      .eq('id', sessionId);

    return {
      responseId: resp.id,
      isCorrect,
      skillScore: skillScorePercent,
      skillItemsTotal: skillTotal,
      nextAction,
      currentSkillId: skillId,
      consecutiveCorrect: newAlgState.consecutiveCorrect,
      consecutiveWrong: newAlgState.consecutiveWrong,
      explanation: item.explanation || undefined,
    };
  },

  // ----------------------------------------------------------------
  // INTERNAL: Record a skill-level result
  // ----------------------------------------------------------------
  async _recordSkillResult(
    sessionId: string,
    studentId: string,
    skillId: string,
    attempted: number,
    correct: number,
    proficiency: string
  ) {
    const scorePercent = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    // Upsert skill result
    const { error } = await supabase
      .from('assessment_skill_results')
      .upsert(
        {
          session_id: sessionId,
          student_id: studentId,
          skill_id: skillId,
          items_attempted: attempted,
          items_correct: correct,
          score_percent: scorePercent,
          proficiency,
          is_ceiling: proficiency === 'not_ready',
          is_floor: false,
          assessed_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,skill_id' }
      );
    if (error) {
      // If upsert fails (no unique constraint on session_id+skill_id), try insert
      await supabase
        .from('assessment_skill_results')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          skill_id: skillId,
          items_attempted: attempted,
          items_correct: correct,
          score_percent: scorePercent,
          proficiency,
          is_ceiling: proficiency === 'not_ready',
          is_floor: false,
          assessed_at: new Date().toISOString(),
        });
    }

    // Update session skill counters
    const { data: allResults } = await supabase
      .from('assessment_skill_results')
      .select('proficiency')
      .eq('session_id', sessionId);

    const masteredCount = (allResults || []).filter((r: any) => r.proficiency === 'mastered').length;

    await supabase
      .from('assessment_sessions')
      .update({
        skills_assessed: (allResults || []).length,
        skills_mastered: masteredCount,
      })
      .eq('id', sessionId);
  },
};
