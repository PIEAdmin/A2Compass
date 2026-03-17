import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import type { ActivityFormData, PracticeQuestion } from '../../../types/content';

const FORMAT_TEMPLATES: Record<string, { label: string; icon: string; fields: string[] }> = {
  'live-seminar': { label: 'Live Seminar', icon: '🎥', fields: ['scheduled_at', 'duration_min', 'meeting_url', 'discussion_questions'] },
  'discussion-board': { label: 'Discussion Board', icon: '💬', fields: ['prompt', 'rubric', 'peer_response_count', 'word_minimum'] },
  'choice-board': { label: 'Choice Board', icon: '🎯', fields: ['choices', 'min_choices', 'max_choices'] },
  'independent-project': { label: 'Independent Project', icon: '📋', fields: ['prompt', 'milestones', 'rubric', 'due_date'] },
  'partner-quest': { label: 'Partner Quest', icon: '🤝', fields: ['instructions', 'partner_count', 'deliverables', 'rubric'] },
  'one-on-one': { label: 'One-on-One Coaching', icon: '👤', fields: ['scheduled_at', 'duration_min', 'focus_areas'] },
  'practice-arena': { label: 'Practice Arena', icon: '⚔️', fields: ['questions', 'time_limit_min', 'passing_score'] },
};

export default function ActivityCreator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formats, setFormats] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ActivityFormData>({
    title: '', description: '', subject_id: '', learning_format_id: '', tier_id: '',
    config: {}, content: {}, estimated_minutes: 30, difficulty_level: 'medium',
    tags: [], status: 'draft',
  });

  useEffect(() => {
    loadReferenceData();
    if (id) loadActivity(id);
  }, [id]);

  async function loadReferenceData() {
    const [s, f, t] = await Promise.all([contentService.getSubjects(), contentService.getLearningFormats(), contentService.getTiers()]);
    setSubjects(s || []);
    setFormats(f || []);
    setTiers(t || []);
  }

  async function loadActivity(activityId: string) {
    const data = await contentService.getActivity(activityId);
    setForm({
      title: data.title, description: data.description || '', subject_id: data.subject_id || '',
      learning_format_id: data.learning_format_id || '', tier_id: data.tier_id || '',
      config: data.config || {}, content: data.content || {},
      estimated_minutes: data.estimated_minutes, difficulty_level: data.difficulty_level,
      tags: data.tags || [], status: data.status,
    });
    if (data.learning_format?.slug) setSelectedFormat(data.learning_format.slug);
  }

  function handleFormatSelect(formatId: string) {
    const fmt = formats.find(f => f.id === formatId);
    setForm(f => ({ ...f, learning_format_id: formatId }));
    setSelectedFormat(fmt?.slug || '');
  }

  async function handleSave(publish = false) {
    if (!user) return;
    setSaving(true);
    try {
      const saveData = { ...form, status: publish ? 'published' as const : form.status };
      if (id) {
        await contentService.updateActivity(id, saveData);
      } else {
        const newActivity = await contentService.createActivity(user.id, saveData);
        navigate(`/teacher/activities/${newActivity.id}`, { replace: true });
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleSaveToLibrary() {
    if (!user || !id) return;
    const activity = await contentService.getActivity(id);
    await contentService.saveToLibrary(user.id, activity);
    alert('Saved to Content Library!');
  }

  const template = selectedFormat ? FORMAT_TEMPLATES[selectedFormat] : null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/teacher/activities')} className="text-sm text-blue-600 hover:underline mb-1">← Back to Activities</button>
          <h1 className="text-2xl font-bold">{id ? 'Edit Activity' : 'Create Activity'}</h1>
        </div>
        <div className="flex gap-2">
          {id && <button onClick={handleSaveToLibrary} className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm">📚 Save to Library</button>}
          <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Save Draft</button>
          <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Publish</button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium mb-1">Activity Title *</label>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Fraction Practice Problems" />
          
          <label className="block text-sm font-medium mb-1 mt-4">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg" />
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tier</label>
              <select value={form.tier_id} onChange={e => setForm(f => ({ ...f, tier_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select...</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Est. Minutes</label>
              <input type="number" value={form.estimated_minutes} onChange={e => setForm(f => ({ ...f, estimated_minutes: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select value={form.difficulty_level} onChange={e => setForm(f => ({ ...f, difficulty_level: e.target.value as any }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="adaptive">Adaptive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Learning Format</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {formats.map(fmt => {
              const tmpl = FORMAT_TEMPLATES[fmt.slug];
              return (
                <button key={fmt.id} onClick={() => handleFormatSelect(fmt.id)} className={`p-3 rounded-lg border-2 text-center transition-all ${form.learning_format_id === fmt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="text-2xl block">{tmpl?.icon || '📄'}</span>
                  <span className="text-sm font-medium">{fmt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Format-Specific Configuration */}
        {template && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">{template.icon} {template.label} Configuration</h2>
            
            {selectedFormat === 'practice-arena' && (
              <PracticeArenaEditor config={form.config} onChange={config => setForm(f => ({ ...f, config }))} />
            )}
            
            {selectedFormat === 'discussion-board' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discussion Prompt *</label>
                  <textarea value={form.config.prompt || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, prompt: e.target.value } }))} rows={4} className="w-full px-3 py-2 border rounded-lg" placeholder="What question should students discuss?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Minimum Word Count</label>
                    <input type="number" value={form.config.word_minimum || 50} onChange={e => setForm(f => ({ ...f, config: { ...f.config, word_minimum: parseInt(e.target.value) } }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Peer Responses Required</label>
                    <input type="number" value={form.config.peer_response_count || 2} onChange={e => setForm(f => ({ ...f, config: { ...f.config, peer_response_count: parseInt(e.target.value) } }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Grading Rubric</label>
                  <textarea value={form.config.rubric || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, rubric: e.target.value } }))} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="How will responses be evaluated?" />
                </div>
              </div>
            )}

            {selectedFormat === 'choice-board' && (
              <ChoiceBoardEditor config={form.config} onChange={config => setForm(f => ({ ...f, config }))} />
            )}

            {selectedFormat === 'independent-project' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Prompt *</label>
                  <textarea value={form.config.prompt || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, prompt: e.target.value } }))} rows={4} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rubric</label>
                  <textarea value={form.config.rubric || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, rubric: e.target.value } }))} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            )}

            {(selectedFormat === 'live-seminar' || selectedFormat === 'one-on-one') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Scheduled Date/Time</label>
                    <input type="datetime-local" value={form.config.scheduled_at || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, scheduled_at: e.target.value } }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                    <input type="number" value={form.config.duration_min || 45} onChange={e => setForm(f => ({ ...f, config: { ...f.config, duration_min: parseInt(e.target.value) } }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                {selectedFormat === 'live-seminar' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Meeting URL</label>
                    <input type="url" value={form.config.meeting_url || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, meeting_url: e.target.value } }))} className="w-full px-3 py-2 border rounded-lg" placeholder="https://zoom.us/..." />
                  </div>
                )}
              </div>
            )}

            {selectedFormat === 'partner-quest' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Instructions *</label>
                  <textarea value={form.config.instructions || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, instructions: e.target.value } }))} rows={4} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Partners Needed</label>
                  <input type="number" value={form.config.partner_count || 2} onChange={e => setForm(f => ({ ...f, config: { ...f.config, partner_count: parseInt(e.target.value) } }))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Practice Arena sub-editor
function PracticeArenaEditor({ config, onChange }: { config: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  const questions = (config.questions || []) as PracticeQuestion[];

  function addQuestion() {
    onChange({
      ...config,
      questions: [...questions, { id: crypto.randomUUID(), question: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '', explanation: '', points: 1 }],
    });
  }

  function updateQuestion(idx: number, updates: Partial<PracticeQuestion>) {
    const updated = questions.map((q, i) => i === idx ? { ...q, ...updates } : q);
    onChange({ ...config, questions: updated });
  }

  function removeQuestion(idx: number) {
    onChange({ ...config, questions: questions.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Time Limit (minutes, blank = no limit)</label>
          <input type="number" value={config.time_limit_min || ''} onChange={e => onChange({ ...config, time_limit_min: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Passing Score (%)</label>
          <input type="number" value={config.passing_score || 85} onChange={e => onChange({ ...config, passing_score: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
        </div>
      </div>

      <h3 className="font-medium">Questions ({questions.length})</h3>
      {questions.map((q, i) => (
        <div key={q.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">Question {i + 1}</span>
            <button onClick={() => removeQuestion(i)} className="text-red-500 text-sm hover:underline">Remove</button>
          </div>
          <input type="text" value={q.question} onChange={e => updateQuestion(i, { question: e.target.value })} placeholder="Enter question..." className="w-full px-3 py-2 border rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <select value={q.type} onChange={e => updateQuestion(i, { type: e.target.value as any })} className="px-3 py-2 border rounded-lg">
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short Answer</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
            <input type="text" value={q.correct_answer} onChange={e => updateQuestion(i, { correct_answer: e.target.value })} placeholder="Correct answer" className="px-3 py-2 border rounded-lg" />
          </div>
          {q.type === 'multiple_choice' && (
            <div className="space-y-2">
              {(q.options || []).map((opt, oi) => (
                <input key={oi} type="text" value={opt} onChange={e => { const opts = [...(q.options || [])]; opts[oi] = e.target.value; updateQuestion(i, { options: opts }); }} placeholder={`Option ${oi + 1}`} className="w-full px-3 py-2 border rounded-lg text-sm" />
              ))}
            </div>
          )}
          <input type="text" value={q.explanation || ''} onChange={e => updateQuestion(i, { explanation: e.target.value })} placeholder="Explanation (shown after answer)" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      ))}
      <button onClick={addQuestion} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600">+ Add Question</button>
    </div>
  );
}

// Choice Board sub-editor
function ChoiceBoardEditor({ config, onChange }: { config: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  const choices = (config.choices || []) as any[];
  function addChoice() { onChange({ ...config, choices: [...choices, { title: '', instructions: '', rubric: '', points: 10 }] }); }
  function updateChoice(idx: number, updates: any) { onChange({ ...config, choices: choices.map((c, i) => i === idx ? { ...c, ...updates } : c) }); }
  function removeChoice(idx: number) { onChange({ ...config, choices: choices.filter((_, i) => i !== idx) }); }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Min Choices Required</label>
          <input type="number" value={config.min_choices || 1} onChange={e => onChange({ ...config, min_choices: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Choices Allowed</label>
          <input type="number" value={config.max_choices || 3} onChange={e => onChange({ ...config, max_choices: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
        </div>
      </div>
      {choices.map((choice, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between"><span className="font-medium text-sm">Choice {i + 1}</span><button onClick={() => removeChoice(i)} className="text-red-500 text-sm">Remove</button></div>
          <input type="text" value={choice.title} onChange={e => updateChoice(i, { title: e.target.value })} placeholder="Choice title" className="w-full px-3 py-2 border rounded-lg" />
          <textarea value={choice.instructions} onChange={e => updateChoice(i, { instructions: e.target.value })} placeholder="Instructions for this choice" rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      ))}
      <button onClick={addChoice} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500">+ Add Choice</button>
    </div>
  );
}
