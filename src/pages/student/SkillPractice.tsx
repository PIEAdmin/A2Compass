import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { completePlaylistItem } from '../../services/skills.service';

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

  // Load playlist item and activity
  useEffect(() => {
    if (!playlistItemId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1. Load the playlist item to get skill_node_id
        const { data: item, error: itemError } = await supabase
          .from('student_playlist')
          .select('id, skill_node_id, skill:skill_nodes(id, name, code, domain:skill_domains(name, code))')
          .eq('id', playlistItemId)
          .single();

        if (itemError) throw new Error('Could not find this skill assignment.');
        setPlaylistItem(item as any);

        // 2. Load the practice_arena activity for this skill
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

        // Parse content if it's a string
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

  const handleSelectAnswer = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null || !current) return;
    setAnswered(true);
    if (selectedAnswer === current.correct) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = useCallback(async () => {
    if (currentQuestion + 1 < totalQuestions) {
      setCurrentQuestion((q) => q + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setShowHint(false);
    } else {
      // Quiz complete!
      setFinished(true);
      // Calculate the final correct count (include the last answer)
      const finalCorrect = correctCount + (selectedAnswer === current?.correct ? 1 : 0);

      try {
        setSubmitting(true);
        await completePlaylistItem(playlistItemId!, finalCorrect, totalQuestions);
      } catch (err) {
        console.error('Failed to save score:', err);
        // Still show results even if save fails
      } finally {
        setSubmitting(false);
      }
    }
  }, [currentQuestion, totalQuestions, correctCount, selectedAnswer, current, playlistItemId]);

  const finalScore = finished
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;
  const passed = finalScore >= 85;

  // --- LOADING ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-4">Loading activity...</p>
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-3xl mb-2">😕</p>
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => navigate('/student')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Flight Plan
          </button>
        </div>
      </div>
    );
  }

  // --- FINISHED ---
  if (finished) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className={`rounded-xl shadow-sm border p-8 text-center ${passed ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'}`}>
          <p className="text-5xl mb-4">{passed ? '🎉' : '💪'}</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {passed ? 'Amazing Job!' : 'Good Effort!'}
          </h2>
          <p className="text-gray-600 mt-2">
            {playlistItem?.skill?.name}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <div className={`text-4xl font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}>
              {finalScore}%
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {correctCount} of {totalQuestions} correct
          </p>

          {passed ? (
            <div className="mt-4 bg-green-100 rounded-lg p-3">
              <p className="text-green-700 font-medium">⭐ Skill Mastered!</p>
            </div>
          ) : (
            <div className="mt-4 bg-orange-100 rounded-lg p-3">
              <p className="text-orange-700 font-medium">Keep practicing — you need 85% to master this skill!</p>
            </div>
          )}

          {submitting && (
            <p className="text-sm text-gray-400 mt-3">Saving your score...</p>
          )}

          <button
            onClick={() => navigate('/student')}
            className="mt-6 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Flight Plan 🚀
          </button>
        </div>
      </div>
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

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {playlistItem?.skill?.domain?.name || 'Skill'}
            </p>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {activity?.title || playlistItem?.skill?.name}
            </h1>
          </div>
          <button
            onClick={() => navigate('/student')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Question {currentQuestion + 1} of {totalQuestions}</span>
            <span>{correctCount} correct so far</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Instructions (shown only before first answer) */}
      {currentQuestion === 0 && !answered && activity?.content?.instructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-700 text-sm">{activity.content.instructions}</p>
        </div>
      )}

      {/* Question */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="text-lg font-semibold text-gray-900 leading-relaxed">
          {current.question}
        </h2>

        {/* Options */}
        <div className="mt-4 space-y-2">
          {current.options.map((option, idx) => {
            let bgClass = 'bg-gray-50 border-gray-200 hover:bg-gray-100';
            if (selectedAnswer === idx && !answered) {
              bgClass = 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200';
            }
            if (answered) {
              if (idx === current.correct) {
                bgClass = 'bg-green-50 border-green-400';
              } else if (idx === selectedAnswer && idx !== current.correct) {
                bgClass = 'bg-red-50 border-red-400';
              } else {
                bgClass = 'bg-gray-50 border-gray-200 opacity-50';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                disabled={answered}
                className={`w-full text-left p-3 rounded-lg border transition-all ${bgClass}`}
              >
                <span className="text-sm font-medium text-gray-800">
                  {String.fromCharCode(65 + idx)}.{' '}
                </span>
                <span className="text-sm text-gray-700">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        {!answered && current.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="mt-3 text-sm text-indigo-500 hover:text-indigo-700"
          >
            {showHint ? 'Hide hint' : '💡 Need a hint?'}
          </button>
        )}
        {showHint && !answered && current.hint && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">{current.hint}</p>
          </div>
        )}

        {/* Explanation after answering */}
        {answered && current.explanation && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡</strong> {current.explanation}
            </p>
          </div>
        )}

        {/* Feedback after answering */}
        {answered && (
          <div className={`mt-3 p-3 rounded-lg ${selectedAnswer === current.correct ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className={`text-sm font-medium ${selectedAnswer === current.correct ? 'text-green-700' : 'text-red-700'}`}>
              {selectedAnswer === current.correct ? '✅ Correct!' : `❌ The answer is ${String.fromCharCode(65 + current.correct)}. ${current.options[current.correct]}`}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!answered ? (
          <button
            onClick={handleCheckAnswer}
            disabled={selectedAnswer === null}
            className={`flex-1 py-3 rounded-lg font-medium text-white transition-colors ${
              selectedAnswer === null
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            {currentQuestion + 1 < totalQuestions ? 'Next Question →' : 'See Results 🎯'}
          </button>
        )}
      </div>
    </div>
  );
}
