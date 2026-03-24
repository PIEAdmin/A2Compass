import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import {
  getOnboardingState,
  updateOnboardingStep,
  savePreferences,
  getPreferences,
  completeOrientation,
  OnboardingState,
  StudentPreferences,
} from '../../services/onboarding.service';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AVATAR_OPTIONS = ['🧒', '🧑‍🎨', '👩‍🚀', '🧑‍🔬', '🦸', '👸', '🤴', '🧙‍♂️', '🧑‍🎓', '🧑‍🌾', '🧑‍🍳', '🦹'];

const COLOR_OPTIONS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
];

const INTEREST_OPTIONS = [
  { label: 'Animals', icon: '🐾' },
  { label: 'Space', icon: '🚀' },
  { label: 'Sports', icon: '⚽' },
  { label: 'Art', icon: '🎨' },
  { label: 'Music', icon: '🎵' },
  { label: 'Dinosaurs', icon: '🦕' },
  { label: 'Ocean', icon: '🌊' },
  { label: 'Inventions', icon: '💡' },
  { label: 'History', icon: '🏰' },
  { label: 'Science', icon: '🔬' },
  { label: 'Stories', icon: '📖' },
  { label: 'Games', icon: '🎮' },
];

const LEARNING_STYLES = [
  { label: 'Pictures', icon: '🖼️', value: 'visual' },
  { label: 'Songs', icon: '🎵', value: 'auditory' },
  { label: 'Hands-on', icon: '🖐️', value: 'kinesthetic' },
];

const TOUR_PANELS = [
  {
    title: 'This is your Flight Plan ✈️',
    body: "— your daily mission hub! Every day you'll have new adventures waiting for you here.",
    emoji: '✈️',
  },
  {
    title: "You'll find your activities here",
    body: "organized just for you based on what you love! Whether it's animals, space, or art — it's all here.",
    emoji: '📋',
  },
  {
    title: 'Complete activities to earn badges and stars! 🌟',
    body: "The more you explore, the more you earn. Let's see how many badges you can collect!",
    emoji: '🏅',
  },
];

const TOTAL_STEPS = 8;

/* ------------------------------------------------------------------ */
/*  Styles (Tailwind keyframes via inline style tag)                   */
/* ------------------------------------------------------------------ */

const confettiCSS = `
@keyframes confetti-fall {
  0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes bounce-in {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.4s ease-out; }
.animate-bounce-in { animation: bounce-in 0.5s ease-out; }
.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  animation: confetti-fall 3s ease-in-out forwards;
}
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrientationWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);

  // Preferences state
  const [mode, setMode] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [favoriteColor, setFavoriteColor] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [goodAt, setGoodAt] = useState('');
  const [wantToLearn, setWantToLearn] = useState('');
  const [learningStyle, setLearningStyle] = useState('');
  const [makesSmile, setMakesSmile] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [tourPanel, setTourPanel] = useState(0);

  /* -------------------------------------------------------------- */
  /*  Init: Load existing state                                      */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const state = await getOnboardingState(user.id);
        setOnboarding(state);

        const prefs = await getPreferences(user.id);
        if (prefs) {
          if (prefs.avatar_config && (prefs.avatar_config as Record<string, string>).emoji) {
            setAvatar((prefs.avatar_config as Record<string, string>).emoji);
          }
          if (prefs.display_name) setDisplayName(prefs.display_name);
          if (prefs.favorite_color) setFavoriteColor(prefs.favorite_color);
          if (prefs.interests) setInterests(prefs.interests);
          if (prefs.good_at) setGoodAt(prefs.good_at);
          if (prefs.want_to_learn) setWantToLearn(prefs.want_to_learn);
          if (prefs.learning_style) setLearningStyle(prefs.learning_style);
          if (prefs.makes_me_smile) setMakesSmile(prefs.makes_me_smile);
        }

        // Resume from last incomplete step
        if (state.orientation_complete) {
          navigate('/warm-activities');
          return;
        }
        if (state.tour_complete) setStep(8);
        else if (state.questions_complete) setStep(7);
        else if (state.interests_complete) setStep(6);
        else if (state.color_complete) setStep(5);
        else if (state.display_name_complete) setStep(4);
        else if (state.avatar_complete) setStep(3);
        else if (state.welcome_seen) setStep(2);
        else setStep(1);
      } catch (err) {
        setError('Something went wrong loading your progress. Please try again!');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, navigate]);

  /* -------------------------------------------------------------- */
  /*  Helpers                                                        */
  /* -------------------------------------------------------------- */

  const persist = useCallback(
    async (stepKey: string, value: boolean | string, prefs?: Partial<StudentPreferences>) => {
      if (!user?.id) return;
      setSaving(true);
      try {
        await updateOnboardingStep(user.id, stepKey, value);
        if (prefs) await savePreferences(user.id, prefs);
      } catch (err) {
        console.error(err);
        setError('Could not save your progress — please try again.');
      } finally {
        setSaving(false);
      }
    },
    [user?.id],
  );

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const toggleInterest = (label: string) => {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
    );
  };

  /* -------------------------------------------------------------- */
  /*  Finish orientation                                             */
  /* -------------------------------------------------------------- */

  const handleFinish = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await completeOrientation(user.id);
      navigate('/warm-activities');
    } catch (err) {
      console.error(err);
      setError('Could not finalize — please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Render helpers                                                 */
  /* -------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-indigo-50 to-white p-6 text-center">
        <p className="text-lg text-red-600">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Progress dots                                                  */
  /* -------------------------------------------------------------- */

  const ProgressDots = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-full transition-all duration-300 ${
            i + 1 === step ? 'w-8 bg-indigo-600' : i + 1 < step ? 'w-2.5 bg-indigo-400' : 'w-2.5 bg-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const AudioButton = () => (
    <button
      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg hover:bg-indigo-200 transition"
      title="Listen"
      aria-label="Listen to instructions"
    >
      🔊
    </button>
  );

  const BackButton = () =>
    step > 1 && step < TOTAL_STEPS ? (
      <button
        onClick={back}
        className="mb-2 text-sm text-indigo-500 hover:text-indigo-700 transition"
      >
        ← Back
      </button>
    ) : null;

  const PrimaryButton = ({
    onClick,
    disabled,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || saving}
      className="mt-6 h-14 w-full rounded-2xl bg-indigo-600 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
    >
      {saving ? 'Saving…' : children}
    </button>
  );

  /* -------------------------------------------------------------- */
  /*  Step renderers                                                 */
  /* -------------------------------------------------------------- */

  const renderStep = () => {
    switch (step) {
      /* ---- Step 1: Welcome ---- */
      case 1:
        return (
          <div className="animate-fade-in flex flex-col items-center gap-6 text-center">
            <span className="text-7xl">🌟</span>
            <h1 className="text-3xl font-bold text-indigo-800">Welcome to A² Compass!</h1>
            <p className="text-lg text-gray-600">
              Hi there! I'm Sandra, your learning guide. We're going to set up your very own
              learning space together. It'll be fun — I promise! 😊
            </p>

            <div className="flex w-full flex-col gap-3 pt-2">
              <p className="text-sm font-medium text-gray-500">Who's joining today?</p>
              {[
                { label: "I'm here with my parent 👨‍👩‍👧", value: 'with_parent' },
                { label: "I'm exploring on my own 🚀", value: 'solo' },
                { label: "I'm a parent setting up 👤", value: 'parent' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`h-14 rounded-2xl border-2 text-lg font-medium transition-all ${
                    mode === opt.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <PrimaryButton
              disabled={!mode}
              onClick={async () => {
                await persist('welcome_seen', true);
                await persist('onboarding_mode', mode);
                next();
              }}
            >
              Let's Get Started! 🎉
            </PrimaryButton>
          </div>
        );

      /* ---- Step 2: Avatar Creator ---- */
      case 2:
        return (
          <div className="animate-fade-in flex flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Pick Your Avatar! 🎭</h2>
            <p className="text-gray-600">Choose a character that represents you.</p>

            <div className="grid grid-cols-4 gap-4">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl text-4xl transition-all hover:scale-105 ${
                    avatar === emoji
                      ? 'ring-4 ring-indigo-500 ring-offset-2 bg-indigo-50 scale-110'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {avatar && (
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="text-5xl animate-bounce-in">{avatar}</span>
                <p className="text-sm text-gray-500">Great choice!</p>
              </div>
            )}

            <PrimaryButton
              disabled={!avatar}
              onClick={async () => {
                await persist('avatar_complete', true, { avatar_config: { emoji: avatar } });
                next();
              }}
            >
              That's Me! →
            </PrimaryButton>
          </div>
        );

      /* ---- Step 3: Display Name ---- */
      case 3:
        return (
          <div className="animate-fade-in flex flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-bold text-indigo-800">What Should We Call You? 🏷️</h2>

            {avatar && <span className="text-6xl">{avatar}</span>}

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your cool name here..."
              maxLength={30}
              className="h-14 w-full rounded-2xl border-2 border-gray-200 px-5 text-center text-xl font-medium text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition"
            />

            {displayName && (
              <div className="rounded-xl bg-indigo-50 px-6 py-3">
                <p className="text-sm text-gray-500">Preview</p>
                <p className="text-xl font-bold text-indigo-700">
                  {avatar} {displayName}
                </p>
              </div>
            )}

            <PrimaryButton
              disabled={!displayName.trim()}
              onClick={async () => {
                await persist('display_name_complete', true, { display_name: displayName.trim() });
                next();
              }}
            >
              That's My Name! →
            </PrimaryButton>
          </div>
        );

      /* ---- Step 4: Favorite Color ---- */
      case 4:
        return (
          <div className="animate-fade-in flex flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Pick Your Favorite Color! 🎨</h2>
            <p className="text-gray-600">This will make your space feel like YOU.</p>

            <div className="grid grid-cols-4 gap-4">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFavoriteColor(c.value)}
                  className={`flex h-16 w-16 items-center justify-center rounded-full transition-all hover:scale-110 ${
                    favoriteColor === c.value ? 'ring-4 ring-offset-2 ring-indigo-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {favoriteColor === c.value && (
                    <span className="text-white text-xl font-bold drop-shadow">✓</span>
                  )}
                </button>
              ))}
            </div>

            {favoriteColor && (
              <div
                className="rounded-xl p-4 text-white font-semibold shadow-md transition-all"
                style={{ backgroundColor: favoriteColor }}
              >
                {avatar} {displayName}'s Space
              </div>
            )}

            <PrimaryButton
              disabled={!favoriteColor}
              onClick={async () => {
                await persist('color_complete', true, { favorite_color: favoriteColor });
                next();
              }}
            >
              Love It! →
            </PrimaryButton>
          </div>
        );

      /* ---- Step 5: Interest Picker ---- */
      case 5:
        return (
          <div className="animate-fade-in flex flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-bold text-indigo-800">What Do You Love? 💖</h2>
            <p className="text-gray-600">Pick as many as you like!</p>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {INTEREST_OPTIONS.map((item) => {
                const selected = interests.includes(item.label);
                return (
                  <button
                    key={item.label}
                    onClick={() => toggleInterest(item.label)}
                    className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-sm font-medium transition-all ${
                      selected
                        ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700 scale-105'
                        : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                    style={selected ? { animation: 'bounce-in 0.3s ease-out' } : undefined}
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {interests.length > 0 && (
              <p className="text-sm text-indigo-600 font-medium">
                {interests.length} selected — awesome!
              </p>
            )}

            <PrimaryButton
              disabled={interests.length === 0}
              onClick={async () => {
                await persist('interests_complete', true, { interests });
                next();
              }}
            >
              Next! →
            </PrimaryButton>
          </div>
        );

      /* ---- Step 6: Get-to-Know-You ---- */
      case 6: {
        const questions = [
          {
            key: 'goodAt',
            prompt: "What's something you're really good at? 🌟",
            type: 'text' as const,
          },
          {
            key: 'wantToLearn',
            prompt: "What's one thing you wish you knew more about? 🔍",
            type: 'text' as const,
          },
          {
            key: 'learningStyle',
            prompt: 'Do you like learning with pictures, songs, or hands-on activities?',
            type: 'choice' as const,
          },
          {
            key: 'makesSmile',
            prompt: 'What makes you smile when you\'re learning? 😊',
            type: 'text' as const,
          },
        ];

        const q = questions[questionIndex];

        const currentValue =
          q.key === 'goodAt'
            ? goodAt
            : q.key === 'wantToLearn'
              ? wantToLearn
              : q.key === 'learningStyle'
                ? learningStyle
                : makesSmile;

        const setValue = (v: string) => {
          if (q.key === 'goodAt') setGoodAt(v);
          else if (q.key === 'wantToLearn') setWantToLearn(v);
          else if (q.key === 'learningStyle') setLearningStyle(v);
          else setMakesSmile(v);
        };

        const isLast = questionIndex === questions.length - 1;

        return (
          <div className="animate-fade-in flex flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Getting to Know You! 🤗</h2>
            <p className="text-sm text-gray-500">
              Question {questionIndex + 1} of {questions.length}
            </p>

            <p className="text-lg font-medium text-gray-700">{q.prompt}</p>

            {q.type === 'text' ? (
              <textarea
                value={currentValue}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Type your answer here..."
                rows={3}
                className="w-full rounded-2xl border-2 border-gray-200 p-4 text-lg text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition resize-none"
              />
            ) : (
              <div className="flex w-full gap-3">
                {LEARNING_STYLES.map((ls) => (
                  <button
                    key={ls.value}
                    onClick={() => setValue(ls.value)}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-2xl p-4 transition-all ${
                      learningStyle === ls.value
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-3xl">{ls.icon}</span>
                    <span className="text-sm font-medium">{ls.label}</span>
                  </button>
                ))}
              </div>
            )}

            <PrimaryButton
              disabled={!currentValue.trim()}
              onClick={async () => {
                if (isLast) {
                  await persist('questions_complete', true, {
                    good_at: goodAt,
                    want_to_learn: wantToLearn,
                    learning_style: learningStyle,
                    makes_me_smile: makesSmile,
                  });
                  next();
                } else {
                  setQuestionIndex((i) => i + 1);
                }
              }}
            >
              {isLast ? "All Done! →" : "Next Question →"}
            </PrimaryButton>

            {questionIndex > 0 && (
              <button
                onClick={() => setQuestionIndex((i) => i - 1)}
                className="text-sm text-indigo-500 hover:text-indigo-700"
              >
                ← Previous Question
              </button>
            )}
          </div>
        );
      }

      /* ---- Step 7: Flight Plan Tour ---- */
      case 7: {
        const panel = TOUR_PANELS[tourPanel];
        return (
          <div className="animate-fade-in flex flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-bold text-indigo-800">Your Flight Plan Tour 🗺️</h2>
            <p className="text-sm text-gray-500">
              {tourPanel + 1} of {TOUR_PANELS.length}
            </p>

            <div className="w-full rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 p-8 shadow-sm">
              <span className="text-6xl">{panel.emoji}</span>
              <h3 className="mt-4 text-xl font-bold text-indigo-800">{panel.title}</h3>
              <p className="mt-2 text-gray-600">{panel.body}</p>
            </div>

            <div className="flex gap-2">
              {TOUR_PANELS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full transition-all ${
                    i === tourPanel ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <PrimaryButton
              onClick={async () => {
                if (tourPanel < TOUR_PANELS.length - 1) {
                  setTourPanel((p) => p + 1);
                } else {
                  await persist('tour_complete', true);
                  next();
                }
              }}
            >
              {tourPanel < TOUR_PANELS.length - 1 ? 'Next →' : "I'm Ready! 🚀"}
            </PrimaryButton>

            {tourPanel > 0 && (
              <button
                onClick={() => setTourPanel((p) => p - 1)}
                className="text-sm text-indigo-500 hover:text-indigo-700"
              >
                ← Back
              </button>
            )}
          </div>
        );
      }

      /* ---- Step 8: Badge Celebration ---- */
      case 8:
        return (
          <div className="animate-fade-in relative flex flex-col items-center gap-5 overflow-hidden text-center">
            {/* Confetti */}
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'][
                      i % 7
                    ],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            <h2 className="text-2xl font-bold text-indigo-800">🎉 Congratulations! 🎉</h2>

            <div className="animate-bounce-in flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-6xl shadow-lg">
              🌟
            </div>

            <h3 className="text-xl font-bold text-amber-600">Welcome Explorer Badge</h3>
            <p className="text-gray-600">
              You earned your first badge! You're officially an A² Compass Explorer!
            </p>

            <div className="rounded-xl bg-indigo-50 px-6 py-4">
              <p className="text-lg font-semibold text-indigo-700">
                {avatar} {displayName}
              </p>
              <p className="text-sm text-indigo-500">A² Compass Explorer</p>
            </div>

            <PrimaryButton onClick={handleFinish}>
              Start Exploring →
            </PrimaryButton>
          </div>
        );

      default:
        return null;
    }
  };

  /* -------------------------------------------------------------- */
  /*  Main layout                                                    */
  /* -------------------------------------------------------------- */

  return (
    <>
      <style>{confettiCSS}</style>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-purple-50 p-4">
        <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
          <AudioButton />
          <ProgressDots />
          <BackButton />
          {renderStep()}
        </div>
      </div>
    </>
  );
}
