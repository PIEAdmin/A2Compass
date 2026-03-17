import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import type { Lesson } from '../../../types/content';

export default function LessonsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user, search, statusFilter, subjectFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [lessonsData, subjectsData] = await Promise.all([
        contentService.getLessons(user!.id, { search: search || undefined, status: statusFilter || undefined, subject_id: subjectFilter || undefined }),
        contentService.getSubjects(),
      ]);
      setLessons(lessonsData);
      setSubjects(subjectsData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson? Activities will be unlinked but not deleted.')) return;
    await contentService.deleteLesson(id);
    setLessons(l => l.filter(lesson => lesson.id !== id));
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { draft: 'bg-yellow-100 text-yellow-800', published: 'bg-green-100 text-green-800', archived: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📚 Lesson Plans</h1>
        <button onClick={() => navigate('/teacher/lessons/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New Lesson</button>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lessons..." className="flex-1 px-3 py-2 border rounded-lg" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading lessons...</div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-4xl mb-2">📝</p>
          <p className="text-gray-500 mb-3">No lessons yet. Create your first one!</p>
          <button onClick={() => navigate('/teacher/lessons/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create Lesson</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {lessons.map(lesson => (
            <div key={lesson.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/teacher/lessons/${lesson.id}`)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{lesson.title}</h3>
                  {statusBadge(lesson.status)}
                  {lesson.ai_generated && <span className="text-xs text-purple-600">🤖 AI-assisted</span>}
                </div>
                <p className="text-sm text-gray-500 line-clamp-1">{lesson.description || 'No description'}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  {lesson.subject && <span>{lesson.subject.icon} {lesson.subject.name}</span>}
                  {lesson.tier && <span>{lesson.tier.name}</span>}
                  <span>{lesson.objectives?.length || 0} objectives</span>
                  <span>{lesson.tags?.length || 0} tags</span>
                  <span>Updated {new Date(lesson.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4" onClick={e => e.stopPropagation()}>
                <button onClick={() => navigate(`/teacher/lessons/${lesson.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                <button onClick={() => handleDelete(lesson.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
