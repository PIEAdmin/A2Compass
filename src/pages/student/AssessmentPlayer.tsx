// ============================================================
// A² Compass — Assessment Player (Student-Facing)
// Child-friendly, audio-supported, game-like assessment experience
// ============================================================
import { useState, useEffect, useCallback } from 'react';
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    // Fallback: pick a voice explicitly if available
    const voices = synth.getVoices();
    const english = voices.find(v => v.lang.startsWith('en') && v.localService);
    if (english) utterance.voice = english;
    synth.speak(utterance);
    // Chrome watchdog: if paused after 10s, resume
    setTimeout(() => { if (synth.speaking && synth.paused) synth.resume(); }, 10000);
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
    `}</style>
  );
}

export default function AssessmentPlayer() {
  const { user } = useAuth();
  const studentId = user?.id ?? '';

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
    goBack,
    skipItem,
    itemHistory,
  } = useAssessmentPlayer(studentId);

  const [starsEarned, setStarsEarned] = useState(0);
  const [starAnimation, setStarAnimation] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('initial_placement');

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

  // ---------- Start Screen ----------
  if (!session && !loading && !isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <AnimationStyles />
        <FloatingDecorations emojis={['⭐', '🌟', '🦋', '🌈', '🚀', '📚']} />
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-10 max-w-md w-full text-center relative z-10 bounce-in">
          <div className="text-6xl mb-4 pulse-soft">🌟</div>
          <h1 className="text-3xl font-bold text-indigo-700 mb-2">
            My Learning Adventure
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Let's see what you already know! There are no wrong answers — just do
            your best!
          </p>

          <button
            onClick={() => startSession(sessionType)}
            className="w-full py-4 px-6 bg-indigo-600 text-white text-xl font-bold rounded-2xl
                       hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
          >
            🚀 Let's Go!
          </button>

          <button
            onClick={() => speak('Let\'s see what you already know! There are no wrong answers, just do your best!')}
            className="mt-4 text-indigo-500 hover:text-indigo-700 flex items-center justify-center gap-2 mx-auto"
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
  const item = currentItem?.item;
  const progress = currentItem?.progress;
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
            />

            {/* Hint button */}
            {item.hintText && !showHint && (
              <button
                onClick={useHint}
                className="mt-6 text-amber-500 hover:text-amber-600 flex items-center gap-2 transition-colors"
              >
                💡 Need a hint?
              </button>
            )}
            {showHint && item.hintText && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800">
                💡 {item.hintText}
              </div>
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
}

function QuestionRenderer({ item, questionType, onAnswer, showHint, disabled }: RendererProps) {
  // Normalize the DB data format to what renderers expect
  const normalizedItem = {
    ...item,
    questionData: normalizeQuestionData(item.questionData || {}, questionType),
  };
  const nItem = normalizedItem as typeof item;

  switch (questionType) {
    case 'multiple_choice':
      return <MultipleChoiceRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'tap_select':
      return <TapSelectRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'counting':
      return <CountingRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'fill_blank':
      return <FillBlankRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'matching':
      return <MatchingRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'sequence':
      return <SequenceRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'drag_drop':
      return <DragDropRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'teacher_observed':
      return <TeacherObservedRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    case 'audio_response':
      return <AudioResponseRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
    default:
      return <MultipleChoiceRenderer item={nItem} onAnswer={onAnswer} disabled={disabled} />;
  }
}

// ==========================================================
// Question Type Renderers
// ==========================================================

interface QProps {
  item: NonNullable<NextItemResult['item']>;
  onAnswer: (response: Record<string, any>, isCorrect: boolean) => void;
  disabled: boolean;
}

/** Large, friendly multiple-choice buttons */
function MultipleChoiceRenderer({ item, onAnswer, disabled }: QProps) {
  const qd = item.questionData;
  const options: string[] = qd.options || [];
  const correctAnswer = qd.correctAnswer ?? qd.answer;
  const questionText = qd.questionText || qd.prompt || '';
  const displayContent = qd.display || qd.stimulus;

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">{questionText}</p>
      {displayContent && (
        <div className="text-5xl font-bold text-indigo-700 text-center my-6 p-6 bg-indigo-50 rounded-2xl">
          {displayContent}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (disabled) return;
              const isCorrect = opt === correctAnswer;
              onAnswer({ selected: opt }, isCorrect);
            }}
            onMouseEnter={() => speakOption(opt)}
            onFocus={() => speakOption(opt)}
            disabled={disabled}
            className="min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 border-gray-200
                       bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-md
                       active:scale-95 transition-all disabled:opacity-50
                       text-gray-800 shadow-sm hover-grow speak-hover"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tap to select multiple correct answers */
function TapSelectRenderer({ item, onAnswer, disabled }: QProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const qd = item.questionData;
  const options: string[] = qd.options || [];
  const correctAnswers: string[] = qd.correctAnswers || [];
  const questionText = qd.questionText || qd.prompt || '';

  const toggle = (opt: string) => {
    if (disabled) return;
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]
    );
  };

  const handleSubmit = () => {
    const isCorrect =
      selected.length === correctAnswers.length &&
      selected.every((s) => correctAnswers.includes(s));
    onAnswer({ selected }, isCorrect);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">{questionText}</p>
      <p className="text-sm text-gray-500 mb-4">Tap all that are correct!</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => toggle(opt)}
            onMouseEnter={() => speakOption(opt)}
            onFocus={() => speakOption(opt)}
            disabled={disabled}
            className={`min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 transition-all
                       active:scale-95 disabled:opacity-50
                       ${
                         selected.includes(opt)
                           ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                           : 'bg-white border-gray-200 text-gray-800 hover:bg-indigo-50'
                       } speak-hover`}
          >
            {selected.includes(opt) && '✓ '}
            {opt}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="mt-6 w-full py-4 bg-indigo-600 text-white text-lg font-bold rounded-2xl
                     hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Check my answer!
        </button>
      )}
    </div>
  );
}

/** Count visual objects */
function CountingRenderer({ item, onAnswer, disabled }: QProps) {
  const [count, setCount] = useState<number | null>(null);
  const qd = item.questionData;
  const objects: string[] = qd.objects || [];
  const correctCount = qd.correctCount ?? objects.length;
  const questionText = qd.questionText || 'How many do you see?';

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">{questionText}</p>
      <div className="flex flex-wrap gap-3 justify-center p-6 bg-blue-50 rounded-2xl mb-6">
        {objects.map((obj, idx) => (
          <span key={idx} className="text-4xl">
            {obj}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: Math.min(10, correctCount + 3) }, (_, i) => i + 1).map(
          (num) => (
            <button
              key={num}
              onClick={() => {
                if (disabled) return;
                setCount(num);
                onAnswer({ count: num }, num === correctCount);
              }}
              onMouseEnter={() => speakOption(String(num))}
              onFocus={() => speakOption(String(num))}
              disabled={disabled}
              className={`w-14 h-14 text-xl font-bold rounded-2xl border-2 transition-all
                         active:scale-95 disabled:opacity-50
                         ${
                           count === num
                             ? 'bg-indigo-500 border-indigo-600 text-white'
                             : 'bg-white border-gray-200 text-gray-800 hover:bg-indigo-50'
                         }`}
            >
              {num}
            </button>
          )
        )}
      </div>
    </div>
  );
}

/** Fill in the blank with a dropdown or input */
function FillBlankRenderer({ item, onAnswer, disabled }: QProps) {
  const [value, setValue] = useState('');
  const qd = item.questionData;
  const sentence = qd.sentence || qd.questionText || '';
  const options: string[] = qd.options || [];
  const correctAnswer = qd.correctAnswer ?? qd.answer;

  const handleSubmit = () => {
    if (disabled || !value) return;
    onAnswer({ answer: value }, value === correctAnswer);
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-4">Fill in the blank:</p>
      <p className="text-lg text-gray-700 mb-6 bg-gray-50 rounded-2xl p-4">
        {sentence.replace('___', '______')}
      </p>
      {options.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (disabled) return;
                setValue(opt);
                onAnswer({ answer: opt }, opt === correctAnswer);
              }}
              onMouseEnter={() => speakOption(opt)}
              onFocus={() => speakOption(opt)}
              disabled={disabled}
              className="min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 border-gray-200
                         bg-white hover:bg-indigo-50 hover:border-indigo-400
                         active:scale-95 transition-all disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            className="flex-1 text-xl p-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-400 outline-none"
            placeholder="Type your answer..."
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !value}
            className="py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl
                       hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
}

/** Simplified matching: tap pairs */
function MatchingRenderer({ item, onAnswer, disabled }: QProps) {
  const qd = item.questionData;
  const pairs: { left: string; right: string }[] = qd.pairs || [];
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const lefts = pairs.map((p) => p.left);
  const rights = pairs.map((p) => p.right).sort(() => Math.random() - 0.5);

  const handleLeftClick = (left: string) => {
    if (disabled) return;
    setSelectedLeft(left);
  };

  const handleRightClick = (right: string) => {
    if (disabled || !selectedLeft) return;
    const updated = { ...matched, [selectedLeft]: right };
    setMatched(updated);
    setSelectedLeft(null);

    // Check if all matched
    if (Object.keys(updated).length === pairs.length) {
      const allCorrect = pairs.every((p) => updated[p.left] === p.right);
      onAnswer({ matches: updated }, allCorrect);
    }
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
          {lefts.map((left) => (
            <button
              key={left}
              onClick={() => handleLeftClick(left)}
              onMouseEnter={() => speakOption(left)}
              onFocus={() => speakOption(left)}
              disabled={disabled || !!matched[left]}
              className={`w-full min-h-[56px] p-3 text-lg font-bold rounded-xl border-2 transition-all
                         ${
                           matched[left]
                             ? 'bg-green-100 border-green-400 text-green-800'
                             : selectedLeft === left
                             ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                             : 'bg-white border-gray-200 hover:bg-indigo-50'
                         }`}
            >
              {left}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {rights.map((right) => (
            <button
              key={right}
              onClick={() => handleRightClick(right)}
              onMouseEnter={() => speakOption(right)}
              onFocus={() => speakOption(right)}
              disabled={disabled || Object.values(matched).includes(right)}
              className={`w-full min-h-[56px] p-3 text-lg font-bold rounded-xl border-2 transition-all
                         ${
                           Object.values(matched).includes(right)
                             ? 'bg-green-100 border-green-400 text-green-800'
                             : 'bg-white border-gray-200 hover:bg-purple-50'
                         }`}
            >
              {right}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sequence: tap "which comes first/next?" simplified */
function SequenceRenderer({ item, onAnswer, disabled }: QProps) {
  const qd = item.questionData;
  const items: string[] = qd.items || [];
  const correctOrder: string[] = qd.correctOrder || items;
  const [order, setOrder] = useState<string[]>([]);
  const remaining = items.filter((i) => !order.includes(i));

  const handleTap = (val: string) => {
    if (disabled) return;
    const newOrder = [...order, val];
    setOrder(newOrder);

    if (newOrder.length === items.length) {
      const isCorrect = newOrder.every((v, i) => v === correctOrder[i]);
      onAnswer({ order: newOrder }, isCorrect);
    }
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-2">
        {qd.questionText || 'Put these in order!'}
      </p>
      <p className="text-sm text-gray-500 mb-4">Tap them in the right order.</p>

      {/* Selected order */}
      {order.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-4 bg-green-50 rounded-2xl min-h-[56px]">
          {order.map((val, idx) => (
            <span
              key={idx}
              className="px-4 py-2 bg-green-200 text-green-800 font-bold rounded-xl text-lg"
            >
              {idx + 1}. {val}
            </span>
          ))}
        </div>
      )}

      {/* Remaining items */}
      <div className="grid grid-cols-2 gap-3">
        {remaining.map((val, idx) => (
          <button
            key={idx}
            onClick={() => handleTap(val)}
            onMouseEnter={() => speakOption(val)}
            onFocus={() => speakOption(val)}
            disabled={disabled}
            className="min-h-[64px] p-4 text-lg font-bold rounded-2xl border-2 border-gray-200
                       bg-white hover:bg-indigo-50 hover:border-indigo-400
                       active:scale-95 transition-all disabled:opacity-50"
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Simplified drag-drop: tap source then tap target */
function DragDropRenderer({ item, onAnswer, disabled }: QProps) {
  const qd = item.questionData;
  const draggables: string[] = qd.draggables || qd.items || [];
  const targets: string[] = qd.targets || qd.zones || [];
  const correctMapping: Record<string, string> = qd.correctMapping || {};
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleItemTap = (val: string) => {
    if (disabled) return;
    setSelectedItem(val);
  };

  const handleTargetTap = (target: string) => {
    if (disabled || !selectedItem) return;
    const updated = { ...placements, [selectedItem]: target };
    setPlacements(updated);
    setSelectedItem(null);

    if (Object.keys(updated).length === draggables.length) {
      const isCorrect = Object.entries(correctMapping).every(
        ([k, v]) => updated[k] === v
      );
      onAnswer({ placements: updated }, isCorrect);
    }
  };

  return (
    <div>
      <p className="text-xl font-semibold text-gray-800 mb-2">
        {qd.questionText || 'Put each item where it belongs!'}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Tap an item, then tap where it goes.
      </p>

      {/* Items */}
      <div className="flex flex-wrap gap-3 mb-6">
        {draggables
          .filter((d) => !placements[d])
          .map((d, idx) => (
            <button
              key={idx}
              onClick={() => handleItemTap(d)}
              onMouseEnter={() => speakOption(d)}
              onFocus={() => speakOption(d)}
              disabled={disabled}
              className={`px-4 py-3 text-lg font-bold rounded-xl border-2 transition-all
                         active:scale-95
                         ${
                           selectedItem === d
                             ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                             : 'bg-white border-gray-200 hover:bg-indigo-50'
                         }`}
            >
              {d}
            </button>
          ))}
      </div>

      {/* Targets */}
      <div className="grid grid-cols-2 gap-4">
        {targets.map((t, idx) => (
          <button
            key={idx}
            onClick={() => handleTargetTap(t)}
            onMouseEnter={() => speakOption(t)}
            onFocus={() => speakOption(t)}
            disabled={disabled}
            className="min-h-[80px] p-4 border-2 border-dashed border-gray-300 rounded-2xl
                       bg-gray-50 hover:bg-purple-50 hover:border-purple-400 transition-all text-center"
          >
            <span className="text-sm text-gray-500 block mb-1">{t}</span>
            <div className="flex flex-wrap gap-1 justify-center">
              {Object.entries(placements)
                .filter(([, v]) => v === t)
                .map(([k]) => (
                  <span
                    key={k}
                    className="px-3 py-1 bg-purple-200 text-purple-800 rounded-lg font-bold text-sm"
                  >
                    {k}
                  </span>
                ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Teacher-observed: shows task instructions, teacher marks pass/fail */
function TeacherObservedRenderer({ item, onAnswer, disabled }: QProps) {
  const qd = item.questionData;

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
          <p className="text-blue-600 text-sm mt-2">
            Materials: {qd.materials}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onAnswer({ teacherResult: 'pass' }, true)}
          disabled={disabled}
          className="min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 border-green-300
                     bg-green-50 text-green-700 hover:bg-green-100 active:scale-95 transition-all"
        >
          ✅ Pass
        </button>
        <button
          onClick={() => onAnswer({ teacherResult: 'fail' }, false)}
          disabled={disabled}
          className="min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 border-orange-300
                     bg-orange-50 text-orange-700 hover:bg-orange-100 active:scale-95 transition-all"
        >
          🔄 Needs Practice
        </button>
      </div>
    </div>
  );
}

/** Audio response: play audio prompt, teacher marks correct */
function AudioResponseRenderer({ item, onAnswer, disabled }: QProps) {
  const qd = item.questionData;

  return (
    <div>
      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 mb-6 text-center">
        <h3 className="font-bold text-purple-800 mb-4">🎤 Listen & Respond</h3>
        <p className="text-purple-700 text-lg mb-4">
          {qd.instructions || qd.questionText || 'Listen to the prompt and respond out loud.'}
        </p>
        <button
          onClick={() => speak(qd.audioPrompt || qd.prompt || qd.questionText || '')}
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
          onClick={() => onAnswer({ audioResult: 'correct' }, true)}
          disabled={disabled}
          className="min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 border-green-300
                     bg-green-50 text-green-700 hover:bg-green-100 active:scale-95 transition-all"
        >
          ✅ Correct
        </button>
        <button
          onClick={() => onAnswer({ audioResult: 'incorrect' }, false)}
          disabled={disabled}
          className="min-h-[72px] p-4 text-lg font-bold rounded-2xl border-2 border-orange-300
                     bg-orange-50 text-orange-700 hover:bg-orange-100 active:scale-95 transition-all"
        >
          🔄 Try Again
        </button>
      </div>
    </div>
  );
}
