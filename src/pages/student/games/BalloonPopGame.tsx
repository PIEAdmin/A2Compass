import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface BalloonPopGameProps {
  questions: Array<{
    questionText: string;
    illustration: string;
    options: string[];
    correctAnswer: string;
    hint?: string;
    explanation?: string;
  }>;
  onComplete: (results: {
    correct: number;
    total: number;
    answers: Array<{
      question: string;
      correct: boolean;
      selected: string;
      correctAnswer: string;
    }>;
  }) => void;
  onExit?: () => void;
  domainName?: string;
  skillName?: string;
}

const BALLOON_COLORS = [
  { bg: 'from-red-400 to-red-500', highlight: 'bg-red-300', ribbon: '#ef4444' },
  { bg: 'from-blue-400 to-blue-500', highlight: 'bg-blue-300', ribbon: '#3b82f6' },
  { bg: 'from-green-400 to-green-500', highlight: 'bg-green-300', ribbon: '#22c55e' },
  { bg: 'from-orange-400 to-orange-500', highlight: 'bg-orange-300', ribbon: '#f97316' },
  { bg: 'from-purple-400 to-purple-500', highlight: 'bg-purple-300', ribbon: '#a855f7' },
  { bg: 'from-pink-400 to-pink-500', highlight: 'bg-pink-300', ribbon: '#ec4899' },
  { bg: 'from-yellow-400 to-yellow-500', highlight: 'bg-yellow-300', ribbon: '#eab308' },
];

function speakText(text: string) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.85;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  }
}

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });
}

function fireBigConfetti() {
  const end = Date.now() + 2000;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      zIndex: 9999,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export default function BalloonPopGame({
  questions,
  onComplete,
  onExit,
  domainName,
  skillName,
}: BalloonPopGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [answers, setAnswers] = useState<
    Array<{ question: string; correct: boolean; selected: string; correctAnswer: string }>
  >([]);
  const [poppedBalloon, setPoppedBalloon] = useState<string | null>(null);
  const [wrongBalloon, setWrongBalloon] = useState<string | null>(null);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [balloonsReady, setBalloonsReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [floatedAway, setFloatedAway] = useState<Set<string>>(new Set());
  const transitioning = useRef(false);

  const question = questions[currentIndex];
  const totalQuestions = questions.length;
  const correctCount = answers.filter((a) => a.correct).length;

  // Read question aloud on mount / question change
  useEffect(() => {
    if (isComplete) return;
    setBalloonsReady(false);
    setPoppedBalloon(null);
    setWrongBalloon(null);
    setShowCorrectFeedback(false);
    setShowHint(false);
    setFloatedAway(new Set());
    transitioning.current = false;
    const t = setTimeout(() => {
      setBalloonsReady(true);
      speakText(question.questionText);
    }, 300);
    return () => clearTimeout(t);
  }, [currentIndex, isComplete]);

  const advanceQuestion = useCallback(() => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((i) => i + 1);
      setAttempts(0);
    } else {
      setIsComplete(true);
      fireBigConfetti();
      speakText('Amazing! You finished the game!');
    }
  }, [currentIndex, totalQuestions]);

  const handleBalloonTap = useCallback(
    (option: string) => {
      if (transitioning.current) return;
      if (poppedBalloon || floatedAway.has(option)) return;

      const isCorrect = option === question.correctAnswer;

      if (isCorrect) {
        transitioning.current = true;
        setPoppedBalloon(option);
        setShowCorrectFeedback(true);
        fireConfetti();
        speakText('Great job!');

        setAnswers((prev) => [
          ...prev,
          {
            question: question.questionText,
            correct: true,
            selected: option,
            correctAnswer: question.correctAnswer,
          },
        ]);

        setTimeout(() => {
          advanceQuestion();
        }, 1800);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setWrongBalloon(option);
        speakText('Try again!');

        setTimeout(() => {
          setWrongBalloon(null);
          setFloatedAway((prev) => new Set(prev).add(option));
        }, 600);

        if (newAttempts >= 2) {
          transitioning.current = true;
          setTimeout(() => {
            setAnswers((prev) => [
              ...prev,
              {
                question: question.questionText,
                correct: false,
                selected: option,
                correctAnswer: question.correctAnswer,
              },
            ]);
            if (question.explanation) {
              speakText(question.explanation);
            }
            setTimeout(() => {
              advanceQuestion();
            }, 1500);
          }, 800);
        } else if (question.hint) {
          setShowHint(true);
        }
      }
    },
    [question, poppedBalloon, attempts, advanceQuestion, floatedAway]
  );

  const handlePlayAgain = () => {
    setCurrentIndex(0);
    setAttempts(0);
    setAnswers([]);
    setPoppedBalloon(null);
    setWrongBalloon(null);
    setShowCorrectFeedback(false);
    setShowHint(false);
    setBalloonsReady(false);
    setFloatedAway(new Set());
    setIsComplete(false);
    transitioning.current = false;
  };

  const handleDone = () => {
    onComplete({
      correct: answers.filter((a) => a.correct).length,
      total: totalQuestions,
      answers,
    });
  };

  // ── End Screen ──
  if (isComplete) {
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    const celebrationEmoji = accuracy === 1 ? '🏆' : accuracy >= 0.8 ? '⭐' : accuracy >= 0.6 ? '🎉' : '💪';
    const message =
      accuracy === 1
        ? 'Perfect Score!'
        : accuracy >= 0.8
        ? 'Amazing Work!'
        : accuracy >= 0.6
        ? 'Great Effort!'
        : 'Keep Practicing!';

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-200 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Clouds */}
        <div className="absolute top-8 left-6 text-5xl opacity-30 animate-pulse">☁️</div>
        <div className="absolute top-20 right-10 text-4xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>☁️</div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-7xl mb-4"
          >
            {celebrationEmoji}
          </motion.div>

          <h2 className="text-3xl font-extrabold text-purple-700 mb-2">{message}</h2>

          {domainName && (
            <p className="text-sm text-purple-400 mb-1">{domainName}</p>
          )}
          {skillName && (
            <p className="text-sm text-purple-400 mb-3">{skillName}</p>
          )}

          <p className="text-xl text-gray-700 mb-4">
            You got <span className="font-bold text-green-600">{correctCount}</span> out of{' '}
            <span className="font-bold">{totalQuestions}</span> correct!
          </p>

          {/* Stars */}
          <div className="flex justify-center gap-1 mb-6 flex-wrap">
            {answers.map((a, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.15, type: 'spring' }}
                className="text-3xl"
              >
                {a.correct ? '⭐' : '☆'}
              </motion.span>
            ))}
          </div>

          <div className="text-6xl mb-6">🐾</div>

          <div className="flex gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayAgain}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg text-lg"
            >
              🔄 Play Again
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDone}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-2xl shadow-lg text-lg"
            >
              ✅ Done
            </motion.button>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="mt-4 text-gray-400 hover:text-gray-600 text-sm underline"
            >
              Exit Game
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Game Screen ──
  const progressPercent = ((currentIndex) / totalQuestions) * 100;

  // Assign colors to balloons and randomize horizontal positions
  const balloonData = question.options.map((opt, i) => {
    const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
    const count = question.options.length;
    const sectionWidth = 100 / count;
    const xPos = sectionWidth * i + sectionWidth / 2;
    const wobbleDelay = i * 0.3;
    return { option: opt, color, xPos, wobbleDelay, index: i };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-blue-100 to-purple-100 flex flex-col relative overflow-hidden select-none">
      {/* Background Clouds */}
      <motion.div
        animate={{ x: [0, 30, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
        className="absolute top-12 left-4 text-5xl opacity-20 pointer-events-none"
      >
        ☁️
      </motion.div>
      <motion.div
        animate={{ x: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        className="absolute top-28 right-8 text-4xl opacity-15 pointer-events-none"
      >
        ☁️
      </motion.div>
      <motion.div
        animate={{ x: [0, 25, 0] }}
        transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
        className="absolute top-48 left-1/3 text-6xl opacity-10 pointer-events-none"
      >
        ☁️
      </motion.div>

      {/* Header: Progress & Exit */}
      <div className="relative z-10 p-3 pb-0">
        <div className="flex items-center gap-3 mb-2">
          {onExit && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onExit}
              className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-md text-lg"
            >
              ✕
            </motion.button>
          )}
          <div className="flex-1">
            <div className="h-4 bg-white/50 rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-500 rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-full" />
              </motion.div>
            </div>
          </div>
          <span className="text-sm font-bold text-purple-700 bg-white/70 px-3 py-1 rounded-full shadow">
            {currentIndex + 1}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="relative z-10 px-3 pt-2 pb-4">
        <motion.div
          key={currentIndex}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-5 text-center max-w-lg mx-auto"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-5xl mb-3"
          >
            {question.illustration}
          </motion.div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 leading-snug">
            {question.questionText}
          </h2>

          {/* Hint */}
          <AnimatePresence>
            {showHint && question.hint && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2 inline-block"
              >
                💡 {question.hint}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Correct Feedback Overlay */}
      <AnimatePresence>
        {showCorrectFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6 }}
                className="text-8xl"
              >
                🌟
              </motion.div>
              <motion.p
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                className="text-3xl font-extrabold text-green-600 mt-2 drop-shadow-lg bg-white/80 rounded-2xl px-4 py-2"
              >
                Great Job!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balloons Area */}
      <div className="flex-1 relative z-10 min-h-[350px]">
        <AnimatePresence>
          {balloonsReady &&
            balloonData.map((b) => {
              const isPopped = poppedBalloon === b.option;
              const isWrong = wrongBalloon === b.option;
              const isGone = floatedAway.has(b.option);

              if (isPopped || isGone) {
                return (
                  <motion.div
                    key={b.option + '-' + currentIndex}
                    initial={{ opacity: 1 }}
                    animate={
                      isPopped
                        ? { scale: [1, 1.4, 0], opacity: [1, 1, 0] }
                        : { opacity: 0, y: -100, x: Math.random() > 0.5 ? 60 : -60 }
                    }
                    transition={{ duration: isPopped ? 0.4 : 0.8 }}
                    className="absolute"
                    style={{
                      left: `${b.xPos}%`,
                      top: '30%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-full" />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={b.option + '-' + currentIndex}
                  initial={{ y: 400, opacity: 0 }}
                  animate={{
                    y: [400, 20, 30, 20, 30],
                    opacity: 1,
                    x: [0, 8, -8, 6, -6, 0],
                  }}
                  transition={{
                    y: {
                      duration: 2 + b.wobbleDelay,
                      ease: 'easeOut',
                      times: [0, 0.4, 0.6, 0.8, 1],
                      repeat: Infinity,
                      repeatType: 'reverse',
                      repeatDelay: 0.5,
                    },
                    x: {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                      delay: b.wobbleDelay,
                    },
                    opacity: { duration: 0.5 },
                  }}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${b.xPos}%`,
                    bottom: '5%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                  }}
                  onClick={() => handleBalloonTap(b.option)}
                >
                  <motion.div
                    animate={
                      isWrong
                        ? { x: [-8, 8, -8, 8, 0], borderColor: '#ef4444' }
                        : {}
                    }
                    transition={{ duration: 0.4 }}
                    className="relative flex flex-col items-center"
                  >
                    {/* Balloon body */}
                    <div
                      className={`w-24 h-28 sm:w-28 sm:h-32 rounded-full bg-gradient-to-br ${b.color.bg} flex items-center justify-center relative shadow-xl ${
                        isWrong ? 'ring-4 ring-red-500' : ''
                      }`}
                      style={{
                        borderRadius: '50% 50% 50% 50% / 55% 55% 45% 45%',
                      }}
                    >
                      {/* Glossy highlight */}
                      <div
                        className={`absolute top-2 left-3 w-8 h-8 sm:w-10 sm:h-10 ${b.color.highlight} rounded-full opacity-40 blur-sm`}
                      />
                      {/* Option text */}
                      <span className="text-white font-extrabold text-xl sm:text-2xl drop-shadow-md z-10 select-none">
                        {b.option}
                      </span>
                      {/* Balloon knot */}
                      <div
                        className="absolute -bottom-1 w-3 h-3 rotate-45"
                        style={{
                          backgroundColor: b.color.ribbon,
                        }}
                      />
                    </div>
                    {/* Ribbon / String */}
                    <svg width="4" height="50" className="mt-0">
                      <path
                        d={`M 2 0 Q 0 15 3 25 Q 5 35 2 50`}
                        stroke={b.color.ribbon}
                        strokeWidth="2"
                        fill="none"
                        opacity="0.6"
                      />
                    </svg>
                  </motion.div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Read Aloud button */}
      <div className="relative z-10 flex justify-center pb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => speakText(question.questionText)}
          className="px-5 py-2.5 bg-white/80 rounded-2xl shadow-md text-purple-600 font-bold flex items-center gap-2 text-sm"
        >
          🔊 Read Again
        </motion.button>
      </div>
    </div>
  );
}
