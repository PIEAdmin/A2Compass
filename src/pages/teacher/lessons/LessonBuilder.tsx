import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import * as aiService from '../../../services/ai.service';
import type { Lesson, LessonFormData, Activity, AISuggestion } from '../../../types/content';

const EMPTY_LESSON: LessonFormData = {
  title: '', description: '', subject_id: '', tier_id: '',
  objectives: [''], content: {}, tags: [], status: 'draft',
};

export default function LessonBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<LessonFormData>(EMPTY_LESSON);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [tagInput, setTagInput] = useState('');
  const isEdit = !!id;

  useEffect(() => {
    loadReferenceData();
    if (id) loadLesson(id);
  }, [id]);

  async function loadReferenceData() {
    const [s, t] = await Promise.all([contentService.getSubjects(), contentService.getTiers()]);
    setSubjects(s || []);
    setTiers(t || []);
  }

  async function loadLesson(lessonId: string) {
    const data = await contentService.getLesson(lessonId);
    setLesson(data);
    setForm({
      title: data.title, description: data.description || '', subject_id: data.subject_id || '',
      tier_id: data.tier_id || '', objectives: data.objectives?.length ? data.objectives : [''],
      content: data.content || {}, tags: data.tags || [], status: data.status,
    });
  }

  async function handleSave(publish = false) {
    if (!user) return;
    setSaving(true);
    try {
      const saveData = { ...form, status: publish ? 'published' as const : form.status };
      if (isEdit && id) {
        await contentService.updateLesson(id, saveData);
      } else {
        const newLesson = await contentService.createLesson(user.id, saveData);
        navigate(`/teacher/lessons/${newLesson.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally { setSaving(false); }
  }

  async function handleAISuggest() {
    if (!user || !form.title) return;
    setAiLoading(true);
    try {
      const selectedSubject = subjects.find(s => s.id === form.subject_id);
      const selectedTier = tiers.find(t => t.id === form.tier_id);
      const suggestion = await aiService.generateLessonSuggestions(user.id, {
        topic: form.title,
        subject: selectedSubject?.name || 'General',
        tier: selectedTier?.slug || 'scholars-guild',
        grade_level: selectedTier?.grade_range_start || 5,
        additional_context: form.description,
      });
      setAiSuggestion(suggestion);
    } catch (err) {
      console.error('AI error:', err);
    } finally { setAiLoading(false); }
  }

  function applyAISuggestion() {
    if (!aiSuggestion?.suggestion) return;
    const s = aiSuggestion.suggestion;
    if (s.objectives?.length) setForm(f => ({ ...f, objectives: s.objectives }));
    if (s.questions?.length) setForm(f => ({ ...f, content: { ...f.content, discussion_questions: s.questions } }));
    aiService.updateSuggestionStatus(aiSuggestion.id, 'accepted');
    setAiSuggestion(null);
  }

  function addObjective() { setForm(f => ({ ...f, objectives: [...f.objectives, ''] })); }
  function updateObjective(idx: number, val: string) { setForm(f => ({ ...f, objectives: f.objectives.map((o, i) => i === idx ? val : o) })); }
  function removeObjective(idx: number) { setForm(f => ({ ...f, objectives: f.objectives.filter((_, i) => i !== idx) })); }
  function addTag() { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(''); } }
  function removeTag(tag: string) { setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) })); }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/teacher/lessons')} className="text-sm text-blue-600 hover:underline mb-1">← Back to Lessons</button>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Lesson' : 'Create New Lesson'}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            Publish
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Title & Description */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium mb-1">Lesson Title *</label>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Introduction to Fractions" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          
          <label className="block text-sm font-medium mb-1 mt-4">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief overview of what students will learn..." rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tier</label>
              <select value={form.tier_id} onChange={e => setForm(f => ({ ...f, tier_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select tier...</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Learning Objectives</h2>
            <button onClick={handleAISuggest} disabled={aiLoading || !form.title} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50">
              {aiLoading ? '🔄 Generating...' : '🤖 AI Suggest'}
            </button>
          </div>
          
          {form.objectives.map((obj, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <span className="text-gray-400 mt-2 text-sm">{i + 1}.</span>
              <input type="text" value={obj} onChange={e => updateObjective(i, e.target.value)} placeholder="Students will be able to..." className="flex-1 px-3 py-2 border rounded-lg" />
              {form.objectives.length > 1 && <button onClick={() => removeObjective(i)} className="text-red-500 hover:text-red-700">✕</button>}
            </div>
          ))}
          <button onClick={addObjective} className="text-sm text-blue-600 hover:underline mt-1">+ Add objective</button>
        </div>

        {/* AI Suggestion Panel */}
        {aiSuggestion && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-800">🤖 AI Suggestions</h3>
              <span className="text-xs text-purple-600">Review and edit before applying</span>
            </div>
            
            {aiSuggestion.suggestion.objectives && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-purple-700 mb-1">Suggested Objectives:</h4>
                <ul className="list-disc list-inside text-sm text-purple-800 space-y-1">
                  {aiSuggestion.suggestion.objectives.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                </ul>
              </div>
            )}
            
            {aiSuggestion.suggestion.questions && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-purple-700 mb-1">Discussion Questions:</h4>
                <ul className="list-disc list-inside text-sm text-purple-800 space-y-1">
                  {aiSuggestion.suggestion.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
            
            {aiSuggestion.suggestion.activity_variations && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-purple-700 mb-1">Activity Variations:</h4>
                <ul className="list-disc list-inside text-sm text-purple-800 space-y-1">
                  {aiSuggestion.suggestion.activity_variations.map((v: string, i: number) => <li key={i}>{v}</li>)}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              <button onClick={applyAISuggestion} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">✓ Apply Suggestions</button>
              <button onClick={() => { aiService.updateSuggestionStatus(aiSuggestion.id, 'rejected'); setAiSuggestion(null); }} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">✕ Dismiss</button>
            </div>
          </div>
        )}

        {/* Lesson Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Lesson Content</h2>
          <textarea value={form.content.body || ''} onChange={e => setForm(f => ({ ...f, content: { ...f.content, body: e.target.value } }))} placeholder="Write your lesson content here... Supports rich text, images, and video embeds." rows={12} className="w-full px-3 py-2 border rounded-lg font-mono text-sm" />
          <p className="text-xs text-gray-400 mt-1">Tip: Use Markdown for formatting. Video embeds support YouTube and Vimeo URLs.</p>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-blue-900">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add a tag..." className="px-3 py-2 border rounded-lg" />
            <button onClick={addTag} className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
