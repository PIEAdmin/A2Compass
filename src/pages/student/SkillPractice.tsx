import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { completePlaylistItem } from '../../services/skills.service';

// ---------- TTS Helpers ----------
const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }
};

const speakWithChoices = (question: string, options: string[]) => {
  let fullText = question;
  if (options.length > 0) {
    fullText += '. The choices are: ' +
      options.map((opt, i) => `${String.fromCharCode(65 + i)}, ${opt}`).join('. ') + '.';
  }
  speak(fullText);
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
  if (d.includes('scienc'))
    return ['🔬', '🌿', '🦋', '🌍', '💧', '🌻'];
  return ['⭐', '🌟', '✨', '🎯', '🚀', '💫'];
};

// ---------- Fun celebration messages ----------
const CORRECT_MSGS = [
  '🌟 Amazing! You got it!',
  '⭐ Fantastic job!',
  '🎉 You\'re a superstar!',
  '✨ Wonderful! Keep going!',
  '🌈 Brilliant work!',
  '🚀 Sky-high awesome!',
  '🏆 Champion move!',
  '🦄 Magical answer!',
];
const WRONG_MSGS = [
  'That\'s okay! Let\'s learn together.',
  'Good try! You\'re getting better!',
  'Almost! You\'re learning so much.',
  'Great effort! Practice makes perfect.',
];

interface Question {
  question: string;
  options: string[];
  correct: number;
  hint?: string;
  explanation?: string;
}

interface ActivityContent {
  instructions?: string;
  questions: Question[];
}

interface ActivityData {
  id: string;
  title: string;
  content: ActivityContent;
  skill_node_id: string;
}

interface PlaylistItemData {
  id: string;
  skill_node_id: string;
  skill: {
    id: string;
    name: string;
    code: string;
    domain: {
      name: string;
      code: string;
    } | null;
  } | null;
}

// ---------- Floating Decorations Component ----------
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

// ---------- Confetti Burst Component ----------
function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null;
  const emojis = ['⭐', '🌟', '✨', '🎉', '💫', '🎊', '🌈', '🦄'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {emojis.map((e, i) => (
        <span
          key={i}
          className="absolute text-3xl"
          style={{
            left: `${15 + (i * 10) % 70}%`,
            top: '40%',
            animation: `confetti-burst 1.2s ease-out forwards`,
            animationDelay: `${i * 0.08}s`,
          }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}

export default function SkillPractice() {
  const { playlistItemId } = useParams<{ playlistItemId: string }>();
  const navigate = useNavigate();

  const [playlistItem, setPlaylistItem] = useState<PlaylistItemData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(0);
  const [questionAnim, setQuestionAnim] = useState(true);

  // Load playlist item and activity
  useEffect(() => {
    if (!playlistItemId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: item, error: itemError } = await supabase
          .from('student_playlist')
          .select('id, skill_node_id, skill:skill_nodes(id, name, code, domain:skill_domains(name, code))')
          .eq('id', playlistItemId)
          .single();

        if (itemError) throw new Error('Could not find this skill assignment.');
        setPlaylistItem(item as any);

        const { data: act, error: actError } = await supabase
          .from('content_library')
          .select('id, title, content, skill_node_id')
          .eq('skill_node_id', item.skill_node_id)
          .eq('activity_type', 'practice_arena')
          .eq('status', 'published')
          .limit(1)
          .single();

        if (actError || !act) {
          throw new Error('No activity available for this skill yet. Check back soon!');
        }

        const parsed = typeof act.content === 'string' ? JSON.parse(act.content) : act.content;
        setActivity({ ...act, content: parsed } as ActivityData);
      } catch (err: any) {
        setError(err.message || 'Something went wrong loading the activity.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [playlistItemId]);

  const questions = activity?.content?.questions || [];
  const current = questions[currentQuestion];
  const totalQuestions = questions.length;
  const domainName = playlistItem?.skill?.domain?.name || '';
  const domainEmojis = getDomainEmojis(domainName);

  const handleSelectAnswer = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null || !current) return;
    setAnswered(true);
    const isCorrect = selectedAnswer === current.correct;
    // Cancel any lingering speech before reading feedback
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setStreak((s) => s + 1);
      setShowConfetti(true);
      let msg = CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)];
      // Read the explanation aloud so the child hears the full answer
      if (current.explanation) msg += '. ' + current.explanation;
      speak(msg);
      setTimeout(() => setShowConfetti(false), 1500);
    } else {
      setStreak(0);
      let msg = WRONG_MSGS[Math.floor(Math.random() * WRONG_MSGS.length)];
      // Tell them the right answer and explain why
      const correctText = current.options?.[current.correct];
      if (correctText) msg += '. The answer is ' + correctText + '.';
      if (current.explanation) msg += ' ' + current.explanation;
      speak(msg);
    }
  };

  const handleNext = useCallback(async () => {
    if (currentQuestion + 1 < totalQuestions) {
      setQuestionAnim(false);
      setTimeout(() => {
        setCurrentQuestion((q) => q + 1);
        setSelectedAnswer(null);
        setAnswered(false);
        setShowHint(false);
        setQuestionAnim(true);
      }, 150);
    } else {
      setFinished(true);
      const finalCorrect = correctCount + (selectedAnswer === current?.correct ? 1 : 0);

      try {
        setSubmitting(true);
        await completePlaylistItem(playlistItemId!, finalCorrect, totalQuestions);
      } catch (err) {
        console.error('Failed to save score:', err);
      } finally {
        setSubmitting(false);
      }
    }
  }, [currentQuestion, totalQuestions, correctCount, selectedAnswer, current, playlistItemId]);

  const finalScore = finished
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;
  const passed = finalScore >= 85;

  // ---------- Animation Styles ----------
  const animStyles = (
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-12px) rotate(3deg); }
      }
      @keyframes confetti-burst {
        0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        100% { transform: translateY(-120px) scale(0.3) rotate(720deg); opacity: 0; }
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
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes pulse-soft {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-3deg); }
        75% { transform: rotate(3deg); }
      }
      .slide-up { animation: slide-up 0.4s ease-out; }
      .bounce-in { animation: bounce-in 0.5s ease-out; }
      .pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      .wiggle { animation: wiggle 0.5s ease-in-out; }
      .shimmer-bar {
        background: linear-gradient(90deg, #818cf8, #c084fc, #818cf8);
        background-size: 200% 100%;
        animation: shimmer 2s linear infinite;
      }
      .hover-grow { transition: transform 0.2s, box-shadow 0.2s; }
      .hover-grow:hover { transform: scale(1.03); box-shadow: 0 4px 20px rgba(99,102,241,0.2); }
      .hover-grow:active { transform: scale(0.97); }
    `}</style>
  );

  // --- LOADING ---
  if (loading) {
    return (
      <>
        {animStyles}
        <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
          <div className="text-center bounce-in">
            <div className="text-6xl mb-4 pulse-soft">🧭</div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="text-indigo-500 mt-4 font-medium text-lg">Getting your adventure ready...</p>
          </div>
        </div>
      </>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <>
        {animStyles}
        <div className="max-w-lg mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center bounce-in">
            <p className="text-5xl mb-3">😕</p>
            <p className="text-red-700 font-medium text-lg">{error}</p>
            <button
              onClick={() => navigate('/student')}
              className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium hover-grow"
            >
              Back to Flight Plan 🚀
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- FINISHED ---
  if (finished) {
    return (
      <>
        {animStyles}
        <FloatingDecorations emojis={passed ? ['🌟', '⭐', '🏆', '🎉', '✨', '🦄'] : ['💪', '🌈', '⭐', '💫', '🎯', '✨']} />
        <div className="max-w-lg mx-auto p-4 sm:p-6 relative z-10">
          <div className={`rounded-2xl shadow-lg border-2 p-8 text-center bounce-in ${
            passed
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
              : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'
          }`}>
            <p className="text-6xl mb-4 pulse-soft">{passed ? '🏆' : '💪'}</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {passed ? 'Amazing Job!' : 'Good Effort!'}
            </h2>
            <p className="text-gray-600 mt-2 text-lg">
              {playlistItem?.skill?.name}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <div className={`text-5xl font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}>
                {finalScore}%
              </div>
            </div>
            <p className="text-gray-500 mt-1">
              {correctCount} of {totalQuestions} correct
            </p>

            {passed ? (
              <div className="mt-4 bg-green-100 rounded-xl p-4">
                <p className="text-green-700 font-bold text-lg">⭐ Skill Mastered!</p>
              </div>
            ) : (
              <div className="mt-4 bg-orange-100 rounded-xl p-4">
                <p className="text-orange-700 font-medium">Keep practicing — you need 85% to master this skill!</p>
              </div>
            )}

            {/* Stars display */}
            <div className="flex justify-center gap-1 mt-4 text-2xl">
              {Array.from({ length: Math.min(correctCount, 15) }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.1}s` }} className="bounce-in">⭐</span>
              ))}
            </div>

            {submitting && (
              <p className="text-sm text-gray-400 mt-3">Saving your score...</p>
            )}

            <button
              onClick={() => navigate('/student')}
              className="mt-6 px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-indigo-700 transition-all hover-grow"
            >
              Back to Flight Plan 🚀
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- QUIZ ---
  if (!current) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <p className="text-gray-500">No questions found in this activity.</p>
        <button
          onClick={() => navigate('/student')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Back to Flight Plan
        </button>
      </div>
    );
  }

  const isCorrect = answered && selectedAnswer === current.correct;

  return (
    <>
      {animStyles}
      <FloatingDecorations emojis={domainEmojis} />
      <ConfettiBurst show={showConfetti} />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative">
        <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4 relative z-10">
          {/* Header Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl pulse-soft">{domainEmojis[0]}</span>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                    {playlistItem?.skill?.domain?.name || 'Skill'}
                  </p>
                  <h1 className="text-lg font-bold text-gray-900 mt-0.5">
                    {activity?.title || playlistItem?.skill?.name}
                  </h1>
                </div>
              </div>
              <button
                onClick={() => navigate('/student')}
                className="text-gray-400 hover:text-gray-600 text-lg p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span className="font-medium">Question {currentQuestion + 1} of {totalQuestions}</span>
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span> {correctCount} correct
                  {streak >= 3 && <span className="text-orange-500 font-bold ml-1">🔥 {streak} streak!</span>}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="shimmer-bar h-3 rounded-full transition-all duration-500"
                  style={{ width: `${((currentQuestion + (answered ? 1 : 0)) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Instructions */}
          {currentQuestion === 0 && !answered && activity?.content?.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 slide-up">
              <p className="text-blue-700 text-sm flex items-center gap-2">
                <span className="text-xl">💡</span> {activity.content.instructions}
              </p>
            </div>
          )}

          {/* Question Card */}
          <div
            className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border-2 p-5 transition-all duration-300 ${
              questionAnim ? 'slide-up' : 'opacity-0 translate-y-4'
            } ${
              answered
                ? isCorrect
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-red-300 bg-red-50/50'
                : 'border-gray-100'
            }`}
          >
            {/* Play Question Button */}
            <button
              onClick={() => speakWithChoices(current.question, current.options)}
              className="mb-4 flex items-center gap-2 text-indigo-500 hover:text-indigo-700 transition-colors group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">🔊</span>
              <span className="text-sm font-medium">Play Question</span>
            </button>

            {/* Question Text */}
            <h2 className="text-xl font-bold text-gray-800 leading-relaxed">
              {current.question}
            </h2>

            {/* Options */}
            <div className="mt-5 space-y-3">
              {current.options.map((option, idx) => {
                let bgClass = 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md';
                let iconClass = '';

                if (selectedAnswer === idx && !answered) {
                  bgClass = 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-md';
                }
                if (answered) {
                  if (idx === current.correct) {
                    bgClass = 'bg-green-50 border-green-400 shadow-md';
                    iconClass = '✅ ';
                  } else if (idx === selectedAnswer && idx !== current.correct) {
                    bgClass = 'bg-red-50 border-red-400 wiggle';
                    iconClass = '❌ ';
                  } else {
                    bgClass = 'bg-gray-50 border-gray-200 opacity-40';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    disabled={answered}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all hover-grow ${bgClass}`}
                  >
                    <span className="text-base font-bold text-indigo-600 mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span className="text-base text-gray-700 font-medium">
                      {iconClass}{option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hint */}
            {!answered && current.hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="mt-4 text-sm text-amber-500 hover:text-amber-700 flex items-center gap-1 transition-colors"
              >
                {showHint ? '🙈 Hide hint' : '💡 Need a hint?'}
              </button>
            )}
            {showHint && !answered && current.hint && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-4 slide-up">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <span className="text-lg">💡</span> {current.hint}
                </p>
              </div>
            )}

            {/* Feedback after answering */}
            {answered && (
              <div className={`mt-4 p-4 rounded-xl slide-up ${
                isCorrect
                  ? 'bg-green-100 border border-green-300'
                  : 'bg-red-100 border border-red-300'
              }`}>
                <p className={`text-base font-bold ${
                  isCorrect ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isCorrect
                    ? CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)]
                    : `The answer is ${String.fromCharCode(65 + current.correct)}. ${current.options[current.correct]}`
                  }
                </p>
              </div>
            )}

            {/* Explanation */}
            {answered && current.explanation && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 slide-up">
                <p className="text-sm text-blue-800">
                  <strong>💡 Did you know?</strong> {current.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pb-4">
            {!answered ? (
              <button
                onClick={handleCheckAnswer}
                disabled={selectedAnswer === null}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all hover-grow ${
                  selectedAnswer === null
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'
                }`}
              >
                Check Answer ✨
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full py-4 rounded-xl font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover-grow"
              >
                {currentQuestion + 1 < totalQuestions ? 'Next Question →' : 'See Results 🎯'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
