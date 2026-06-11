import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { supabase } from '../../services/supabase';
import { ReadAloud } from '../../components/shared/ReadAloud';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface VocabWord {
  spanish: string;
  english: string;
  emoji: string;
}

interface SkillNode {
  id: string;
  emoji: string;
  spanishName: string;
  englishName: string;
  words: VocabWord[];
}

interface QuizState {
  active: boolean;
  currentIndex: number;
  score: number;
  total: number;
  options: VocabWord[];
  answered: boolean;
  correct: boolean;
  finished: boolean;
}

// ─── Vocabulary Data ────────────────────────────────────────────────────────────

const SKILLS: SkillNode[] = [
  {
    id: 'saludos',
    emoji: '👋',
    spanishName: 'Saludos',
    englishName: 'Greetings',
    words: [
      { spanish: 'Hola', english: 'Hello', emoji: '👋' },
      { spanish: 'Adiós', english: 'Goodbye', emoji: '👋' },
      { spanish: 'Buenos días', english: 'Good morning', emoji: '☀️' },
      { spanish: 'Buenas noches', english: 'Good night', emoji: '🌙' },
      { spanish: 'Por favor', english: 'Please', emoji: '🙏' },
      { spanish: 'Gracias', english: 'Thank you', emoji: '💝' },
    ],
  },
  {
    id: 'colores',
    emoji: '🎨',
    spanishName: 'Colores',
    englishName: 'Colors',
    words: [
      { spanish: 'Rojo', english: 'Red', emoji: '🔴' },
      { spanish: 'Azul', english: 'Blue', emoji: '🔵' },
      { spanish: 'Verde', english: 'Green', emoji: '🟢' },
      { spanish: 'Amarillo', english: 'Yellow', emoji: '🟡' },
      { spanish: 'Morado', english: 'Purple', emoji: '🟣' },
      { spanish: 'Naranja', english: 'Orange', emoji: '🟠' },
      { spanish: 'Rosa', english: 'Pink', emoji: '🩷' },
      { spanish: 'Blanco', english: 'White', emoji: '⚪' },
    ],
  },
  {
    id: 'numeros',
    emoji: '🔢',
    spanishName: 'Números',
    englishName: 'Numbers 1-10',
    words: [
      { spanish: 'Uno', english: 'One', emoji: '1️⃣' },
      { spanish: 'Dos', english: 'Two', emoji: '2️⃣' },
      { spanish: 'Tres', english: 'Three', emoji: '3️⃣' },
      { spanish: 'Cuatro', english: 'Four', emoji: '4️⃣' },
      { spanish: 'Cinco', english: 'Five', emoji: '5️⃣' },
      { spanish: 'Seis', english: 'Six', emoji: '6️⃣' },
      { spanish: 'Siete', english: 'Seven', emoji: '7️⃣' },
      { spanish: 'Ocho', english: 'Eight', emoji: '8️⃣' },
      { spanish: 'Nueve', english: 'Nine', emoji: '9️⃣' },
      { spanish: 'Diez', english: 'Ten', emoji: '🔟' },
    ],
  },
  {
    id: 'familia',
    emoji: '👨‍👩‍👧‍👦',
    spanishName: 'La Familia',
    englishName: 'Family',
    words: [
      { spanish: 'Mamá', english: 'Mom', emoji: '👩' },
      { spanish: 'Papá', english: 'Dad', emoji: '👨' },
      { spanish: 'Abuela', english: 'Grandma', emoji: '👵' },
      { spanish: 'Abuelo', english: 'Grandpa', emoji: '👴' },
      { spanish: 'Hermano', english: 'Brother', emoji: '👦' },
      { spanish: 'Hermana', english: 'Sister', emoji: '👧' },
      { spanish: 'Bebé', english: 'Baby', emoji: '👶' },
      { spanish: 'Tía', english: 'Aunt', emoji: '👩' },
      { spanish: 'Tío', english: 'Uncle', emoji: '👨' },
    ],
  },
  {
    id: 'comida',
    emoji: '🍎',
    spanishName: 'La Comida',
    englishName: 'Food',
    words: [
      { spanish: 'Manzana', english: 'Apple', emoji: '🍎' },
      { spanish: 'Pan', english: 'Bread', emoji: '🍞' },
      { spanish: 'Leche', english: 'Milk', emoji: '🥛' },
      { spanish: 'Arroz', english: 'Rice', emoji: '🍚' },
      { spanish: 'Pollo', english: 'Chicken', emoji: '🍗' },
      { spanish: 'Agua', english: 'Water', emoji: '💧' },
      { spanish: 'Huevo', english: 'Egg', emoji: '🥚' },
      { spanish: 'Plátano', english: 'Banana', emoji: '🍌' },
    ],
  },
  {
    id: 'animales',
    emoji: '🐶',
    spanishName: 'Los Animales',
    englishName: 'Animals',
    words: [
      { spanish: 'Perro', english: 'Dog', emoji: '🐶' },
      { spanish: 'Gato', english: 'Cat', emoji: '🐱' },
      { spanish: 'Pájaro', english: 'Bird', emoji: '🐦' },
      { spanish: 'Pez', english: 'Fish', emoji: '🐟' },
      { spanish: 'Mariposa', english: 'Butterfly', emoji: '🦋' },
      { spanish: 'Caballo', english: 'Horse', emoji: '🐴' },
      { spanish: 'Vaca', english: 'Cow', emoji: '🐄' },
      { spanish: 'Conejo', english: 'Rabbit', emoji: '🐰' },
    ],
  },
  {
    id: 'cuerpo',
    emoji: '🖐️',
    spanishName: 'El Cuerpo',
    englishName: 'Body Parts',
    words: [
      { spanish: 'Cabeza', english: 'Head', emoji: '🗣️' },
      { spanish: 'Manos', english: 'Hands', emoji: '🖐️' },
      { spanish: 'Ojos', english: 'Eyes', emoji: '👀' },
      { spanish: 'Boca', english: 'Mouth', emoji: '👄' },
      { spanish: 'Pies', english: 'Feet', emoji: '🦶' },
      { spanish: 'Nariz', english: 'Nose', emoji: '👃' },
      { spanish: 'Orejas', english: 'Ears', emoji: '👂' },
    ],
  },
  {
    id: 'ropa',
    emoji: '👗',
    spanishName: 'La Ropa',
    englishName: 'Clothing',
    words: [
      { spanish: 'Camisa', english: 'Shirt', emoji: '👕' },
      { spanish: 'Pantalones', english: 'Pants', emoji: '👖' },
      { spanish: 'Zapatos', english: 'Shoes', emoji: '👟' },
      { spanish: 'Sombrero', english: 'Hat', emoji: '🎩' },
      { spanish: 'Vestido', english: 'Dress', emoji: '👗' },
      { spanish: 'Calcetines', english: 'Socks', emoji: '🧦' },
    ],
  },
  {
    id: 'acciones',
    emoji: '🏃',
    spanishName: 'Acciones',
    englishName: 'Actions',
    words: [
      { spanish: 'Correr', english: 'Run', emoji: '🏃' },
      { spanish: 'Saltar', english: 'Jump', emoji: '🦘' },
      { spanish: 'Comer', english: 'Eat', emoji: '🍽️' },
      { spanish: 'Dormir', english: 'Sleep', emoji: '😴' },
      { spanish: 'Bailar', english: 'Dance', emoji: '💃' },
      { spanish: 'Cantar', english: 'Sing', emoji: '🎤' },
      { spanish: 'Leer', english: 'Read', emoji: '📖' },
    ],
  },
  {
    id: 'frases',
    emoji: '💬',
    spanishName: 'Frases con la Familia',
    englishName: 'Family Phrases',
    words: [
      { spanish: '¿Cómo estás?', english: 'How are you?', emoji: '💬' },
      { spanish: 'Te quiero', english: 'I love you', emoji: '❤️' },
      { spanish: 'Me gusta', english: 'I like it', emoji: '👍' },
      { spanish: '¿Cómo te llamas?', english: 'What is your name?', emoji: '🏷️' },
      { spanish: 'Mucho gusto', english: 'Nice to meet you', emoji: '🤝' },
      { spanish: 'Tengo hambre', english: 'I am hungry', emoji: '🍽️' },
      { spanish: 'Vamos a jugar', english: "Let's play", emoji: '🎮' },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-MX';
  utterance.rate = 0.8;
  window.speechSynthesis.speak(utterance);
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickQuizOptions(words: VocabWord[], correctWord: VocabWord): VocabWord[] {
  const others = words.filter((w) => w.spanish !== correctWord.spanish);
  const shuffled = shuffleArray(others);
  const distractors = shuffled.slice(0, 3);
  return shuffleArray([correctWord, ...distractors]);
}

// ─── Confetti Particle ──────────────────────────────────────────────────────────

function ConfettiOverlay() {
  const particles = useMemo(() => {
    const colors = ['#C2591A', '#7BAE6E', '#87CEEB', '#FFD700', '#FF69B4', '#FF6347'];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-bounce"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${1.5 + Math.random()}s`,
            animationFillMode: 'forwards',
            animation: `confetti-fall ${1.5 + Math.random()}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function SpanishVillage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeSkill, setActiveSkill] = useState<SkillNode | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const [showConfetti, setShowConfetti] = useState(false);

  const [quiz, setQuiz] = useState<QuizState>({
    active: false,
    currentIndex: 0,
    score: 0,
    total: 0,
    options: [],
    answered: false,
    correct: false,
    finished: false,
  });

  // Load mastery from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spanish-village-mastery');
      if (saved) setMastery(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const saveMastery = useCallback(
    (updated: Record<string, number>) => {
      setMastery(updated);
      try {
        localStorage.setItem('spanish-village-mastery', JSON.stringify(updated));
      } catch {
        // ignore
      }
    },
    []
  );

  // ── Casita click ────────────────────────────────────────────────────────────
  const openSkill = useCallback((skill: SkillNode) => {
    setActiveSkill(skill);
    setFlashcardIndex(0);
    setQuiz({
      active: false,
      currentIndex: 0,
      score: 0,
      total: 0,
      options: [],
      answered: false,
      correct: false,
      finished: false,
    });
  }, []);

  const backToVillage = useCallback(() => {
    setActiveSkill(null);
    setShowConfetti(false);
  }, []);

  // ── Flashcard navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!activeSkill) return;
    setFlashcardIndex((i) => Math.min(i + 1, activeSkill.words.length - 1));
  }, [activeSkill]);

  const goBack = useCallback(() => {
    setFlashcardIndex((i) => Math.max(i - 1, 0));
  }, []);

  // ── Quiz logic ─────────────────────────────────────────────────────────────
  const startQuiz = useCallback(() => {
    if (!activeSkill) return;
    const shuffledWords = shuffleArray(activeSkill.words);
    const first = shuffledWords[0];
    const options = pickQuizOptions(activeSkill.words, first);
    setQuiz({
      active: true,
      currentIndex: 0,
      score: 0,
      total: shuffledWords.length,
      options,
      answered: false,
      correct: false,
      finished: false,
    });
    setTimeout(() => speak(first.spanish), 300);
  }, [activeSkill]);

  const quizWords = useMemo(() => {
    if (!activeSkill) return [];
    return shuffleArray(activeSkill.words);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSkill, quiz.active]);

  const handleQuizAnswer = useCallback(
    (selectedWord: VocabWord) => {
      if (!activeSkill || quiz.answered) return;
      const currentWord = quizWords[quiz.currentIndex];
      const isCorrect = selectedWord.spanish === currentWord.spanish;

      if (isCorrect) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

      setQuiz((prev) => ({
        ...prev,
        answered: true,
        correct: isCorrect,
        score: isCorrect ? prev.score + 1 : prev.score,
      }));
    },
    [activeSkill, quiz.answered, quiz.currentIndex, quizWords]
  );

  const nextQuizQuestion = useCallback(() => {
    if (!activeSkill) return;
    const nextIndex = quiz.currentIndex + 1;
    if (nextIndex >= quizWords.length) {
      // Quiz finished
      const finalScore = quiz.score;
      const total = quizWords.length;
      const pct = Math.round((finalScore / total) * 100);
      const updated = { ...mastery, [activeSkill.id]: Math.max(mastery[activeSkill.id] || 0, pct) };
      saveMastery(updated);
      setQuiz((prev) => ({ ...prev, finished: true, answered: false }));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      return;
    }
    const nextWord = quizWords[nextIndex];
    const options = pickQuizOptions(activeSkill.words, nextWord);
    setQuiz((prev) => ({
      ...prev,
      currentIndex: nextIndex,
      options,
      answered: false,
      correct: false,
    }));
    setTimeout(() => speak(nextWord.spanish), 300);
  }, [activeSkill, quiz.currentIndex, quiz.score, quizWords, mastery, saveMastery]);

  // ── Render: Quiz Finished ──────────────────────────────────────────────────
  if (activeSkill && quiz.active && quiz.finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #FFF8E7 0%, #87CEEB 100%)' }}>
        {showConfetti && <ConfettiOverlay />}
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full">
          <div className="text-7xl mb-4">🌟</div>
          <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#C2591A' }}>
            ¡Fantástico!
          </h2>
          <p className="text-xl text-gray-700 mb-6">
            You got <span className="font-bold" style={{ color: '#7BAE6E' }}>{quiz.score}</span> out of{' '}
            <span className="font-bold">{quiz.total}</span>!
          </p>
          <div className="flex gap-3 text-4xl justify-center mb-6">
            {Array.from({ length: quiz.score }, (_, i) => (
              <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>⭐</span>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={startQuiz}
              className="px-6 py-3 rounded-full text-white font-bold text-lg transition-transform hover:scale-105"
              style={{ backgroundColor: '#7BAE6E' }}
            >
              🎮 Play Again
            </button>
            <button
              onClick={backToVillage}
              className="px-6 py-3 rounded-full text-white font-bold text-lg transition-transform hover:scale-105"
              style={{ backgroundColor: '#C2591A' }}
            >
              🏘️ Back to Village
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Quiz Mode ──────────────────────────────────────────────────────
  if (activeSkill && quiz.active) {
    const currentWord = quizWords[quiz.currentIndex];
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #FFF8E7 0%, #87CEEB 100%)' }}>
        {showConfetti && <ConfettiOverlay />}
        <div className="max-w-xl mx-auto">
          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={backToVillage}
              className="text-sm font-semibold px-4 py-2 rounded-full bg-white shadow hover:shadow-md transition-shadow"
              style={{ color: '#C2591A' }}
            >
              ✕ Quit Quiz
            </button>
            <span className="text-sm font-bold text-gray-600">
              {quiz.currentIndex + 1} / {quiz.total}
            </span>
            <span className="text-sm font-bold" style={{ color: '#7BAE6E' }}>
              Score: {quiz.score}
            </span>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center mb-6">
            <p className="text-lg text-gray-500 mb-2">Which one is…</p>
            <h2 className="text-4xl font-extrabold mb-4" style={{ color: '#C2591A' }}>
              {currentWord.spanish}
            </h2>
            <button
              onClick={() => speak(currentWord.spanish)}
              className="px-5 py-2 rounded-full text-white font-bold transition-transform hover:scale-105"
              style={{ backgroundColor: '#87CEEB' }}
            >
              🔊 Listen
            </button>
          </div>

          {/* Emoji options */}
          <div className="grid grid-cols-2 gap-4">
            {quiz.options.map((opt) => {
              let bg = 'bg-white';
              let border = 'border-2 border-gray-200';
              let extraClass = '';
              if (quiz.answered) {
                if (opt.spanish === currentWord.spanish) {
                  bg = '';
                  border = 'border-2';
                  extraClass = 'animate-bounce';
                } else if (!quiz.correct && opt.spanish !== currentWord.spanish) {
                  // just keep default
                }
              }
              return (
                <button
                  key={opt.spanish}
                  onClick={() => handleQuizAnswer(opt)}
                  disabled={quiz.answered}
                  className={`${bg} ${border} ${extraClass} rounded-2xl p-6 text-center shadow-md transition-transform hover:scale-105 disabled:cursor-default`}
                  style={
                    quiz.answered && opt.spanish === currentWord.spanish
                      ? { backgroundColor: '#d4edda', borderColor: '#7BAE6E' }
                      : quiz.answered && opt.spanish !== currentWord.spanish
                        ? { opacity: 0.5 }
                        : {}
                  }
                >
                  <span className="text-5xl block mb-2">{opt.emoji}</span>
                  <span className="text-sm font-semibold text-gray-600">{opt.english}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {quiz.answered && (
            <div className="mt-6 text-center">
              {quiz.correct ? (
                <p className="text-2xl font-extrabold mb-4" style={{ color: '#7BAE6E' }}>
                  ✨ ¡Muy bien! ✨
                </p>
              ) : (
                <p className="text-2xl font-extrabold mb-4 animate-pulse" style={{ color: '#C2591A' }}>
                  Try again next time! 💪
                </p>
              )}
              <button
                onClick={nextQuizQuestion}
                className="px-8 py-3 rounded-full text-white font-bold text-lg transition-transform hover:scale-105"
                style={{ backgroundColor: '#C2591A' }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Flashcard Practice ─────────────────────────────────────────────
  if (activeSkill) {
    const word = activeSkill.words[flashcardIndex];
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #FFF8E7 0%, #87CEEB 100%)' }}>
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={backToVillage}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow font-semibold text-sm hover:shadow-md transition-shadow"
              style={{ color: '#C2591A' }}
            >
              ← Back to Village
            </button>
            <span className="text-sm text-gray-500 font-semibold">
              {flashcardIndex + 1} / {activeSkill.words.length}
            </span>
          </div>

          {/* Skill title */}
          <div className="text-center mb-6">
            <span className="text-4xl">{activeSkill.emoji}</span>
            <h2 className="text-2xl font-extrabold mt-1" style={{ color: '#C2591A' }}>
              {activeSkill.spanishName}
            </h2>
            <p className="text-gray-500">{activeSkill.englishName}</p>
          </div>

          {/* Flashcard */}
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center mb-6">
            <div className="text-8xl mb-4">{word.emoji}</div>
            <h3 className="text-5xl font-extrabold mb-2" style={{ color: '#C2591A' }}>
              {word.spanish}
            </h3>
            <p className="text-xl text-gray-500 mb-6">{word.english}</p>
            <button
              onClick={() => speak(word.spanish)}
              className="px-6 py-3 rounded-full text-white font-bold text-lg transition-transform hover:scale-110"
              style={{ backgroundColor: '#87CEEB' }}
            >
              🔊 Listen
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goBack}
              disabled={flashcardIndex === 0}
              className="px-6 py-3 rounded-full font-bold text-lg transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#FFF8E7', color: '#C2591A' }}
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={flashcardIndex === activeSkill.words.length - 1}
              className="px-6 py-3 rounded-full font-bold text-lg transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#FFF8E7', color: '#C2591A' }}
            >
              Next →
            </button>
          </div>

          {/* Quiz button */}
          <div className="text-center">
            <button
              onClick={startQuiz}
              className="px-8 py-4 rounded-full text-white font-extrabold text-xl shadow-lg transition-transform hover:scale-110"
              style={{ backgroundColor: '#7BAE6E' }}
            >
              🎮 Quiz Me!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Village Map ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #FFF8E7 40%, #FFF8E7 100%)' }}>
      {/* Top bar */}
      <div className="max-w-6xl mx-auto mb-6">
        <button
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow font-semibold text-sm hover:shadow-md transition-shadow"
          style={{ color: '#C2591A' }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <ReadAloud text="Bienvenidos al Pueblo! Welcome to the Village!">
          <h1
            className="text-3xl md:text-5xl font-extrabold mb-2 drop-shadow-sm"
            style={{ color: '#C2591A' }}
          >
            🏘️ ¡Bienvenidos al Pueblo!
          </h1>
        </ReadAloud>
        <p className="text-lg text-gray-600">Welcome to the Village! Tap a casita to start learning.</p>
      </div>

      {/* Casita Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {SKILLS.map((skill) => {
          const pct = mastery[skill.id] || 0;
          return (
            <button
              key={skill.id}
              onClick={() => openSkill(skill)}
              className="group relative flex flex-col items-center bg-white rounded-t-[2.5rem] rounded-b-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 p-4 pt-6 border-b-4"
              style={{ borderBottomColor: '#C2591A' }}
            >
              {/* Roof accent */}
              <div
                className="absolute -top-0 left-1/2 -translate-x-1/2 w-full h-6 rounded-t-[2.5rem]"
                style={{ backgroundColor: '#C2591A', opacity: 0.15 }}
              />
              <span className="text-4xl md:text-5xl mb-2 z-10 group-hover:scale-110 transition-transform">
                {skill.emoji}
              </span>
              <h3 className="text-sm md:text-base font-extrabold leading-tight" style={{ color: '#C2591A' }}>
                {skill.spanishName}
              </h3>
              <p className="text-xs text-gray-500 mb-3">{skill.englishName}</p>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#FFF8E7' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct >= 80 ? '#7BAE6E' : pct >= 40 ? '#FFD700' : '#87CEEB',
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-1 font-semibold">{pct}% mastered</span>
            </button>
          );
        })}
      </div>

      {/* Footer decoration */}
      <div className="text-center mt-12 text-4xl select-none">
        🌵 🌻 🏡 🌺 🌵
      </div>
    </div>
  );
}
