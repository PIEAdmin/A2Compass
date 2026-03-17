import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import * as aiService from '../../../services/ai.service';
import type { Activity, StudentAssignment, AISuggestion } from '../../../types/content';
import { supabase } from '../../../services/supabase';

export default function AssignmentTool() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<'assign' | 'review'>('review');
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment form
  const [selectedActivity, setSelectedActivity] = useState<string>(searchParams.get('activity') || '');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  // Grading
  const [gradingAssignment, setGradingAssignment] = useState<StudentAssignment | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [feedbackSuggestion, setFeedbackSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => { if (user) loadData(); }, [user, statusFilter, dateFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [asn, act, { data: stu }] = await Promise.all([
        contentService.getTeacherAssignments(user!.id, { status: statusFilter || undefined, date: dateFilter || undefined }),
        contentService.getActivities(user!.id, { status: 'published' }),
        supabase.from('student_profiles').select('id, grade_level, profiles:profiles(first_name, last_name)'),
      ]);
      setAssignments(asn); setActivities(act); setStudents(stu || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleAssign() {
    if (!user || !selectedActivity || !selectedStudents.length) return;
    try {
      await contentService.assignActivity({
        student_ids: selectedStudents, activity_id: selectedActivity,
        assigned_date: assignDate, due_date: dueDate || undefined,
      }, user.id);
      setSelectedStudents([]); setSelectedActivity(''); setView('review'); loadData();
    } catch (err) { console.error(err); alert('Error assigning activity'); }
  }

  async function handleGrade() {
    if (!gradingAssignment || !gradeScore) return;
    await contentService.gradeAssignment(gradingAssignment.id, parseFloat(gradeScore), gradingAssignment.max_score, gradeFeedback);
    setGradingAssignment(null); setGradeScore(''); setGradeFeedback(''); loadData();
  }

  async function requestFeedbackAI(assignment: StudentAssignment) {
    if (!user) return;
    setAiLoading(true);
    try {
      const studentName = assignment.student?.profiles ? `${assignment.student.profiles.first_name} ${assignment.student.profiles.last_name}` : 'Student';
      const suggestion = await aiService.generateFeedbackDraft(user.id, {
        student_name: studentName, tier: 'scholars-guild',
        assignment_title: assignment.activity?.title || 'Assignment',
        submission_content: 'Student work summary', score: assignment.score || undefined,
        max_score: assignment.max_score, tone: 'encouraging',
      });
      setFeedbackSuggestion(suggestion);
      if (suggestion.suggestion.feedback_text) setGradeFeedback(suggestion.suggestion.feedback_text);
    } catch (err) { console.error(err); }
    finally { setAiLoading(false); }
  }

  const statusColors: Record<string, string> = {
    assigned: 'bg-blue-100 text-blue-800', in_progress: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-orange-100 text-orange-800', graded: 'bg-green-100 text-green-800',
    returned: 'bg-purple-100 text-purple-800', completed: 'bg-emerald-100 text-emerald-800',
    skipped: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📋 Assignments</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('review')} className={`px-3 py-1.5 rounded-lg text-sm ${view === 'review' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Review</button>
          <button onClick={() => setView('assign')} className={`px-3 py-1.5 rounded-lg text-sm ${view === 'assign' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>+ Assign</button>
        </div>
      </div>

      {view === 'assign' ? (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-lg">Assign Activity to Students</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Activity *</label>
            <select value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select an activity...</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.title} ({a.learning_format?.name})</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Students *</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedStudents.length === students.length} onChange={e => setSelectedStudents(e.target.checked ? students.map(s => s.id) : [])} />
                <span className="font-medium">Select All</span>
              </label>
              {students.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={e => setSelectedStudents(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                  {s.profiles?.first_name} {s.profiles?.last_name} <span className="text-gray-400">(Grade {s.grade_level})</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assign Date</label>
              <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          
          <button onClick={handleAssign} disabled={!selectedActivity || !selectedStudents.length} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Assign to {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''}
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">All Status</option>
              {Object.keys(statusColors).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No assignments found. Assign activities to start tracking progress!</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Activity</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignments.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{a.student?.profiles ? `${a.student.profiles.first_name} ${a.student.profiles.last_name}` : '—'}</td>
                      <td className="px-4 py-3 text-sm">{a.activity?.title || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3 text-sm">{a.percentage != null ? `${a.percentage.toFixed(0)}%` : '—'}{a.mastery_met && ' ⭐'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{a.assigned_date}</td>
                      <td className="px-4 py-3">
                        {a.status === 'submitted' && (
                          <button onClick={() => { setGradingAssignment(a); setGradeScore(''); setGradeFeedback(''); }} className="text-sm text-blue-600 hover:underline">Grade</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Grading Modal */}
      {gradingAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="font-semibold text-lg mb-4">Grade Assignment</h2>
            <p className="text-sm text-gray-500 mb-4">
              {gradingAssignment.student?.profiles?.first_name} — {gradingAssignment.activity?.title}
            </p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Score</label>
                  <input type="number" value={gradeScore} onChange={e => setGradeScore(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Score</label>
                  <input type="number" value={gradingAssignment.max_score} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Feedback</label>
                  <button onClick={() => requestFeedbackAI(gradingAssignment)} disabled={aiLoading} className="text-xs text-purple-600 hover:underline disabled:opacity-50">
                    {aiLoading ? '🔄 Generating...' : '🤖 AI Draft'}
                  </button>
                </div>
                <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={4} placeholder="Write encouraging, constructive feedback..." className="w-full px-3 py-2 border rounded-lg" />
                {feedbackSuggestion && <p className="text-xs text-purple-600 mt-1">AI suggestion applied — edit as needed</p>}
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button onClick={handleGrade} disabled={!gradeScore} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Submit Grade</button>
              <button onClick={() => setGradingAssignment(null)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
