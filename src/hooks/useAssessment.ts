// ============================================================
// A² Compass — Assessment Hooks
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { assessmentService } from '../services/assessment.service';
import { getStudentProfileId } from '../services/students';
import type {
  PlayerState,
  SessionType,
  NextSkillResult,
  NextItemResult,
  ProcessResponseResult,
  AssessmentSession,
  AssessmentSkillResult,
  AssessmentSummary,
  AssessmentItem,
} from '../types/assessment';

// ---------- Initial player state ----------
const INITIAL_PLAYER_STATE: PlayerState = {
  session: null,
  currentSkill: null,
  currentItem: null,
  showFeedback: false,
  lastResponse: null,
  showHint: false,
  isPaused: false,
  isComplete: false,
  completionSummary: null,
  domainTransition: null,
};

// ==========================================================
// useAssessmentPlayer — full player lifecycle
// ==========================================================
export function useAssessmentPlayer(authUserId: string) {
  const [state, setState] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousDomain = useRef<string | null>(null);
  // Cache the resolved student_profiles.id
  const resolvedId = useRef<string | null>(null);

  /** Resolve auth UUID → student_profiles.id (assessment tables use this FK) */
  async function resolveStudentId(): Promise<string> {
    if (resolvedId.current) return resolvedId.current;
    const profileId = await getStudentProfileId(authUserId);
    if (!profileId) throw new Error('Student profile not found. Please contact your teacher.');
    resolvedId.current = profileId;
    return profileId;
  }

  /** Start a brand-new assessment session */
  const startSession = useCallback(
    async (type: SessionType, targetSkillIds?: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const studentId = await resolveStudentId();

        const result = await assessmentService.startAssessmentSession(
          studentId,
          type,
          targetSkillIds
        );

        // If the engine says done immediately (no skills to assess)
        if (result.done) {
          setState({
            ...INITIAL_PLAYER_STATE,
            isComplete: true,
            completionSummary: result.currentSkill?.summary ?? null,
          });
          return;
        }

        // Fetch the full session row for local state
        const sessions = await assessmentService.getStudentSessions(studentId);
        const session = sessions.find((s) => s.id === result.sessionId) ?? null;

        previousDomain.current = result.currentSkill?.domainName ?? null;

        setState({
          ...INITIAL_PLAYER_STATE,
          session,
          currentSkill: result.currentSkill ?? null,
          currentItem: result.currentItem ?? null,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to start assessment');
      } finally {
        setLoading(false);
      }
    },
    [authUserId]
  );

  /** Submit the student's answer and auto-advance */
  const submitAnswer = useCallback(
    async (
      response: Record<string, any>,
      isCorrect: boolean,
      timeSpent?: number
    ) => {
      if (!state.session || !state.currentItem?.item) return;
      setError(null);
      try {
        const result: ProcessResponseResult =
          await assessmentService.processResponse(
            state.session.id,
            state.currentItem.item.id,
            response,
            isCorrect,
            undefined,
            timeSpent,
            state.showHint
          );

        // Show feedback first
        setState((prev) => ({
          ...prev,
          showFeedback: true,
          lastResponse: result,
          showHint: false,
        }));

        // Auto-advance after TTS has time to finish reading feedback + explanation.
        // Base 3.5 s for the congrats phrase; add ~55 ms per character of explanation.
        const explanationLen = (result as any).explanation?.length || 0;
        const feedbackDelay = explanationLen > 0
          ? Math.min(3500 + explanationLen * 55, 12000)
          : 3500;
        setTimeout(async () => {
          // Stop any lingering TTS before loading the next question
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          await advance(result);
        }, feedbackDelay);
      } catch (err: any) {
        setError(err.message || 'Failed to process response');
      }
    },
    [state.session, state.currentItem, state.showHint]
  );

  /** Internal: advance to next item or skill based on engine decision */
  async function advance(result: ProcessResponseResult) {
    if (!state.session) return;

    try {
      if (result.nextAction === 'continue_skill') {
        // Stay on same skill, fetch next item
        const nextItem = await assessmentService.getNextItem(
          state.session.id,
          result.currentSkillId
        );
        if (nextItem.exhausted) {
          // No more items for this skill — move to next skill
          await advanceToNextSkill();
        } else {
          setState((prev) => ({
            ...prev,
            currentItem: nextItem,
            showFeedback: false,
            lastResponse: null,
          }));
        }
      } else {
        // advance_up or go_down — move to next skill
        await advanceToNextSkill();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to advance');
    }
  }

  /** Move to the next skill (and handle domain transitions / completion) */
  async function advanceToNextSkill() {
    if (!state.session) return;

    const nextSkill = await assessmentService.getNextSkill(state.session.id);

    if (nextSkill.done) {
      setState((prev) => ({
        ...prev,
        isComplete: true,
        completionSummary: nextSkill.summary ?? null,
        showFeedback: false,
        currentItem: null,
        currentSkill: nextSkill,
      }));
      return;
    }

    // Check for domain transition
    const newDomain = nextSkill.domainName ?? null;
    const domainChanged =
      previousDomain.current && newDomain && previousDomain.current !== newDomain;

    if (domainChanged) {
      // Show domain transition screen briefly
      setState((prev) => ({
        ...prev,
        domainTransition: newDomain,
        showFeedback: false,
      }));
      await new Promise((r) => setTimeout(r, 3000));
    }

    previousDomain.current = newDomain;

    // Fetch first item for the new skill
    const nextItem = await assessmentService.getNextItem(
      state.session.id,
      nextSkill.skillId!
    );

    setState((prev) => ({
      ...prev,
      currentSkill: nextSkill,
      currentItem: nextItem,
      showFeedback: false,
      lastResponse: null,
      domainTransition: null,
    }));
  }

  /** Reveal hint for the current item */
  const useHint = useCallback(() => {
    setState((prev) => ({ ...prev, showHint: true }));
  }, []);

  /** Pause the session */
  const pauseSession = useCallback(async () => {
    if (!state.session) return;
    try {
      await assessmentService.pauseSession(state.session.id);
      setState((prev) => ({ ...prev, isPaused: true }));
    } catch (err: any) {
      setError(err.message || 'Failed to pause');
    }
  }, [state.session]);

  /** Resume a paused session */
  const resumeSession = useCallback(async () => {
    if (!state.session) return;
    try {
      await assessmentService.resumeSession(state.session.id);
      setState((prev) => ({ ...prev, isPaused: false }));
    } catch (err: any) {
      setError(err.message || 'Failed to resume');
    }
  }, [state.session]);

  return {
    ...state,
    loading,
    error,
    startSession,
    submitAnswer,
    useHint,
    pauseSession,
    resumeSession,
  };
}

// ==========================================================
// useAssessmentDashboard — teacher / parent views
// ==========================================================
export function useAssessmentDashboard(studentId?: string) {
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [latestResults, setLatestResults] = useState<AssessmentSkillResult[]>([]);
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    loadDashboard(studentId);
  }, [studentId]);

  async function loadDashboard(sid: string) {
    setLoading(true);
    setError(null);
    try {
      // Resolve to student_profiles.id for assessment tables
      const profileId = await getStudentProfileId(sid);
      const effectiveId = profileId || sid;

      const [sessionsData, summaryData] = await Promise.all([
        assessmentService.getStudentSessions(effectiveId),
        assessmentService.getAssessmentSummary(effectiveId),
      ]);
      setSessions(sessionsData);
      setSummary(summaryData);

      // Load results from latest completed session
      const latestCompleted = sessionsData.find((s) => s.status === 'completed');
      if (latestCompleted) {
        const results = await assessmentService.getSessionResults(latestCompleted.id);
        setLatestResults(results);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  }

  const refresh = useCallback(() => {
    if (studentId) loadDashboard(studentId);
  }, [studentId]);

  return { sessions, latestResults, summary, loading, error, refresh };
}

// ==========================================================
// useItemBank — teacher item management
// ==========================================================
export function useItemBank(skillId?: string) {
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [skillId]);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const data = await assessmentService.getItemBank(skillId);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  const updateItem = useCallback(
    async (id: string, updates: Partial<AssessmentItem>) => {
      try {
        await assessmentService.updateItem(id, updates);
        await loadItems();
      } catch (err: any) {
        setError(err.message || 'Failed to update item');
      }
    },
    [skillId]
  );

  const toggleActive = useCallback(
    async (id: string, active: boolean) => {
      try {
        await assessmentService.toggleItemActive(id, active);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_active: active } as any : item
          )
        );
      } catch (err: any) {
        setError(err.message || 'Failed to toggle item');
      }
    },
    []
  );

  return { items, loading, error, updateItem, toggleActive, refresh: loadItems };
}
