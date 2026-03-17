import { supabase } from './supabase';
import type { AISuggestion, AISuggestionType } from '../types/content';

// ============================================================
// A² Compass — AI Service Layer
// All 4 AI features: "AI suggests, teacher decides"
// ============================================================

const AI_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT || '/api/ai';

interface AIRequestPayload {
  type: AISuggestionType;
  context: Record<string, any>;
}

interface AIResponse {
  suggestion: Record<string, any>;
  model_used: string;
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_cents: number;
  response_time_ms: number;
}

async function callAI(payload: AIRequestPayload): Promise<AIResponse> {
  const startTime = Date.now();
  
  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`AI service error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    ...data,
    response_time_ms: Date.now() - startTime,
  };
}

// Save suggestion to database for audit trail
async function saveSuggestion(teacherId: string, type: AISuggestionType, context: Record<string, any>, aiResponse: AIResponse): Promise<AISuggestion> {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .insert({
      teacher_id: teacherId,
      suggestion_type: type,
      context,
      suggestion: aiResponse.suggestion,
      model_used: aiResponse.model_used,
      tokens_used: aiResponse.tokens_used,
      prompt_tokens: aiResponse.prompt_tokens,
      completion_tokens: aiResponse.completion_tokens,
      cost_cents: aiResponse.cost_cents,
      response_time_ms: aiResponse.response_time_ms,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AISuggestion;
}

// ============================================================
// 1. AI LESSON GENERATOR
// ============================================================
export async function generateLessonSuggestions(
  teacherId: string,
  params: {
    topic: string;
    subject: string;
    tier: string;
    grade_level: number;
    format_type?: string;
    additional_context?: string;
  }
): Promise<AISuggestion> {
  const aiResponse = await callAI({
    type: 'lesson_generator',
    context: params,
  });
  
  return saveSuggestion(teacherId, 'lesson_generator', params, aiResponse);
}

// ============================================================
// 2. SMART DIAGNOSTIC SUMMARY
// ============================================================
export async function generateDiagnosticSummary(
  teacherId: string,
  params: {
    student_id: string;
    student_name: string;
    assessment_ids: string[];
    subject_id?: string;
    assessment_data: Array<{
      subject: string;
      score: number;
      max_score: number;
      responses: Record<string, any>;
    }>;
  }
): Promise<AISuggestion> {
  const aiResponse = await callAI({
    type: 'diagnostic_summary',
    context: params,
  });
  
  return saveSuggestion(teacherId, 'diagnostic_summary', params, aiResponse);
}

// ============================================================
// 3. AUTO-GENERATED PRACTICE QUESTIONS
// ============================================================
export async function generatePracticeQuestions(
  teacherId: string,
  params: {
    student_id?: string;
    skill_name: string;
    subject: string;
    tier: string;
    current_mastery: number;
    question_count: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    question_types?: ('multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank')[];
  }
): Promise<AISuggestion> {
  const aiResponse = await callAI({
    type: 'practice_questions',
    context: params,
  });
  
  return saveSuggestion(teacherId, 'practice_questions', params, aiResponse);
}

// ============================================================
// 4. FEEDBACK DRAFT ASSISTANT
// ============================================================
export async function generateFeedbackDraft(
  teacherId: string,
  params: {
    student_name: string;
    tier: string;
    assignment_title: string;
    submission_content: string;
    score?: number;
    max_score?: number;
    rubric?: string;
    tone?: 'encouraging' | 'constructive' | 'detailed';
  }
): Promise<AISuggestion> {
  const aiResponse = await callAI({
    type: 'feedback_draft',
    context: params,
  });
  
  return saveSuggestion(teacherId, 'feedback_draft', params, aiResponse);
}

// ============================================================
// MANAGE SUGGESTIONS
// ============================================================
export async function updateSuggestionStatus(
  id: string,
  status: 'accepted' | 'modified' | 'rejected',
  teacherEdits?: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({
      status,
      teacher_edits: teacherEdits || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function getAISuggestions(teacherId: string, filters?: { type?: AISuggestionType; status?: string }) {
  let query = supabase.from('ai_suggestions').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (filters?.type) query = query.eq('suggestion_type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data as AISuggestion[];
}

export async function getAIUsageStats(teacherId: string) {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .select('suggestion_type, cost_cents, tokens_used, status')
    .eq('teacher_id', teacherId);
  if (error) throw error;
  
  const stats = {
    total_suggestions: data?.length || 0,
    total_cost_cents: data?.reduce((sum, s) => sum + (s.cost_cents || 0), 0) || 0,
    total_tokens: data?.reduce((sum, s) => sum + (s.tokens_used || 0), 0) || 0,
    by_type: {} as Record<string, { count: number; accepted: number; rejected: number }>,
  };
  
  data?.forEach(s => {
    if (!stats.by_type[s.suggestion_type]) stats.by_type[s.suggestion_type] = { count: 0, accepted: 0, rejected: 0 };
    stats.by_type[s.suggestion_type].count++;
    if (s.status === 'accepted' || s.status === 'modified') stats.by_type[s.suggestion_type].accepted++;
    if (s.status === 'rejected') stats.by_type[s.suggestion_type].rejected++;
  });
  
  return stats;
}
