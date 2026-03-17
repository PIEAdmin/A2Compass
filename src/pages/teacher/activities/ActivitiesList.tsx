import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import type { Activity } from '../../../types/content';

export default function ActivitiesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formats, setFormats] = useState<any[]>([]);

  useEffect(() => { if (user) loadData(); }, [user, search, formatFilter, subjectFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [act, sub, fmt] = await Promise.all([
        contentService.getActivities(user!.id, { search: search || undefined, format_id: formatFilter || undefined, subject_id: subjectFilter || undefined }),
        contentService.getSubjects(), contentService.getLearningFormats()
      ]);
      setActivities(act); setSubjects(sub || []); setFormats(fmt || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const formatIcons: Record<string, string> = { 'live-seminar': '🎥', 'discussion-board': '💬', 'choice-board': '🎯', 'independent-project': '📋', 'partner-quest': '🤝', 'one-on-one': '👤', 'practice-arena': '⚔️' };
  const statusColors: Record<string, string> = { draft: 'bg-yellow-100 text-yellow-800', published: 'bg-green-100 text-green-800', archived: 'bg-gray-100 text-gray-600' };
  const difficultyColors: Record<string, string> = { easy: 'text-green-600', medium: 'text-yellow-600', hard: 'text-red-600', adaptive: 'text-purple-600' };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🎯 Activities</h1>
        <button onClick={() => navigate('/teacher/activities/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New Activity</button>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activities..." className="flex-1 px-3 py-2 border rounded-lg" />
        <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">All Formats</option>
          {formats.map(f => <option key={f.id} value={f.id}>{formatIcons[f.slug] || '📄'} {f.name}</option>)}
        </select>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-4xl mb-2">🎯</p>
          <p className="text-gray-500 mb-3">No activities yet. Choose a learning format to get started!</p>
          <button onClick={() => navigate('/teacher/activities/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create Activity</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {activities.map(act => (
            <div key={act.id} className="bg-white rounded-lg shadow p-4 flex items-center gap-4 hover:shadow-md cursor-pointer" onClick={() => navigate(`/teacher/activities/${act.id}`)}>
              <div className="text-3xl">{act.learning_format?.slug ? formatIcons[act.learning_format.slug] || '📄' : '📄'}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{act.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[act.status]}`}>{act.status}</span>
                  {act.ai_generated && <span className="text-xs text-purple-600">🤖</span>}
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  {act.learning_format && <span>{act.learning_format.name}</span>}
                  {act.subject && <span>{act.subject.icon} {act.subject.name}</span>}
                  <span className={difficultyColors[act.difficulty_level]}>{act.difficulty_level}</span>
                  <span>⏱ {act.estimated_minutes}min</span>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); navigate(`/teacher/assign?activity=${act.id}`); }} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Assign →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
