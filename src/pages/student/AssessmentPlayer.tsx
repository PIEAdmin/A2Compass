// ============================================================
// A² Compass — Assessment Player (Student-Facing)
// Child-friendly, audio-supported, game-like assessment experience
// Enhanced: "Tap to Hear, Tap Again to Select" pattern for touch devices
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAssessmentPlayer } from '../../hooks/useAssessment';
import { useAuth } from '../../hooks';
import { LoadingSpinner } from '../../components/common';
import type {
  NextItemResult,
  ProcessResponseResult,
  QuestionType,
  SessionType,
} from '../../types/assessment';

// ---------- TTS Helper ----------
const speak = (text: string) => {
  if (!text || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  // Chrome bug: cancel() then immediate speak() silently fails — add delay
  synth.cancel();
  // Resume in case synth got stuck in paused state
  synth.resume();
  setTimeout(() => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1.0;   // MAX volume
      utterance.rate = 0.82;    // Slightly slower for kids
      utterance.pitch = 1.15;   // Warm, friendly tone
      // Pick the friendliest available voice
      const voices = synth.getVoices();
      const preferred = [
        'Google US English',          // Chrome — clear and friendly
        'Microsoft Aria Online',      // Edge — natural and warm
        'Samantha',                   // macOS — friendly female voice
        'Microsoft Zira',             // Windows — clear female voice
        'Google UK English Female',   // Chrome fallback
        'Karen',                      // macOS fallback
      ];
      let bestVoice: SpeechSynthesisVoice | null = null;
      for (const name of preferred) {
        bestVoice = voices.find(v => v.name.includes(name)) ?? null;
        if (bestVoice) break;
      }
      // Fallback: any English voice, prefer non-local (Google voices are better quality)
      if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && !v.localService) ?? null;
      if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en')) ?? null;
      try { if (bestVoice) utterance.voice = bestVoice; } catch (_) { /* voice not compatible */ }
      synth.speak(utterance);
      // Chrome watchdog: if paused after 10s, resume
      setTimeout(() => { try { if (synth.speaking && synth.paused) synth.resume(); } catch (_) {} }, 10000);
    } catch (_) { /* TTS not available or crashed — fail silently */ }
  }, 80);
};

// Pre-load voices on module init (Chrome loads them lazily)
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
}

/** Read question text AND all answer choices aloud with clear instructions */
const speakWithChoices = (questionText: string, questionData: Record<string, any>, questionType: string) => {
  // Build a child-friendly instruction prefix based on question type
  let instruction = '';
  switch (questionType) {
    case 'multiple_choice':
      instruction = 'Pick the best answer. ';
      break;
    case 'tap_select':
      instruction = 'Tap all the right answers. ';
      break;
    case 'counting':
      instruction = 'Count what you see, then pick the right number. ';
      break;
    case 'sequence':
      instruction = 'Put these in the right order. Tap them one at a time. ';
      break;
    case 'fill_blank':
      instruction = 'Pick the word that fills in the blank. ';
      break;
    case 'matching':
      instruction = 'Match each item on the left with its pair on the right. ';
      break;
    case 'drag_drop':
      instruction = 'Put each item where it belongs. ';
      break;
    case 'teacher_observed':
      instruction = 'Your teacher will help you with this one. ';
      break;
    case 'audio_response':
      instruction = 'Say your answer out loud. ';
      break;
    default:
      instruction = 'Listen carefully. ';
  }

  let fullText = instruction + (questionText || 'Here is your question.');

  // Collect choices based on question type
  const opts: string[] = questionData?.options || [];
  const items: any[] = questionData?.items || [];
  const pairs: any[] = questionData?.pairs || [];
  const draggables: any[] = questionData?.draggables || [];

  if (opts.length > 0) {
    const labels = opts.map((o: any) => typeof o === 'object' ? (o.text || o.label || String(o)) : String(o));
    fullText += '. The choices are: ' + labels.map((l: string, i: number) => String.fromCharCode(65 + i) + ', ' + l).join('. ') + '.';
  } else if (items.length > 0 && questionType !== 'sequence') {
    const labels = items.map((it: any) => it.label || it.text || String(it));
    fullText += '. The choices are: ' + labels.join(', ') + '.';
  } else if (items.length > 0 && questionType === 'sequence') {
    const labels = items.map((it: any) => it.label || it.text || String(it));
    fullText += '. The items are: ' + labels.join(', ') + '.';
  } else if (questionType === 'counting') {
    fullText += '. Count the objects you see and tap the right number.';
  } else if (pairs.length > 0) {
    const leftItems = pairs.map((p: any) => p.left || '').filter(Boolean);
    const rightItems = pairs.map((p: any) => p.right || '').filter(Boolean);
    if (leftItems.length) fullText += '. On the left: ' + leftItems.join(', ') + '.';
    if (rightItems.length) fullText += ' On the right: ' + rightItems.join(', ') + '.';
  } else if (draggables.length > 0) {
    const dragLabels = draggables.map((d: any) => typeof d === 'object' ? (d.label || d.id) : d);
    fullText += '. The items to sort are: ' + dragLabels.join(', ') + '.';
  }
  speak(fullText);
};

/** Speak individual option text on hover/focus (debounced) */
let _speakTimer: ReturnType<typeof setTimeout> | null = null;
const speakOption = (text: string) => {
  if (_speakTimer) clearTimeout(_speakTimer);
  _speakTimer = setTimeout(() => {
    speak(String(text));
  }, 150);
};


// ---------- Touch Device Detection Hook ----------
/** Returns a ref that is set to true on first touchstart event */
function useTouchDevice() {
  const isTouchRef = useRef(false);
  useEffect(() => {
    const handler = () => { isTouchRef.current = true; };
    window.addEventListener('touchstart', handler, { passive: true });
    return () => window.removeEventListener('touchstart', handler);
  }, []);
  return isTouchRef;
}


// ---------- Domain-themed emojis ----------
const getDomainEmojis = (domainName: string): string[] => {
  const d = (domainName || '').toLowerCase();
  if (d.includes('liter') || d.includes('print') || d.includes('read') || d.includes('phon'))
    return ['📚', '📖', '✏️', '🔤', '📝', '🦋'];
  if (d.includes('math') || d.includes('numer') || d.includes('count'))
    return ['🔢', '➕', '🎲', '⭐', '🧮', '🌟'];
  if (d.includes('daily') || d.includes('living'))
    return ['🏠', '⏰', '🍎', '👕', '🌈', '🧹'];
  if (d.includes('social') || d.includes('sel') || d.includes('emotion'))
    return ['💛', '🤝', '😊', '🌈', '🦄', '💫'];
  return ['⭐', '🌟', '✨', '🎯', '🚀', '💫'];
};

// ---------- Encouraging messages ----------
const CORRECT_MESSAGES = [
  '🌟 Amazing! You got it!',
  '⭐ Fantastic job!',
  '🎉 You\'re a superstar!',
  '✨ Wonderful! Keep going!',
  '🌈 Brilliant work!',
];
const INCORRECT_MESSAGES = [
  'That\'s okay! Let\'s learn together.',
  'Good try! You\'re learning so much.',
  'Almost! Let\'s see the answer.',
  'Great effort! Practice makes perfect.',
];

function randomMessage(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==========================================================
// Main Assessment Player Page
// ==========================================================
// ---------- Floating Decorations ----------
function FloatingDecorations({ emojis }: { emojis: string[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {emojis.map((emoji, i) => (
        <span
          key={i}
          className="absolute text-2xl sm:text-3xl opacity-15"
          style={{
            left: `${10 + (i * 16) % 85}%`,
            top: `${8 + (i * 23) % 80}%`,
            animation: `float ${3 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

// ---------- Animation Styles ----------
function AnimationStyles() {
  return (
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-12px) rotate(3deg); }
      }
      @keyframes slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes bounce-in {
        0% { transform: scale(0.5); opacity: 0; }
        60% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes pulse-soft {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes ripple {
        0% { transform: scale(0.8); opacity: 0.6; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes speaker-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      .slide-up { animation: slide-up 0.4s ease-out; }
      .bounce-in { animation: bounce-in 0.5s ease-out; }
      .pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      .shimmer-bar {
        background: linear-gradient(90deg, #818cf8, #c084fc, #818cf8);
        background-size: 200% 100%;
        animation: shimmer 2s linear infinite;
      }
      .hover-grow { transition: transform 0.2s, box-shadow 0.2s; }
      .hover-grow:hover { transform: scale(1.03); box-shadow: 0 4px 20px rgba(99,102,241,0.2); }
      .speak-hover { cursor: pointer; position: relative; }
      .speak-hover::after {
        content: '🔊';
        position: absolute;
        top: 2px;
        right: 6px;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
      }
      .speak-hover:hover::after { opacity: 0.6; }
      .speaker-active {
        animation: speaker-pulse 0.6s ease-in-out infinite;
        color: #4f46e5 !important;
      }
      .speaker-ripple {
        position: relative;
        overflow: visible;
      }
      .speaker-ripple::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid #6366f1;
        animation: ripple 0.8s ease-out;
        pointer-events: none;
      }
    `}</style>
  );
}

export default function AssessmentPlayer() {
  const { user } = useAuth();
  const studentId = user?.id ?? '';
  const isTouchRef = useTouchDevice();

  const {
    session,
    currentSkill,
    currentItem,
    showFeedback,
    lastResponse,
    showHint,
    isPaused,
    isComplete,
    completionSummary,
    domainTransition,
    loading,
    error,
    startSession,
    submitAnswer,
    useHint,
    pauseSession,
    resumeSession,
    resumeExistingSession,
    goBack,
    skipItem,
    itemHistory,
  } = useAssessmentPlayer(studentId);

  // Derive item early so useEffects can safely reference it
  const item = currentItem?.item;
  const progress = currentItem?.progress;

  const [starsEarned, setStarsEarned] = useState(0);
  const [starAnimation, setStarAnimation] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('initial_placement');
  const [existingSessions, setExistingSessions] = useState<any[]>([]);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Warm-up phase state
  const [warmupPhase, setWarmupPhase] = useState(false);
  const [warmupItems, setWarmupItems] = useState<any[]>([]);
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [warmupAnswer, setWarmupAnswer] = useState<string | null>(null);
  const [warmupFeedback, setWarmupFeedback] = useState(false);
  const [showWarmupIntro, setShowWarmupIntro] = useState(false);
  const [needsWarmup, setNeedsWarmup] = useState(false);

  // Check for existing paused/in-progress sessions on load
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const { getStudentProfileId } = await import('../../services/students');
        const spId = await getStudentProfileId(studentId);
        if (!spId) { setCheckingExisting(false); return; }
        const { data } = await (await import('../../services/supabase')).supabase
          .from('assessment_sessions')
          .select('id, status, items_attempted, items_correct, started_at, updated_at')
          .eq('student_id', spId)
          .in('status', ['in_progress', 'paused'])
          .order('updated_at', { ascending: false })
          .limit(5);
        setExistingSessions(data || []);
        // Check if student needs warm-up (no prior schooling or low starting level)
        try {
          const { supabase } = await import('../../services/supabase');
          const { data: profile } = await supabase
            .from('student_profiles')
            .select('no_prior_schooling, starting_assessment_level')
            .eq('user_id', studentId)
            .single();
          if (profile?.no_prior_schooling || (profile?.starting_assessment_level != null && profile.starting_assessment_level <= 0)) {
            setNeedsWarmup(true);
            // Pre-fetch warm-up items
            const { data: wItems } = await supabase
              .from('assessment_items')
              .select('id, question_data, hint_text, explanation')
              .eq('is_warmup', true)
              .eq('is_active', true)
              .order('created_at');
            if (wItems && wItems.length > 0) setWarmupItems(wItems);
          }
        } catch (e) { console.error('Warm-up check failed:', e); }
      } catch (e) { console.error('Failed to check existing sessions:', e); }
      setCheckingExisting(false);
    })();
  }, [studentId]);

  // Track stars from correct answers
  useEffect(() => {
    if (lastResponse?.isCorrect) {
      setStarsEarned((prev) => prev + 1);
      setStarAnimation(true);
      setTimeout(() => setStarAnimation(false), 600);
    }
  }, [lastResponse]);

  // Auto-read question aloud when a new question loads
  useEffect(() => {
    if (item && !showFeedback) {
      const qText =
        item.questionData?.questionText ||
        item.questionData?.prompt ||
        item.audioPrompt ||
        '';
      const timer = setTimeout(() => {
        speakWithChoices(
          qText,
          item.questionData || {},
          item.questionType || 'multiple_choice'
        );
      }, 600);
      return () => { clearTimeout(timer); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
    }
  }, [item?.id]);

  // ---------- Error State (check BEFORE start screen so errors are visible) ----------
  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="py-3 px-6 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------- Start Screen (with resume detection) ----------
  if (!session && !loading && !isComplete) {
    if (checkingExisting) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <AnimationStyles />
          <div className="text-center bounce-in">
            <div className="text-6xl mb-4 pulse-soft">🧭</div>
            <p className="text-indigo-600 text-lg font-medium">Checking your progress...</p>
          </div>
        </div>
      );
    }

    const hasExisting = existingSessions.length > 0;
    const bestSession = hasExisting ? existingSessions[0] : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <AnimationStyles />
        <FloatingDecorations emojis={['⭐', '🌟', '🦋', '🌈', '🚀', '📚']} />
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-10 max-w-md w-full text-center relative z-10 bounce-in">
          {hasExisting ? (
            <>
              <div className="text-6xl mb-4 pulse-soft">👋</div>
              <h1 className="text-3xl font-bold text-indigo-700 mb-2">
                Welcome Back!
              </h1>
              <p className="text-gray-600 mb-4 text-lg">
                You have an adventure in progress!
              </p>
              <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-left">
                <div className="text-sm text-indigo-700">
                  <div className="flex justify-between mb-1">
                    <span>Questions answered:</span>
                    <span className="font-bold">{bestSession.items_attempted || 0}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Correct so far:</span>
                    <span className="font-bold text-green-600">{bestSession.items_correct || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-bold capitalize">{bestSession.status === 'in_progress' ? '📝 In Progress' : '⏸️ Paused'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => bestSession && resumeExistingSession(bestSession)}
                onMouseEnter={() => speak('Continue where you left off!')}
                className="w-full py-4 px-6 bg-green-500 text-white text-xl font-bold rounded-2xl
                           hover:bg-green-600 active:scale-95 transition-all shadow-lg mb-3"
              >
                ▶️ Continue Where I Left Off!
              </button>

              <button
                onClick={() => {
                  if (needsWarmup && warmupItems.length > 0) {
                    setShowWarmupIntro(true);
                  } else {
                    startSession(sessionType);
                  }
                }}
                onMouseEnter={() => speak('Start a brand new adventure')}
                className="w-full py-3 px-6 bg-gray-100 text-gray-600 font-medium rounded-2xl
                           hover:bg-gray-200 active:scale-95 transition-all text-sm"
              >
                🔄 Start Fresh Instead
              </button>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4 pulse-soft">🌟</div>
              <h1 className="text-3xl font-bold text-indigo-700 mb-2">
                My Learning Adventure
              </h1>
              <p className="text-gray-600 mb-8 text-lg">
                Let's see what you already know! There are no wrong answers — just do
                your best!
              </p>

              <button
                onClick={() => {
                  if (needsWarmup && warmupItems.length > 0) {
                    setShowWarmupIntro(true);
                  } else {
                    startSession(sessionType);
                  }
                }}
                className="w-full py-4 px-6 bg-indigo-600 text-white text-xl font-bold rounded-2xl
                           hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
              >
                🚀 Let's Go!
              </button>
            </>
          )}

          <button
            onClick={() => speak(hasExisting ? 'Welcome back! You can continue where you left off or start fresh.' : 'Let\'s see what you already know! There are no wrong answers, just do your best!')}
            className="mt-4 text-indigo-500 hover:text-indigo-700 flex items-center justify-center gap-2 mx-auto"
          >
            🔊 Read to me
          </button>
        </div>
      </div>
    );
  }


  // ---------- Warm-Up Intro Screen ----------
  if (showWarmupIntro && !warmupPhase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center p-6">
        <AnimationStyles />
        <FloatingDecorations emojis={['🌟', '🎈', '🎉', '🌈', '🦋', '✨']} />
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-10 max-w-md w-full text-center relative z-10 bounce-in">
          <div className="text-6xl mb-4 pulse-soft">🎪</div>
          <h1 className="text-3xl font-bold text-orange-600 mb-3">
            Let's Warm Up First!
          </h1>
          <p className="text-gray-600 mb-2 text-lg">
            Before your big adventure, let's try a few fun warm-up questions!
          </p>
          <p className="text-gray-500 mb-6">
            These don't count — they're just for fun! 🎈
          </p>
          <button
            onClick={() => {
              setShowWarmupIntro(false);
              setWarmupPhase(true);
              setWarmupIndex(0);
              setWarmupAnswer(null);
              setWarmupFeedback(false);
              setTimeout(() => {
                const q = warmupItems[0]?.question_data?.prompt || warmupItems[0]?.question_data?.question || '';
                speak('Here is a fun warm up question! ' + q);
              }, 500);
            }}
            className="w-full py-4 px-6 bg-orange-500 text-white text-xl font-bold rounded-2xl
                       hover:bg-orange-600 active:scale-95 transition-all shadow-lg mb-3"
          >
            🎯 I'm Ready!
          </button>
          <button
            onClick={() => {
              setShowWarmupIntro(false);
              startSession(sessionType);
            }}
            className="w-full py-3 px-6 bg-gray-100 text-gray-500 font-medium rounded-xl
                       hover:bg-gray-200 active:scale-95 transition-all text-sm"
          >
            Skip warm-up
          </button>
        </div>
      </div>
    );
  }

  // ---------- Warm-Up Question Screen ----------
  if (warmupPhase && warmupItems.length > 0) {
    const wItem = warmupItems[warmupIndex];
    const qData = wItem?.question_data || {};
    const options = qData.options || [];
    const correctAnswer = qData.correctAnswer;
    const questionText = qData.prompt || qData.question || 'Here is your question!';

    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center p-6">
        <AnimationStyles />
        <FloatingDecorations emojis={['⭐', '🎈', '🌟', '🎉']} />
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-lg w-full relative z-10 bounce-in">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4">
            {warmupItems.map((_: any, i: number) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all ${
                i < warmupIndex ? 'bg-green-400 scale-110' :
                i === warmupIndex ? 'bg-orange-400 scale-125 pulse-soft' : 'bg-gray-200'
              }`} />
            ))}
          </div>

          <div className="text-center mb-2">
            <span className="text-sm font-medium text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
              ✨ Warm-Up {warmupIndex + 1} of {warmupItems.length}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 text-center mt-4 mb-6">
            {questionText}
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {options.map((opt: string, i: number) => {
              const isSelected = warmupAnswer === opt;
              const isCorrect = opt === correctAnswer;
              let btnClass = 'py-4 px-4 rounded-2xl text-lg font-bold transition-all border-2 ';
              if (warmupFeedback) {
                if (isCorrect) btnClass += 'bg-green-100 border-green-400 text-green-700 scale-105';
                else if (isSelected && !isCorrect) btnClass += 'bg-red-50 border-red-300 text-red-400';
                else btnClass += 'bg-gray-50 border-gray-200 text-gray-400';
              } else if (isSelected) {
                btnClass += 'bg-indigo-100 border-indigo-400 text-indigo-700 scale-105';
              } else {
                btnClass += 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 active:scale-95';
              }
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (warmupFeedback) return;
                    setWarmupAnswer(opt);
                    setWarmupFeedback(true);
                    if (opt === correctAnswer) {
                      speak(wItem.explanation || 'Great job! That is correct!');
                    } else {
                      speak('Good try! The answer is ' + correctAnswer + '. ' + (wItem.explanation || ''));
                    }
                  }}
                  onMouseEnter={() => !warmupFeedback && speak(opt)}
                  className={btnClass}
                  disabled={warmupFeedback}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {warmupFeedback && (
            <div className={`text-center p-4 rounded-2xl mb-4 bounce-in ${
              warmupAnswer === correctAnswer ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <div className="text-3xl mb-2">
                {warmupAnswer === correctAnswer ? '🌟' : '💪'}
              </div>
              <p className="text-lg font-medium">
                {warmupAnswer === correctAnswer
                  ? (wItem.explanation || 'Amazing! You got it! 🎉')
                  : `Good try! The answer is ${correctAnswer}. ${wItem.explanation || ''}`}
              </p>
            </div>
          )}

          {warmupFeedback && (
            <button
              onClick={() => {
                if (warmupIndex + 1 >= warmupItems.length) {
                  // Warm-up complete — start real assessment
                  setWarmupPhase(false);
                  speak('Great warm up! Now let us start your learning adventure!');
                  setTimeout(() => startSession(sessionType), 1500);
                } else {
                  setWarmupIndex(warmupIndex + 1);
                  setWarmupAnswer(null);
                  setWarmupFeedback(false);
                  setTimeout(() => {
                    const nextQ = warmupItems[warmupIndex + 1]?.question_data?.prompt ||
                                  warmupItems[warmupIndex + 1]?.question_data?.question || '';
                    speak(nextQ);
                  }, 400);
                }
              }}
              className="w-full py-4 px-6 bg-orange-500 text-white text-xl font-bold rounded-2xl
                         hover:bg-orange-600 active:scale-95 transition-all shadow-lg"
            >
              {warmupIndex + 1 >= warmupItems.length ? '🚀 Start My Adventure!' : '➡️ Next Question!'}
            </button>
          )}

          <button
            onClick={() => speak(questionText)}
            className="mt-3 text-orange-500 hover:text-orange-700 flex items-center justify-center gap-2 mx-auto text-sm"
          >
            🔊 Read to me
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <AnimationStyles />
        <div className="text-center bounce-in">
          <div className="text-6xl mb-4 pulse-soft">🧭</div>
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-indigo-600 text-lg font-medium">
            Getting your adventure ready...
          </p>
        </div>
      </div>
    );
  }

  // ---------- Domain Transition Screen ----------
  if (domainTransition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center p-6">
        <AnimationStyles />
        <FloatingDecorations emojis={['🎉', '🌟', '✨', '🎊', '💫', '🌈']} />
        <div className="text-center bounce-in relative z-10">
          <div className="text-7xl mb-6 pulse-soft">🎉</div>
          <h2 className="text-3xl font-bold text-orange-600 mb-3">
            Great work!
          </h2>
          <p className="text-xl text-gray-700">
            Now let's explore{' '}
            <span className="font-bold text-orange-700">{domainTransition}</span>!
          </p>
        </div>
      </div>
    );
  }


  // Auto-generate improvement Flight Plan from wrong answers when assessment completes
  useEffect(() => {
    if (!isComplete || !studentId) return;
    (async () => {
      try {
        const { getStudentProfileId } = await import('../../services/students');
        const { supabase } = await import('../../services/supabase');
        const spId = await getStudentProfileId(studentId);
        if (!spId) return;
        const { data, error } = await supabase.rpc('generate_improvement_playlist', {
          p_student_profile_id: spId,
          p_auth_user_id: studentId
        });
        if (error) console.error('Failed to generate improvement playlist:', error);
        else if (data && data.length > 0) {
          const inserted = data.filter((d: any) => d.inserted);
          console.log(`📋 Flight Plan updated: ${inserted.length} improvement skills added from assessment errors`);
        }
      } catch (e) { console.error('Improvement playlist error:', e); }
    })();
  }, [isComplete, studentId]);

  // ---------- Completion Screen ----------
  if (isComplete) {
    const mastered = completionSummary?.mastered ?? 0;
    const total = completionSummary?.totalSkillsAssessed ?? 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-teal-50 flex items-center justify-center p-6">
        <AnimationStyles />
        <FloatingDecorations emojis={['🌟', '⭐', '🏆', '🎉', '✨', '🦄', '🌈', '💫']} />
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-10 max-w-lg w-full text-center relative z-10 bounce-in">
          <div className="text-7xl mb-4 pulse-soft">🏆</div>
          <h1 className="text-3xl font-bold text-green-700 mb-2">
            You did it!
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            You answered {session?.items_attempted ?? 0} questions and earned{' '}
            <span className="font-bold text-yellow-600">{starsEarned} stars</span>!
          </p>

          {total > 0 && (
            <div className="bg-green-50 rounded-2xl p-6 mb-6 text-left">
              <h3 className="font-bold text-green-800 mb-3 text-lg">
                ⭐ You're a superstar at:
              </h3>
              <p className="text-green-700">
                {mastered} out of {total} skills mastered!
              </p>
              {completionSummary!.needsPractice > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold text-blue-800 mb-1">
                    🎯 Next on your adventure:
                  </h3>
                  <p className="text-blue-600">
                    {completionSummary!.needsPractice} skills to practice
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confetti-style stars */}
          <div className="flex justify-center gap-2 mb-6 text-3xl">
            {'⭐'.repeat(Math.min(starsEarned, 10))}
          </div>

          <button
            onClick={() => window.history.back()}
            className="w-full py-4 px-6 bg-green-600 text-white text-xl font-bold rounded-2xl
                       hover:bg-green-700 active:scale-95 transition-all shadow-lg"
          >
            🎓 Show my teacher!
          </button>
        </div>
      </div>
    );
  }

  // ---------- Paused Screen ----------
  if (isPaused) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⏸️</div>
          <h2 className="text-2xl font-bold text-indigo-700 mb-4">
            Taking a break!
          </h2>
          <p className="text-gray-600 mb-8">
            Your adventure is saved. Come back when you're ready!
          </p>
          <button
            onClick={resumeSession}
            className="w-full py-4 px-6 bg-indigo-600 text-white text-xl font-bold rounded-2xl
                       hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
          >
            ▶️ Keep Going!
          </button>
        </div>
      </div>
    );
  }

  // ---------- Error State ----------
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="py-3 px-6 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------- Main Question View ----------
  const skillsChecked = session?.skills_assessed ?? 0;
  const totalTarget = session?.target_skill_ids?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <AnimationStyles />
      <FloatingDecorations emojis={getDomainEmojis(currentSkill?.domainName || '')} />
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-indigo-700 flex items-center gap-2">
              🌟 My Learning Adventure
            </h1>
            {currentSkill?.domainName && (
              <p className="text-sm text-gray-500">
                {currentSkill.domainName}
                {currentSkill.skillName && ` — ${currentSkill.skillName}`}
              </p>
            )}
          </div>
          <button
            onClick={pauseSession}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            aria-label="Pause"
          >
            <span className="text-2xl">⏸</span>
          </button>
        </div>

        {/* Progress Bar */}
        {totalTarget > 0 && (
          <div className="max-w-2xl mx-auto mt-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (skillsChecked / totalTarget) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {skillsChecked} of {totalTarget} skills checked
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Question Area */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Feedback Overlay */}
        {showFeedback && lastResponse && (
          <FeedbackOverlay response={lastResponse} />
        )}

        {/* Question Content */}
        {item && !showFeedback && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg p-8 relative z-10 slide-up">
            {/* Audio button — reads question AND choices */}
            <button
              onClick={() => {
                const questionText =
                  item.questionData?.questionText ||
                  item.questionData?.prompt ||
                  'Listen to the question';
                speakWithChoices(
                  item.audioPrompt || questionText,
                  item.questionData || {},
                  item.questionType || 'multiple_choice'
                );
              }}
              className="mb-6 flex items-center gap-3 px-5 py-3 bg-indigo-50 hover:bg-indigo-100
                         border-2 border-indigo-200 hover:border-indigo-400 rounded-2xl
                         text-indigo-600 hover:text-indigo-800 transition-all group
                         active:scale-95 shadow-sm hover:shadow-md"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform animate-pulse">🔊</span>
              <span className="text-base font-bold">Hear Question</span>
            </button>

            {/* Render the appropriate question type — key forces fresh state per question */}
            <QuestionRenderer
              key={item.id}
              item={item}
              questionType={item.questionType}
              onAnswer={(response, isCorrect) => submitAnswer(response, isCorrect)}
              showHint={showHint}
              disabled={showFeedback}
              isTouchRef={isTouchRef}
            />

            {/* Help Me Learn button */}
            {(item.hintText || (item as any).explanation) && !showHint && (
              <button
                onClick={() => { useHint(); }}
                onMouseEnter={() => speakOption('Help me learn this')}
                className="mt-6 flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400
                           hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl
                           shadow-md hover:shadow-lg transform hover:scale-105 transition-all text-lg"
              >
                🐧 Help Me Learn This!
              </button>
            )}
            {showHint && (
              <TeachingBubble
                hintText={item.hintText || ''}
                explanation={(item as any).explanation || ''}
                skillName={item.skillName || ''}
              />
            )}
          </div>
        )}

        {/* Back & Skip Navigation */}
        {item && !showFeedback && (
          <div className="flex items-center justify-between mt-6 relative z-10">
            {/* Back Button */}
            {itemHistory && itemHistory.length > 0 ? (
              <button
                onClick={() => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); goBack(); }}
                onMouseEnter={() => speakOption('Go back')}
                className="flex items-center gap-2 px-5 py-3 bg-white/90 hover:bg-gray-100
                           border-2 border-gray-300 hover:border-indigo-400 rounded-2xl
                           text-gray-600 hover:text-indigo-700 transition-all
                           active:scale-95 shadow-sm hover:shadow-md font-bold text-base"
              >
                <span className="text-xl">⬅️</span> Go Back
              </button>
            ) : (
              <div />
            )}

            {/* Skip Button */}
            <button
              onClick={() => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); skipItem(); }}
              onMouseEnter={() => speakOption("Skip this one")}
              className="flex items-center gap-2 px-5 py-3 bg-white/90 hover:bg-orange-50
                         border-2 border-orange-300 hover:border-orange-400 rounded-2xl
                         text-orange-600 hover:text-orange-700 transition-all
                         active:scale-95 shadow-sm hover:shadow-md font-bold text-base"
            >
              Skip This One <span className="text-xl">⏭️</span>
            </button>
          </div>
        )}

        {/* Take a Break Button — always visible during questions */}
        {item && !showFeedback && (
          <div className="flex justify-center mt-4 relative z-10">
            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                speak('Taking a break! Your progress is saved. Come back anytime!');
                setTimeout(() => pauseSession(), 500);
              }}
              onMouseEnter={() => speakOption('Take a break and come back later')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100
                         border-2 border-blue-200 hover:border-blue-300 rounded-2xl
                         text-blue-600 hover:text-blue-700 transition-all
                         active:scale-95 shadow-sm font-semibold text-base"
            >
              <span className="text-xl">😴</span> Take a Break — Come Back Later
            </button>
          </div>
        )}
      </div>

      {/* Star Counter */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 py-3 px-4 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
          <span
            className={`text-2xl transition-transform ${
              starAnimation ? 'scale-150' : 'scale-100'
            }`}
          >
            ⭐
          </span>
          <span className="text-lg font-bold text-yellow-600">
            Stars earned: {starsEarned}
          </span>
          {starsEarned >= 3 && (
            <span className="text-orange-500 font-bold ml-1">🔥</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// Feedback Overlay
// ==========================================================
function FeedbackOverlay({ response }: { response: ProcessResponseResult }) {
  const isCorrect = response.isCorrect;

  useEffect(() => {
    // Read the congrats/encourage message AND the explanation so the child hears the full answer
    const msg = isCorrect ? randomMessage(CORRECT_MESSAGES) : randomMessage(INCORRECT_MESSAGES);
    let fullMsg = msg;
    if (response.explanation) {
      fullMsg += '. ' + response.explanation;
    }
    // Cancel any lingering speech, then read the full feedback
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speak(fullMsg);
  }, [isCorrect, response.explanation]);

  return (
    <div
      className={`rounded-3xl p-10 text-center ${
        isCorrect
          ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300'
          : 'bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-orange-300'
      }`}
    >
      <div className="text-6xl mb-4">
        {isCorrect ? '🌟' : '🤗'}
      </div>
      <h2
        className={`text-2xl font-bold mb-2 ${
          isCorrect ? 'text-green-700' : 'text-orange-700'
        }`}
      >
        {isCorrect ? randomMessage(CORRECT_MESSAGES) : randomMessage(INCORRECT_MESSAGES)}
      </h2>
      {response.explanation && (
        <p className="text-gray-600 mt-3">{response.explanation}</p>
      )}
    </div>
  );
}


// ==========================================================
// Data Normalizer — transforms DB question_data to renderer format
// ==========================================================
function normalizeQuestionData(qd: Record<string, any>, questionType: string): Record<string, any> {
  const prompt = qd.prompt || qd.questionText || '';

  switch (questionType) {
    case 'multiple_choice': {
      // DB: options: [{text, isCorrect}] → flat options[] + correctAnswer
      const rawOpts = qd.options || [];
      if (rawOpts.length > 0 && typeof rawOpts[0] === 'object') {
        return {
          ...qd,
          questionText: prompt,
          options: rawOpts.map((o: any) => o.text || o.label || o),
          correctAnswer: (rawOpts.find((o: any) => o.isCorrect) || {}).text || 
                         (rawOpts.find((o: any) => o.isCorrect) || {}).label || '',
        };
      }
      return { ...qd, questionText: prompt };
    }
    case 'tap_select': {
      // DB: items: [{id, label, isCorrect}] → options[] + correctAnswers[]
      const items = qd.items || [];
      return {
        ...qd,
        questionText: prompt,
        options: items.map((i: any) => i.label || i.text || i.id),
        correctAnswers: items.filter((i: any) => i.isCorrect).map((i: any) => i.label || i.text || i.id),
      };
    }
    case 'counting': {
      // DB: {objectDescription, correctCount, maxCount} → {objects: emoji[], correctCount}
      const desc = qd.objectDescription || '';
      const count = qd.correctCount || 0;
      // Generate emoji objects based on description
      let emoji = '🔵';
      if (desc.toLowerCase().includes('ball')) emoji = '⚽';
      else if (desc.toLowerCase().includes('star')) emoji = '⭐';
      else if (desc.toLowerCase().includes('apple')) emoji = '🍎';
      else if (desc.toLowerCase().includes('flower')) emoji = '🌸';
      else if (desc.toLowerCase().includes('fish')) emoji = '🐟';
      else if (desc.toLowerCase().includes('bird')) emoji = '🐦';
      else if (desc.toLowerCase().includes('cat')) emoji = '🐱';
      else if (desc.toLowerCase().includes('heart')) emoji = '❤️';
      else if (desc.toLowerCase().includes('block')) emoji = '🧱';
      else if (desc.toLowerCase().includes('cookie')) emoji = '🍪';
      else if (desc.toLowerCase().includes('pencil')) emoji = '✏️';
      else if (desc.toLowerCase().includes('book')) emoji = '📚';
      else if (desc.toLowerCase().includes('leaf')) emoji = '🍃';
      else if (desc.toLowerCase().includes('button')) emoji = '🔘';
      const objects = Array.from({ length: count }, () => emoji);
      return {
        ...qd,
        questionText: prompt,
        objects,
        correctCount: count,
      };
    }
    case 'sequence': {
      // DB: items: [{id, label, correctPosition}] → items[] + correctOrder[]
      const seqItems = qd.items || [];
      const sorted = [...seqItems].sort((a: any, b: any) => 
        (a.correctPosition ?? 0) - (b.correctPosition ?? 0)
      );
      return {
        ...qd,
        questionText: prompt,
        items: seqItems.map((i: any) => i.label || i.text || i.id),
        correctOrder: sorted.map((i: any) => i.label || i.text || i.id),
      };
    }
    case 'fill_blank': {
      // DB: {blanks: [{options, position, correctAnswer}], prompt} → {sentence, options, correctAnswer}
      const blanks = qd.blanks || [];
      const firstBlank = blanks[0] || {};
      return {
        ...qd,
        questionText: prompt,
        sentence: prompt,
        options: firstBlank.options || [],
        correctAnswer: firstBlank.correctAnswer || '',
      };
    }
    case 'matching': {
      // DB format already matches: {pairs: [{left, right}]}
      return { ...qd, questionText: prompt };
    }
    case 'drag_drop': {
      // DB: draggables: [{id, label}], targets: [{id, label, accepts}]
      const drags = (qd.draggables || []).map((d: any) => d.label || d.id);
      const tgts = (qd.targets || []).map((t: any) => t.label || t.id);
      // Build correct mapping
      const correctMapping: Record<string, string> = {};
      for (const target of (qd.targets || [])) {
        for (const accepted of (target.accepts || [])) {
          const drag = (qd.draggables || []).find((d: any) => d.id === accepted);
          if (drag) {
            correctMapping[drag.label || drag.id] = target.label || target.id;
          }
        }
      }
      return {
        ...qd,
        questionText: prompt,
        draggables: drags,
        targets: tgts,
        correctMapping,
      };
    }
    case 'teacher_observed': {
      return {
        ...qd,
        questionText: prompt,
        instructions: prompt,
      };
    }
    case 'audio_response': {
      return {
        ...qd,
        questionText: prompt,
        instructions: prompt,
        audioPrompt: prompt,
      };
    }
    default:
      return { ...qd, questionText: prompt };
  }
}

// ==========================================================
// Question Renderer Router
// ==========================================================
interface RendererProps {
  item: NonNullable<NextItemResult['item']>;
  questionType: QuestionType;
  onAnswer: (response: Record<string, any>, isCorrect: boolean) => void;
  showHint: boolean;
  disabled: boolean;
  isTouchRef: React.MutableRefObject<boolean>;
}


// ---------- Teaching Bubble (replaces simple hint) ----------
function TeachingBubble({ hintText, explanation, skillName }: { hintText: string; explanation: string; skillName: string }) {
  useEffect(() => {
    // Auto-read the teaching content when it appears
    let teachText = '';
    if (hintText && explanation) {
      teachText = `Here\'s a tip! ${hintText}. And here\'s what you need to know: ${explanation}`;
    } else if (hintText) {
      teachText = `Here\'s a tip! ${hintText}`;
    } else if (explanation) {
      teachText = `Let me teach you! ${explanation}`;
    }
    if (teachText) speak(teachText);
  }, [hintText, explanation]);

  return (
    <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 shadow-lg relative">
      {/* Penguin icon */}
      <div className="absolute -top-4 -left-2 text-3xl">🐧</div>
      <div className="ml-6">
        <p className="text-amber-900 font-bold text-lg mb-2">
          💡 Let me help you!
        </p>
        {hintText && (
          <p className="text-amber-800 text-base mb-2">
            👉 <strong>Tip:</strong> {hintText}
          </p>
        )}
        {explanation && (
          <p className="text-amber-700 text-base bg-white/60 rounded-xl p-3 mt-2">
            📖 <strong>Here&apos;s what you need to know:</strong> {explanation}
          </p>
        )}
        {!hintText && !explanation && (
          <p className="text-amber-700 text-base">
            Take your time and try your best! You can skip this one if you&apos;re not sure. 😊
          </p>
        )}
      </div>
      {/* Re-read button */}
      <button
        onClick={() => {
          const text = hintText && explanation
            ? `Here\'s a tip! ${hintText}. And here\'s what you need to know: ${explanation}`
            : hintText || explanation || 'Take your time!';
          speak(text);
        }}
        className="mt-3 ml-6 text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1"
      >
        🔊 Read it again
      </button>
    </div>
  );
}


function QuestionRenderer({ item, questionType, onAnswer, showHint, disabled, isTouchRef }: RendererProps) {
  // Normalize the DB data format to what renderers expect
  const normalizedItem = {
    ...item,
    questionData: normalizeQuestionData(item.questionData || {}, questionType),
  };
  const nItem = normalizedItem as typeof item;

  switch (questionType) {
    case 'multiple_choice':
      return <MultipleChoiceRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
    case 'tap_select':
      return <TapSelectRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
    case 'counting':
      return <CountingRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
    case 'fill_blank':
      return <FillBlankRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
    case 'matching':
      return <MatchingRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
    case 'sequence':
      return <SequenceRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
    case 'drag_drop':
      return <DragDropRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
    case 'teacher_observed':
      return <TeacherObservedRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'audio_response':
      return <AudioResponseRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    default:
      return <MultipleChoiceRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} isTouchRef={isTouchRef} />;
  }
}

// ==========================================================
// Question Type Renderers — ENHANCED
// "Tap to Hear, Tap Again to Select" pattern for touch devices
// ==========================================================

interface QProps {
  item: NonNullable<NextItemResult['item']>;
  onAnswer: (response: Record<string, any>, isCorrect: boolean) => void;
  disabled: boolean;
  isTouchRef: React.MutableRefObject<boolean>;
}

interface QPropsSimple {
  item: NonNullable<NextItemResult['item']>;
  onAnswer: (response: Record<string, any>, isCorrect: boolean) => void;
  disabled: boolean;
}

/** Enhanced Speaker icon button — pulses indigo when active, ripple on tap */
function SpeakerIcon({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' }) {
  const [reading, setReading] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const handleRead = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (reading) return;
    setReading(true);
    setShowRipple(true);
    speakOption(text);
    setTimeout(() => setShowRipple(false), 800);
    setTimeout(() => setReading(false), 1500);
  };
  return (
    <button
      onClick={handleRead}
      onTouchEnd={handleRead}
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 relative
        ${reading ? 'text-indigo-600 speaker-active' : 'text-gray-400 hover:text-indigo-500'}
        ${showRipple ? 'speaker-ripple' : ''}
        transition-colors ${size === 'sm' ? 'p-0.5' : 'p-1'}`}
      aria-label={`Read aloud: ${text}`}
      type="button"
    >
      <svg className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
      </svg>
    </button>
  );
}

/** Small pulsing speaker indicator shown when an option is being read */
function ReadingSpeakerBadge() {
  return (
    <span className="inline-flex items-center speaker-active text-indigo-600">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
      </svg>
    </span>
  );
}


/** Large, friendly multiple-choice buttons — with "tap to hear, tap again to select" */
function MultipleChoiceRenderer({ item, onAnswer, disabled, isTouchRef }: QProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const [readingOption, setReadingOption] = useState<string | null>(null);
  const [lastReadOption, setLastReadOption] = useState<string | null>(null);
  const touchedRef = useRef(false);
  const qd = item.questionData;
  const options: string[] = qd.options || [];
  const correctAnswer = qd.correctAnswer ?? qd.answer;
  const questionText = qd.questionText || qd.prompt || '';
  const displayContent = qd.display || qd.stimulus;

  // Reset on new item
  useEffect(() => { submittedRef.current = false; setProcessing(null); setReadingOption(null); setLastReadOption(null); }, [item.id]);

  const doSelect = (opt: string) => {
    if (disabled || submittedRef.current || processing) return;
    submittedRef.current = true;
    setProcessing(opt);
    setReadingOption(null);
    const isCorrect = opt === correctAnswer;
    setTimeout(() => onAnswer({ selected: opt }, isCorrect), 120);
  };

  const handleTouchEnd = (e: React.TouchEvent, opt: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submittedRef.current || processing) return;
    if (lastReadOption !== opt) {
      // First tap: read aloud, don't submit
      setReadingOption(opt);
      setLastReadOption(opt);
      speak(opt);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      // Second tap: submit
      doSelect(opt);
    }
  };

  const handleClick = (opt: string) => {
    // If this click was triggered by a touch, ignore (touchEnd already handled it)
    if (touchedRef.current) { touchedRef.current = false; return; }
    doSelect(opt);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">{questionText}</p>
      {displayContent && (
        <div className="text-5xl font-bold text-indigo-700 text-center my-6 p-6 bg-indigo-50 rounded-2xl">
          {displayContent}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {options.map((opt, idx) => {
          const isBeingRead = readingOption === opt;
          const wasRead = lastReadOption === opt && !processing;
          return (
            <button
              key={idx}
              onClick={() => handleClick(opt)}
              onTouchEnd={(e) => handleTouchEnd(e, opt)}
              onMouseEnter={() => { if (!processing && !isTouchRef.current) speakOption(opt); }}
              onFocus={() => { if (!processing) speakOption(opt); }}
              disabled={disabled || (!!processing && processing !== opt)}
              className={`min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 transition-all
                         flex items-center justify-between gap-2
                         ${processing === opt
                           ? 'bg-indigo-100 border-indigo-500 scale-95'
                           : isBeingRead
                           ? 'bg-yellow-100 border-yellow-400 shadow-md'
                           : wasRead
                           ? 'bg-yellow-50 border-yellow-300'
                           : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-md active:scale-95'
                         }
                         disabled:opacity-50 text-gray-800 shadow-sm`}
            >
              <span className="flex-1 text-left">{opt}</span>
              {processing === opt ? (
                <span className="animate-spin text-indigo-600">⏳</span>
              ) : isBeingRead ? (
                <ReadingSpeakerBadge />
              ) : (
                <SpeakerIcon text={opt} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tap to select multiple correct answers — with "tap to hear, tap again to toggle" */
function TapSelectRenderer({ item, onAnswer, disabled, isTouchRef }: QProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const [readingOption, setReadingOption] = useState<string | null>(null);
  const [lastReadOption, setLastReadOption] = useState<string | null>(null);
  const touchedRef = useRef(false);
  const qd = item.questionData;
  const options: string[] = qd.options || [];
  const correctAnswers: string[] = qd.correctAnswers || [];
  const questionText = qd.questionText || qd.prompt || '';

  useEffect(() => { submittedRef.current = false; setSubmitting(false); setSelected([]); setReadingOption(null); setLastReadOption(null); }, [item.id]);

  const toggle = (opt: string) => {
    if (disabled || submitting) return;
    setReadingOption(null);
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]
    );
  };

  const handleTouchEnd = (e: React.TouchEvent, opt: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submitting) return;
    if (lastReadOption !== opt) {
      setReadingOption(opt);
      setLastReadOption(opt);
      speak(opt);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      toggle(opt);
      setLastReadOption(null);
    }
  };

  const handleClick = (opt: string) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    toggle(opt);
  };

  const handleSubmit = () => {
    if (submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    const isCorrect =
      selected.length === correctAnswers.length &&
      selected.every((s) => correctAnswers.includes(s));
    setTimeout(() => onAnswer({ selected }, isCorrect), 120);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">{questionText}</p>
      <p className="text-sm text-gray-500 mb-4">Tap all that are correct!</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, idx) => {
          const isBeingRead = readingOption === opt;
          return (
            <button
              key={idx}
              onClick={() => handleClick(opt)}
              onTouchEnd={(e) => handleTouchEnd(e, opt)}
              onMouseEnter={() => { if (!isTouchRef.current) speakOption(opt); }}
              onFocus={() => speakOption(opt)}
              disabled={disabled || submitting}
              className={`min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 transition-all
                         flex items-center justify-between gap-2 active:scale-95 disabled:opacity-50
                         ${isBeingRead
                           ? 'bg-yellow-100 border-yellow-400 text-gray-800 shadow-md'
                           : selected.includes(opt)
                           ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                           : 'bg-white border-gray-200 text-gray-800 hover:bg-indigo-50'
                         }`}
            >
              <span className="flex-1 text-left">
                {selected.includes(opt) && '✓ '}{opt}
              </span>
              {isBeingRead ? <ReadingSpeakerBadge /> : <SpeakerIcon text={opt} />}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          onClick={handleSubmit}
          onTouchEnd={(e) => { e.preventDefault(); handleSubmit(); }}
          disabled={disabled || submitting}
          className="mt-6 w-full py-4 bg-indigo-600 text-white text-lg font-bold rounded-2xl
                     hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50
                     flex items-center justify-center gap-2"
        >
          {submitting ? <><span className="animate-spin">⏳</span> Checking...</> : 'Check my answer!'}
        </button>
      )}
    </div>
  );
}

/** Count visual objects — with "tap to hear number, tap again to select" */
function CountingRenderer({ item, onAnswer, disabled, isTouchRef }: QProps) {
  const [processing, setProcessing] = useState<number | null>(null);
  const submittedRef = useRef(false);
  const [readingOption, setReadingOption] = useState<number | null>(null);
  const [lastReadOption, setLastReadOption] = useState<number | null>(null);
  const touchedRef = useRef(false);
  const qd = item.questionData;
  const objects: string[] = qd.objects || [];
  const correctCount = qd.correctCount ?? objects.length;
  const questionText = qd.questionText || 'How many do you see?';

  useEffect(() => { submittedRef.current = false; setProcessing(null); setReadingOption(null); setLastReadOption(null); }, [item.id]);

  const doSelect = (num: number) => {
    if (disabled || submittedRef.current || processing !== null) return;
    submittedRef.current = true;
    setProcessing(num);
    setReadingOption(null);
    setTimeout(() => onAnswer({ count: num }, num === correctCount), 120);
  };

  const handleTouchEnd = (e: React.TouchEvent, num: number) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submittedRef.current || processing !== null) return;
    if (lastReadOption !== num) {
      setReadingOption(num);
      setLastReadOption(num);
      speak(String(num));
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      doSelect(num);
    }
  };

  const handleClick = (num: number) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    doSelect(num);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">{questionText}</p>
      <div className="flex flex-wrap gap-3 justify-center p-6 bg-blue-50 rounded-2xl mb-6">
        {objects.map((obj, idx) => (
          <span key={idx} className="text-4xl">{obj}</span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {Array.from({ length: Math.min(10, correctCount + 3) }, (_, i) => i + 1).map(
          (num) => {
            const isBeingRead = readingOption === num;
            return (
              <button
                key={num}
                onClick={() => handleClick(num)}
                onTouchEnd={(e) => handleTouchEnd(e, num)}
                onMouseEnter={() => { if (!processing && !isTouchRef.current) speakOption(String(num)); }}
                onFocus={() => { if (!processing) speakOption(String(num)); }}
                disabled={disabled || (processing !== null && processing !== num)}
                className={`w-14 h-14 text-xl font-bold rounded-2xl border-2 transition-all
                           active:scale-95 disabled:opacity-50
                           ${processing === num
                             ? 'bg-indigo-500 border-indigo-600 text-white scale-95'
                             : isBeingRead
                             ? 'bg-yellow-100 border-yellow-400 text-gray-800 shadow-md'
                             : 'bg-white border-gray-200 text-gray-800 hover:bg-indigo-50'
                           }`}
              >
                {processing === num ? '⏳' : isBeingRead ? <>{num} <span className="text-xs">🔊</span></> : num}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}

/** Fill in the blank — with "tap to hear, tap again to select" for option buttons */
function FillBlankRenderer({ item, onAnswer, disabled, isTouchRef }: QProps) {
  const [value, setValue] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const [readingOption, setReadingOption] = useState<string | null>(null);
  const [lastReadOption, setLastReadOption] = useState<string | null>(null);
  const touchedRef = useRef(false);
  const qd = item.questionData;
  const sentence = qd.sentence || qd.questionText || '';
  const options: string[] = qd.options || [];
  const correctAnswer = qd.correctAnswer ?? qd.answer;

  useEffect(() => { submittedRef.current = false; setProcessing(null); setValue(''); setReadingOption(null); setLastReadOption(null); }, [item.id]);

  const doSelect = (opt: string) => {
    if (disabled || submittedRef.current || processing) return;
    submittedRef.current = true;
    setProcessing(opt);
    setReadingOption(null);
    setValue(opt);
    setTimeout(() => onAnswer({ answer: opt }, opt === correctAnswer), 120);
  };

  const handleTouchEnd = (e: React.TouchEvent, opt: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submittedRef.current || processing) return;
    if (lastReadOption !== opt) {
      setReadingOption(opt);
      setLastReadOption(opt);
      speak(opt);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      doSelect(opt);
    }
  };

  const handleClick = (opt: string) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    doSelect(opt);
  };

  const handleTextSubmit = () => {
    if (disabled || !value || submittedRef.current) return;
    submittedRef.current = true;
    setProcessing(value);
    setTimeout(() => onAnswer({ answer: value }, value === correctAnswer), 120);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">Fill in the blank:</p>
      <p className="text-lg text-gray-700 mb-6 bg-gray-50 rounded-2xl p-4">
        {sentence.replace('___', '______')}
      </p>
      {options.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt, idx) => {
            const isBeingRead = readingOption === opt;
            return (
              <button
                key={idx}
                onClick={() => handleClick(opt)}
                onTouchEnd={(e) => handleTouchEnd(e, opt)}
                onMouseEnter={() => { if (!processing && !isTouchRef.current) speakOption(opt); }}
                onFocus={() => { if (!processing) speakOption(opt); }}
                disabled={disabled || (!!processing && processing !== opt)}
                className={`min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 transition-all
                           flex items-center justify-between gap-2
                           ${processing === opt
                             ? 'bg-indigo-100 border-indigo-500 scale-95'
                             : isBeingRead
                             ? 'bg-yellow-100 border-yellow-400 shadow-md'
                             : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-400 active:scale-95'
                           }
                           disabled:opacity-50`}
              >
                <span className="flex-1 text-left">{opt}</span>
                {processing === opt ? (
                  <span className="animate-spin text-indigo-600">⏳</span>
                ) : isBeingRead ? (
                  <ReadingSpeakerBadge />
                ) : (
                  <SpeakerIcon text={opt} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled || !!processing}
            className="flex-1 text-xl p-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-400 outline-none"
            placeholder="Type your answer..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleTextSubmit(); }}
          />
          <button
            onClick={handleTextSubmit}
            onTouchEnd={(e) => { e.preventDefault(); handleTextSubmit(); }}
            disabled={disabled || !value || !!processing}
            className="py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl
                       hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50
                       flex items-center gap-2"
          >
            {processing ? <span className="animate-spin">⏳</span> : '✓'}
          </button>
        </div>
      )}
    </div>
  );
}

/** Simplified matching: tap pairs — with "tap to hear" */
function MatchingRenderer({ item, onAnswer, disabled, isTouchRef }: QProps) {
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const [readingOption, setReadingOption] = useState<string | null>(null);
  const [lastReadOption, setLastReadOption] = useState<string | null>(null);
  const touchedRef = useRef(false);
  const qd = item.questionData;
  const pairs: { left: string; right: string }[] = qd.pairs || [];
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const lefts = pairs.map((p) => p.left);
  const [shuffledRights] = useState(() => pairs.map((p) => p.right).sort(() => Math.random() - 0.5));

  useEffect(() => { submittedRef.current = false; setSubmitting(false); setMatched({}); setSelectedLeft(null); setReadingOption(null); setLastReadOption(null); }, [item.id]);

  const doLeftClick = (left: string) => {
    if (disabled || submitting) return;
    setSelectedLeft(left);
    setReadingOption(null);
    speakOption(left);
  };

  const handleLeftTouchEnd = (e: React.TouchEvent, left: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submitting) return;
    if (lastReadOption !== left) {
      setReadingOption(left);
      setLastReadOption(left);
      speak(left);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      doLeftClick(left);
      setLastReadOption(null);
    }
  };

  const handleLeftClick = (left: string) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    doLeftClick(left);
  };

  const doRightClick = (right: string) => {
    if (disabled || !selectedLeft || submitting) return;
    setReadingOption(null);
    speakOption(right);
    const updated = { ...matched, [selectedLeft]: right };
    setMatched(updated);
    setSelectedLeft(null);

    if (Object.keys(updated).length === pairs.length) {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const allCorrect = pairs.every((p) => updated[p.left] === p.right);
      setTimeout(() => onAnswer({ matches: updated }, allCorrect), 200);
    }
  };

  const handleRightTouchEnd = (e: React.TouchEvent, right: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submitting) return;
    if (lastReadOption !== right) {
      setReadingOption(right);
      setLastReadOption(right);
      speak(right);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      doRightClick(right);
      setLastReadOption(null);
    }
  };

  const handleRightClick = (right: string) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    doRightClick(right);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-2">
        {qd.questionText || 'Match the pairs!'}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Tap one on the left, then tap its match on the right.
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          {lefts.map((left) => {
            const isBeingRead = readingOption === left;
            return (
              <button
                key={left}
                onClick={() => handleLeftClick(left)}
                onTouchEnd={(e) => handleLeftTouchEnd(e, left)}
                disabled={disabled || !!matched[left] || submitting}
                className={`w-full min-h-[56px] p-3 text-lg font-bold rounded-xl border-2 transition-all
                  flex items-center justify-between gap-2
                  ${matched[left]
                    ? 'bg-green-100 border-green-400 text-green-800'
                    : isBeingRead
                    ? 'bg-yellow-100 border-yellow-400 text-gray-800 shadow-md'
                    : selectedLeft === left
                    ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                    : 'bg-white border-gray-200 hover:bg-indigo-50'
                  }`}
              >
                <span>{left}</span>
                {isBeingRead ? <ReadingSpeakerBadge /> : <SpeakerIcon text={left} size="sm" />}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {shuffledRights.map((right) => {
            const isBeingRead = readingOption === right;
            return (
              <button
                key={right}
                onClick={() => handleRightClick(right)}
                onTouchEnd={(e) => handleRightTouchEnd(e, right)}
                disabled={disabled || Object.values(matched).includes(right) || submitting}
                className={`w-full min-h-[56px] p-3 text-lg font-bold rounded-xl border-2 transition-all
                  flex items-center justify-between gap-2
                  ${Object.values(matched).includes(right)
                    ? 'bg-green-100 border-green-400 text-green-800'
                    : isBeingRead
                    ? 'bg-yellow-100 border-yellow-400 text-gray-800 shadow-md'
                    : 'bg-white border-gray-200 hover:bg-purple-50'
                  }`}
              >
                <span>{right}</span>
                {isBeingRead ? <ReadingSpeakerBadge /> : <SpeakerIcon text={right} size="sm" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Sequence: tap in correct order — with "tap to hear, tap again to add" */
function SequenceRenderer({ item, onAnswer, disabled, isTouchRef }: QProps) {
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const [readingOption, setReadingOption] = useState<string | null>(null);
  const [lastReadOption, setLastReadOption] = useState<string | null>(null);
  const touchedRef = useRef(false);
  const qd = item.questionData;
  const items: string[] = qd.items || [];
  const correctOrder: string[] = qd.correctOrder || items;
  const [order, setOrder] = useState<string[]>([]);
  const remaining = items.filter((i) => !order.includes(i));

  useEffect(() => { submittedRef.current = false; setSubmitting(false); setOrder([]); setReadingOption(null); setLastReadOption(null); }, [item.id]);

  const doTap = (val: string) => {
    if (disabled || submitting) return;
    setReadingOption(null);
    speakOption(val);
    const newOrder = [...order, val];
    setOrder(newOrder);

    if (newOrder.length === items.length) {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const isCorrect = newOrder.every((v, i) => v === correctOrder[i]);
      setTimeout(() => onAnswer({ order: newOrder }, isCorrect), 200);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, val: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submitting) return;
    if (lastReadOption !== val) {
      setReadingOption(val);
      setLastReadOption(val);
      speak(val);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      doTap(val);
      setLastReadOption(null);
    }
  };

  const handleClick = (val: string) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    doTap(val);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-2">
        {qd.questionText || 'Put these in order!'}
      </p>
      <p className="text-sm text-gray-500 mb-4">Tap them in the right order.</p>

      {order.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-4 bg-green-50 rounded-2xl min-h-[56px]">
          {order.map((val, idx) => (
            <span key={idx} className="px-4 py-2 bg-green-200 text-green-800 font-bold rounded-xl text-lg">
              {idx + 1}. {val}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {remaining.map((val, idx) => {
          const isBeingRead = readingOption === val;
          return (
            <button
              key={idx}
              onClick={() => handleClick(val)}
              onTouchEnd={(e) => handleTouchEnd(e, val)}
              onMouseEnter={() => { if (!isTouchRef.current) speakOption(val); }}
              onFocus={() => speakOption(val)}
              disabled={disabled || submitting}
              className={`min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 transition-all
                         active:scale-95 disabled:opacity-50
                         flex items-center justify-between gap-2
                         ${isBeingRead
                           ? 'bg-yellow-100 border-yellow-400 shadow-md'
                           : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-400'
                         }`}
            >
              <span className="flex-1 text-left">{val}</span>
              {isBeingRead ? <ReadingSpeakerBadge /> : <SpeakerIcon text={val} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Simplified drag-drop: tap source then tap target — with "tap to hear" */
function DragDropRenderer({ item, onAnswer, disabled, isTouchRef }: QProps) {
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const [readingOption, setReadingOption] = useState<string | null>(null);
  const [lastReadOption, setLastReadOption] = useState<string | null>(null);
  const touchedRef = useRef(false);
  const qd = item.questionData;
  const draggables: string[] = qd.draggables || qd.items || [];
  const targets: string[] = qd.targets || qd.zones || [];
  const correctMapping: Record<string, string> = qd.correctMapping || {};
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => { submittedRef.current = false; setSubmitting(false); setPlacements({}); setSelectedItem(null); setReadingOption(null); setLastReadOption(null); }, [item.id]);

  const doItemTap = (val: string) => {
    if (disabled || submitting) return;
    setSelectedItem(val);
    setReadingOption(null);
    speakOption(val);
  };

  const handleItemTouchEnd = (e: React.TouchEvent, val: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submitting) return;
    if (lastReadOption !== val) {
      setReadingOption(val);
      setLastReadOption(val);
      speak(val);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      doItemTap(val);
      setLastReadOption(null);
    }
  };

  const handleItemClick = (val: string) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    doItemTap(val);
  };

  const doTargetTap = (target: string) => {
    if (disabled || !selectedItem || submitting) return;
    setReadingOption(null);
    speakOption(target);
    const updated = { ...placements, [selectedItem]: target };
    setPlacements(updated);
    setSelectedItem(null);

    if (Object.keys(updated).length === draggables.length) {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const isCorrect = Object.entries(correctMapping).every(([k, v]) => updated[k] === v);
      setTimeout(() => onAnswer({ placements: updated }, isCorrect), 200);
    }
  };

  const handleTargetTouchEnd = (e: React.TouchEvent, target: string) => {
    e.preventDefault();
    touchedRef.current = true;
    if (disabled || submitting) return;
    if (lastReadOption !== target) {
      setReadingOption(target);
      setLastReadOption(target);
      speak(target);
      setTimeout(() => setReadingOption(null), 2000);
    } else {
      doTargetTap(target);
      setLastReadOption(null);
    }
  };

  const handleTargetClick = (target: string) => {
    if (touchedRef.current) { touchedRef.current = false; return; }
    doTargetTap(target);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-2">
        {qd.questionText || 'Put each item where it belongs!'}
      </p>
      <p className="text-sm text-gray-500 mb-4">Tap an item, then tap where it goes.</p>

      <div className="flex flex-wrap gap-3 mb-6">
        {draggables.filter((d) => !placements[d]).map((d, idx) => {
          const isBeingRead = readingOption === d;
          return (
            <button
              key={idx}
              onClick={() => handleItemClick(d)}
              onTouchEnd={(e) => handleItemTouchEnd(e, d)}
              disabled={disabled || submitting}
              className={`px-4 py-3 text-lg font-bold rounded-xl border-2 transition-all active:scale-95
                flex items-center gap-2
                ${isBeingRead
                  ? 'bg-yellow-100 border-yellow-400 text-gray-800 shadow-md'
                  : selectedItem === d
                  ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                  : 'bg-white border-gray-200 hover:bg-indigo-50'
                }`}
            >
              {d} {isBeingRead ? <ReadingSpeakerBadge /> : <SpeakerIcon text={d} size="sm" />}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {targets.map((t, idx) => {
          const isBeingRead = readingOption === t;
          return (
            <button
              key={idx}
              onClick={() => handleTargetClick(t)}
              onTouchEnd={(e) => handleTargetTouchEnd(e, t)}
              disabled={disabled || submitting}
              className={`min-h-[80px] p-4 border-2 border-dashed rounded-2xl transition-all text-center
                         ${isBeingRead
                           ? 'bg-yellow-50 border-yellow-400 shadow-md'
                           : 'border-gray-300 bg-gray-50 hover:bg-purple-50 hover:border-purple-400'
                         }`}
            >
              <span className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-1">
                {t} {isBeingRead ? <ReadingSpeakerBadge /> : <SpeakerIcon text={t} size="sm" />}
              </span>
              <div className="flex flex-wrap gap-1 justify-center">
                {Object.entries(placements).filter(([, v]) => v === t).map(([k]) => (
                  <span key={k} className="px-3 py-1 bg-purple-200 text-purple-800 rounded-lg font-bold text-sm">
                    {k}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Teacher-observed: shows task instructions, teacher marks pass/fail */
function TeacherObservedRenderer({ item, onAnswer, disabled }: QPropsSimple) {
  const [processing, setProcessing] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const qd = item.questionData;

  useEffect(() => { submittedRef.current = false; setProcessing(null); }, [item.id]);

  const handleSelect = (result: string, isCorrect: boolean) => {
    if (submittedRef.current || processing) return;
    submittedRef.current = true;
    setProcessing(result);
    setTimeout(() => onAnswer({ teacherResult: result }, isCorrect), 120);
  };

  return (
    <div>
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
          👩‍🏫 Teacher Observation Task
        </h3>
        <p className="text-blue-700 text-lg">
          {qd.instructions || qd.questionText || 'Observe the student performing the task.'}
        </p>
        {qd.materials && (
          <p className="text-blue-600 text-sm mt-2">Materials: {qd.materials}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleSelect('pass', true)}
          onTouchEnd={(e) => { e.preventDefault(); handleSelect('pass', true); }}
          disabled={disabled || !!processing}
          className={`min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 transition-all active:scale-95
            ${processing === 'pass' ? 'bg-green-200 border-green-500 scale-95' : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'}
            disabled:opacity-50`}
        >
          {processing === 'pass' ? '⏳ Saving...' : '✅ Pass'}
        </button>
        <button
          onClick={() => handleSelect('fail', false)}
          onTouchEnd={(e) => { e.preventDefault(); handleSelect('fail', false); }}
          disabled={disabled || !!processing}
          className={`min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 transition-all active:scale-95
            ${processing === 'fail' ? 'bg-orange-200 border-orange-500 scale-95' : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'}
            disabled:opacity-50`}
        >
          {processing === 'fail' ? '⏳ Saving...' : '🔄 Needs Practice'}
        </button>
      </div>
    </div>
  );
}

/** Audio response: play audio prompt, teacher marks correct */
function AudioResponseRenderer({ item, onAnswer, disabled }: QPropsSimple) {
  const [processing, setProcessing] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const qd = item.questionData;

  useEffect(() => { submittedRef.current = false; setProcessing(null); }, [item.id]);

  const handleSelect = (result: string, isCorrect: boolean) => {
    if (submittedRef.current || processing) return;
    submittedRef.current = true;
    setProcessing(result);
    setTimeout(() => onAnswer({ audioResult: result }, isCorrect), 120);
  };

  return (
    <div>
      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 mb-6 text-center">
        <h3 className="font-bold text-purple-800 mb-4">🎤 Listen & Respond</h3>
        <p className="text-purple-700 text-lg mb-4">
          {qd.instructions || qd.questionText || 'Listen to the prompt and respond out loud.'}
        </p>
        <button
          onClick={() => speak(qd.audioPrompt || qd.prompt || qd.questionText || '')}
          onTouchEnd={(e) => { e.preventDefault(); speak(qd.audioPrompt || qd.prompt || qd.questionText || ''); }}
          className="px-8 py-4 bg-purple-600 text-white text-xl font-bold rounded-2xl
                     hover:bg-purple-700 active:scale-95 transition-all inline-flex items-center gap-3"
        >
          🔊 Play Sound
        </button>
      </div>

      <p className="text-sm text-gray-500 text-center mb-4">
        Teacher: Did the student respond correctly?
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleSelect('correct', true)}
          onTouchEnd={(e) => { e.preventDefault(); handleSelect('correct', true); }}
          disabled={disabled || !!processing}
          className={`min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 transition-all active:scale-95
            ${processing === 'correct' ? 'bg-green-200 border-green-500 scale-95' : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'}
            disabled:opacity-50`}
        >
          {processing === 'correct' ? '⏳ Saving...' : '✅ Correct'}
        </button>
        <button
          onClick={() => handleSelect('incorrect', false)}
          onTouchEnd={(e) => { e.preventDefault(); handleSelect('incorrect', false); }}
          disabled={disabled || !!processing}
          className={`min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 transition-all active:scale-95
            ${processing === 'incorrect' ? 'bg-orange-200 border-orange-500 scale-95' : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'}
            disabled:opacity-50`}
        >
          {processing === 'incorrect' ? '⏳ Saving...' : '🔄 Try Again'}
        </button>
      </div>
    </div>
  );
}
