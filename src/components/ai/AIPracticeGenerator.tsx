import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as aiService from '../../services/ai.service';
import type { AISuggestion } from '../../types/content';

interface Props {
  skillName: string;
  subject: string;
  tier: string;
  currentMastery: number;
  onAccept?: (questions: any[]) => void;
}

export default function AIPracticeGenerator({ skillName, subject, tier, currentMastery, onAccept }: Props) {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  async function generate() {
    if (!user) return;
    setLoading(true);
    try {
      const result = await aiService.generatePracticeQuestions(user.id, {
        skill_name: skillName, subject, tier, current_mastery: currentMastery,
        question_count: questionCount, difficulty,
      });
      setSuggestion(result);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function handleAccept() {
    if (suggestion?.suggestion?.questions && onAccept) {
      onAccept(suggestion.suggestion.questions);
      aiService.updateSuggestionStatus(suggestion.id, 'accepted');
      setSuggestion(null);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold mb-3">⚡ Generate Practice Questions</h3>
      <p className="text-sm text-gray-500 mb-3">Skill: <strong>{skillName}</strong> · Mastery: {currentMastery}%</p>
      
      {!suggestion ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div>
              <label className="text-xs text-gray-500">Questions</label>
              <select value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value))} className="block px-2 py-1 border rounded text-sm">
                {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="block px-2 py-1 border rounded text-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <button onClick={generate} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
            {loading ? '🔄 Generating...' : '🤖 Generate Questions'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-purple-700">Generated {suggestion.suggestion?.questions?.length || 0} questions — review before using:</p>
          {suggestion.suggestion?.questions?.map((q: any, i: number) => (
            <div key={i} className="p-3 bg-purple-50 rounded-lg text-sm">
              <p className="font-medium">{i + 1}. {q.question}</p>
              {q.type === 'multiple_choice' && <p className="text-xs text-gray-500 mt-1">Options: {q.options?.join(' | ')}</p>}
              <p className="text-xs text-green-600 mt-1">Answer: {q.correct_answer}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={handleAccept} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm">✓ Use These Questions</button>
            <button onClick={() => { aiService.updateSuggestionStatus(suggestion.id, 'rejected'); setSuggestion(null); }} className="px-3 py-1.5 bg-gray-200 rounded text-sm">✕ Regenerate</button>
          </div>
        </div>
      )}
    </div>
  );
}
