import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface InteractiveStoryProps {
  onComplete?: (results: { questionsCorrect: number; questionsTotal: number }) => void;
  onExit?: () => void;
}

interface StoryPage {
  text: string;
  illustration: string;
  fact: string;
}

interface Question {
  question: string;
  options: { emoji: string; label: string }[];
  correctIndex: number;
}

const STORY_PAGES: StoryPage[] = [
  {
    text: 'Once upon a time, there were three little pigs. They each set out to build a house of their own.',
    illustration: '🐷🐷🐷🏠',
    fact: 'Pigs are very smart animals!',
  },
  {
    text: 'The first little pig built his house out of straw. It was quick and easy!',
    illustration: '🐷🏚️🌾',
    fact: 'Straw is dried grass!',
  },
  {
    text: 'The second little pig built his house out of sticks. It was a bit stronger.',
    illustration: '🐷🪵🏠',
    fact: 'Sticks come from trees!',
  },
  {
    text: 'The third little pig built his house out of bricks. It took a long time, but it was very strong!',
    illustration: '🐷🧱🏠',
    fact: 'Bricks are made from clay and baked in an oven!',
  },
  {
    text: 'The big bad wolf came and huffed and puffed! He blew down the straw house and the stick house!',
    illustration: '🐺💨🏚️',
    fact: 'Wolves can howl loud enough to be heard 10 miles away!',
  },
  {
    text: 'But the wolf could not blow down the brick house! The three little pigs were safe and lived happily ever after.',
    illustration: '🐷🐷🐷🧱🏠🎉',
    fact: 'The strongest buildings use strong foundations!',
  },
];

const QUESTIONS: Question[] = [
  {
    question: 'What did the first pig build his house from?',
    options: [
      { emoji: '🌾', label: 'Straw' },
      { emoji: '🪵', label: 'Sticks' },
      { emoji: '🧱', label: 'Bricks' },
      { emoji: '🪨', label: 'Rocks' },
    ],
    correctIndex: 0,
  },
  {
    question: 'Who tried to blow the houses down?',
    options: [
      { emoji: '🐺', label: 'The Wolf' },
      { emoji: '🐱', label: 'A Cat' },
      { emoji: '🐻', label: 'A Bear' },
      { emoji: '🦁', label: 'A Lion' },
    ],
    correctIndex: 0,
  },
  {
    question: 'Which house was the strongest?',
    options: [
      { emoji: '🧱', label: 'Brick house' },
      { emoji: '🌾', label: 'Straw house' },
      { emoji: '🪵', label: 'Stick house' },
      { emoji: '🏕️', label: 'Tent' },
    ],
    correctIndex: 0,
  },
  {
    question: 'How many little pigs were there?',
    options: [
      { emoji: '3️⃣', label: 'Three' },
      { emoji: '2️⃣', label: 'Two' },
      { emoji: '4️⃣', label: 'Four' },
      { emoji: '1️⃣', label: 'One' },
    ],
    correctIndex: 0,
  },
];

type Phase = 'story' | 'quiz' | 'results';

function speakWord(word: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = 0.85;
  utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

function fireConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bdb'],
  });
}

function fireStarConfetti() {
  const count = 150;
  const defaults = { origin: { y: 0.5 }, colors: ['#FFD700', '#FFA500', '#FF6347', '#7B68EE', '#00CED1'] };
  confetti({ ...defaults, particleCount: count, spread: 100, startVelocity: 30 });
  setTimeout(() => confetti({ ...defaults, particleCount: count / 2, spread: 120, startVelocity: 45 }), 200);
}

export default function InteractiveStory({ onComplete, onExit }: InteractiveStoryProps) {
  const [phase, setPhase] = useState<Phase>('story');
  const [currentPage, setCurrentPage] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
  const [tappedWordIndex, setTappedWordIndex] = useState<number | null>(null);
  const [showFact, setShowFact] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [shakeOption, setShakeOption] = useState<number | null>(null);

  const readingRef = useRef(false);
  const cancelReadRef = useRef(false);

  const page = STORY_PAGES[currentPage];
  const words = page.text.split(/\s+/);

  const stopReading = useCallback(() => {
    readingRef.current = false;
    cancelReadRef.current = true;
    setIsReading(false);
    setHighlightedWordIndex(null);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const readPage = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    cancelReadRef.current = false;
    readingRef.current = true;
    setIsReading(true);

    const pageWords = STORY_PAGES[currentPage].text.split(/\s+/);
    let idx = 0;

    const speakNext = () => {
      if (cancelReadRef.current || idx >= pageWords.length) {
        readingRef.current = false;
        setIsReading(false);
        setHighlightedWordIndex(null);
        return;
      }
      setHighlightedWordIndex(idx);
      const utter = new SpeechSynthesisUtterance(pageWords[idx]);
      utter.rate = 0.8;
      utter.pitch = 1.1;
      utter.onend = () => {
        idx++;
        if (!cancelReadRef.current) {
          setTimeout(speakNext, 80);
        }
      };
      utter.onerror = () => {
        readingRef.current = false;
        setIsReading(false);
        setHighlightedWordIndex(null);
      };
      window.speechSynthesis.speak(utter);
    };
    speakNext();
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    stopReading();
    setShowFact(false);
    setTappedWordIndex(null);
  }, [currentPage, stopReading]);

  const handleWordTap = (index: number, word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '');
    if (!cleanWord) return;
    setTappedWordIndex(index);
    speakWord(cleanWord);
    setTimeout(() => setTappedWordIndex(null), 600);
  };

  const handleNextPage = () => {
    if (currentPage < STORY_PAGES.length - 1) {
      stopReading();
      setCurrentPage((p) => p + 1);
    } else {
      stopReading();
      setPhase('quiz');
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      stopReading();
      setCurrentPage((p) => p - 1);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (answerState !== 'idle') return;
    setSelectedAnswer(optionIndex);
    const correct = optionIndex === QUESTIONS[quizIndex].correctIndex;
    if (correct) {
      setAnswerState('correct');
      setScore((s) => s + 1);
      fireConfetti();
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
      audio.play().catch(() => {});
      setTimeout(() => {
        if (quizIndex < QUESTIONS.length - 1) {
          setQuizIndex((q) => q + 1);
          setSelectedAnswer(null);
          setAnswerState('idle');
        } else {
          const finalScore = score + 1;
          setPhase('results');
          fireStarConfetti();
          onComplete?.({ questionsCorrect: finalScore, questionsTotal: QUESTIONS.length });
        }
      }, 1200);
    } else {
      setAnswerState('wrong');
      setShakeOption(optionIndex);
      setTimeout(() => {
        setAnswerState('idle');
        setSelectedAnswer(null);
        setShakeOption(null);
      }, 800);
    }
  };

  const handleToggleRead = () => {
    if (isReading) {
      stopReading();
    } else {
      readPage();
    }
  };

  // ---------- STORY PHASE ----------
  if (phase === 'story') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {onExit && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onExit}
              className="w-11 h-11 rounded-2xl bg-white/80 shadow-md flex items-center justify-center text-xl"
            >
              ✕
            </motion.button>
          )}
          <div className="text-lg font-bold text-amber-800">📖 The Three Little Pigs</div>
          <div className="text-sm text-amber-600 font-semibold">
            {currentPage + 1} / {STORY_PAGES.length}
          </div>
        </div>

        {/* Page dots */}
        <div className="flex justify-center gap-2 py-2">
          {STORY_PAGES.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i === currentPage ? 'bg-amber-500 scale-125' : i < currentPage ? 'bg-amber-300' : 'bg-amber-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center px-4 pb-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full max-w-lg flex flex-col items-center gap-4"
            >
              {/* Illustration */}
              <div className="relative w-full">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFact(!showFact)}
                  className="w-full bg-white/70 rounded-3xl shadow-lg p-6 flex items-center justify-center min-h-[140px] border-2 border-amber-200 cursor-pointer"
                >
                  <span className="text-6xl sm:text-7xl md:text-8xl tracking-widest select-none">
                    {page.illustration}
                  </span>
                </motion.button>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-amber-400 font-medium">
                  Tap the picture! 👆
                </div>

                {/* Fact tooltip */}
                <AnimatePresence>
                  {showFact && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-20 bg-yellow-100 border-2 border-yellow-400 rounded-2xl px-4 py-2 shadow-xl w-[90%] text-center"
                    >
                      <span className="text-sm font-bold text-yellow-800">💡 Fun Fact: </span>
                      <span className="text-sm text-yellow-700">{page.fact}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Story text */}
              <div
                className={`w-full bg-white/80 rounded-3xl shadow-md p-5 sm:p-6 leading-relaxed ${showFact ? 'mt-12' : 'mt-4'}`}
              >
                <p className="text-xl sm:text-2xl font-serif text-amber-900 leading-loose flex flex-wrap gap-x-2 gap-y-1">
                  {words.map((word, i) => {
                    const isHighlighted = highlightedWordIndex === i;
                    const isTapped = tappedWordIndex === i;
                    return (
                      <motion.span
                        key={i}
                        onClick={() => handleWordTap(i, word)}
                        animate={
                          isHighlighted
                            ? { scale: 1.12, backgroundColor: '#FDE047', borderRadius: '6px', padding: '2px 4px' }
                            : isTapped
                              ? { scale: 1.15, backgroundColor: '#FDE68A', borderRadius: '6px', padding: '2px 4px' }
                              : { scale: 1, backgroundColor: 'transparent', borderRadius: '6px', padding: '2px 4px' }
                        }
                        transition={{ duration: 0.15 }}
                        className="cursor-pointer hover:bg-yellow-100 rounded-md decoration-dotted decoration-amber-300 underline underline-offset-4"
                        style={{ display: 'inline-block' }}
                      >
                        {word}
                      </motion.span>
                    );
                  })}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-6 pt-2 flex items-center justify-between gap-3 max-w-lg mx-auto w-full">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`w-14 h-14 rounded-2xl shadow-md flex items-center justify-center text-2xl ${
              currentPage === 0 ? 'bg-gray-200 text-gray-400' : 'bg-white text-amber-700'
            }`}
          >
            ◀️
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleRead}
            className={`flex-1 h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-lg font-bold ${
              isReading
                ? 'bg-red-400 text-white'
                : 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
            }`}
          >
            {isReading ? (
              <>⏸ Pause</>
            ) : (
              <>🔊 Read to Me</>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleNextPage}
            className="w-14 h-14 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-400 shadow-md flex items-center justify-center text-2xl text-white"
          >
            {currentPage === STORY_PAGES.length - 1 ? '🎯' : '▶️'}
          </motion.button>
        </div>
      </div>
    );
  }

  // ---------- QUIZ PHASE ----------
  if (phase === 'quiz') {
    const q = QUESTIONS[quizIndex];
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center px-4 py-6">
        {/* Progress */}
        <div className="w-full max-w-md mb-4">
          <div className="flex justify-between text-sm text-indigo-400 font-semibold mb-2">
            <span>Question {quizIndex + 1} of {QUESTIONS.length}</span>
            <span>⭐ {score} correct</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((quizIndex) / QUESTIONS.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Question card */}
        <motion.div
          key={quizIndex}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 mb-6"
        >
          <div className="text-5xl text-center mb-3">🤔</div>
          <h2 className="text-xl sm:text-2xl font-bold text-indigo-800 text-center leading-snug">
            {q.question}
          </h2>
        </motion.div>

        {/* Options */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3">
          {q.options.map((opt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrectAnswer = i === q.correctIndex;
            let bg = 'bg-white hover:bg-indigo-50';
            let border = 'border-2 border-indigo-200';

            if (answerState === 'correct' && isSelected) {
              bg = 'bg-green-100';
              border = 'border-2 border-green-500';
            } else if (answerState === 'wrong' && isSelected) {
              bg = 'bg-red-100';
              border = 'border-2 border-red-400';
            }

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                animate={
                  shakeOption === i
                    ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
                    : answerState === 'correct' && isCorrectAnswer
                      ? { scale: [1, 1.08, 1] }
                      : {}
                }
                transition={{ duration: 0.5 }}
                onClick={() => handleAnswer(i)}
                className={`${bg} ${border} rounded-2xl shadow-md p-4 flex flex-col items-center gap-2 min-h-[100px] transition-colors`}
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="text-base sm:text-lg font-bold text-indigo-700">{opt.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- RESULTS PHASE ----------
  const stars = score === QUESTIONS.length ? 3 : score >= QUESTIONS.length * 0.75 ? 3 : score >= QUESTIONS.length * 0.5 ? 2 : 1;
  const encouragement =
    score === QUESTIONS.length
      ? 'Perfect! You&apos;re a superstar reader! 🌟'
      : score >= 3
        ? 'Amazing job! You remembered so much! 🎉'
        : score >= 2
          ? 'Great effort! Keep reading! 📚'
          : 'Good try! Let&apos;s read more stories! 💪';

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-amber-50 to-orange-50 flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center"
      >
        <div className="text-6xl mb-2">📖</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-4">Story Complete!</h2>

        {/* Stars */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <motion.span
              key={s}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: s <= stars ? 1 : 0.5 }}
              transition={{ delay: s * 0.2, type: 'spring', stiffness: 300 }}
              className={`text-5xl ${s <= stars ? '' : 'grayscale opacity-30'}`}
            >
              ⭐
            </motion.span>
          ))}
        </div>

        {/* Score */}
        <div className="text-5xl font-black text-amber-600 mb-2">
          {score} / {QUESTIONS.length}
        </div>
        <p className="text-lg text-amber-700 text-center mb-6" dangerouslySetInnerHTML={{ __html: encouragement }} />

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setPhase('story');
              setCurrentPage(0);
              setQuizIndex(0);
              setScore(0);
              setSelectedAnswer(null);
              setAnswerState('idle');
            }}
            className="w-full h-14 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-lg rounded-2xl shadow-lg"
          >
            📖 Read Again
          </motion.button>
          {onExit && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onExit}
              className="w-full h-14 bg-white border-2 border-amber-300 text-amber-700 font-bold text-lg rounded-2xl shadow-md"
            >
              🏠 Back to Home
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
