import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as aiService from '../../services/ai.service';
import type { AISuggestion } from '../../types/content';

interface Props {
  studentId: string;
  studentName: string;
  assessmentData: Array<{ subject: string; score: number; max_score: number; responses: Record<string, any> }>;
}

export default function AIDiagnosticPanel({ studentId, studentName, assessmentData }: Props) {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateDiagnostic() {
    if (!user) return;
    setLoading(true);
    try {
      const result = await aiService.generateDiagnosticSummary(user.id, {
        student_id: studentId, student_name: studentName,
        assessment_ids: [], assessment_data: assessmentData,
      });
      setSuggestion(result);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleAction(status: 'accepted' | 'rejected') {
    if (!suggestion) return;
    await aiService.updateSuggestionStatus(suggestion.id, status);
    if (status === 'rejected') setSuggestion(null);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">🧠 Smart Diagnostic — {studentName}</h3>
        {!suggestion && (
          <button onClick={generateDiagnostic} disabled={loading} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 disabled:opacity-50">
            {loading ? '🔄 Analyzing...' : '🤖 Generate Diagnostic'}
          </button>
        )}
      </div>

      {suggestion?.suggestion && (
        <div className="space-y-4">
          {suggestion.suggestion.summary && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
              <p className="text-sm text-gray-600">{suggestion.suggestion.summary}</p>
            </div>
          )}

          {suggestion.suggestion.focus_areas && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Focus Areas</h4>
              <div className="space-y-2">
                {suggestion.suggestion.focus_areas.map((area: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                    <span className="w-5 h-5 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-purple-800">{area.skill || area.area}</p>
                      <p className="text-xs text-purple-600">{area.recommendation || area.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestion.suggestion.strengths && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Strengths</h4>
              <ul className="text-sm text-green-700 list-disc list-inside">
                {suggestion.suggestion.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <button onClick={() => handleAction('accepted')} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm">✓ Accept & Use</button>
            <button onClick={() => handleAction('rejected')} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">✕ Dismiss</button>
          </div>
        </div>
      )}

      {!suggestion && assessmentData.length > 0 && (
        <div className="text-sm text-gray-500">
          <p>{assessmentData.length} assessments available for analysis</p>
          <div className="flex gap-2 mt-2">
            {assessmentData.map((a, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{a.subject}: {((a.score / a.max_score) * 100).toFixed(0)}%</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
