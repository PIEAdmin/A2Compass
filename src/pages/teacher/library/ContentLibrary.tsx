import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import type { ContentLibraryItem } from '../../../types/content';

export default function ContentLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => { if (user) loadData(); }, [user, search, subjectFilter, selectedTags]);

  async function loadData() {
    setLoading(true);
    try {
      const [lib, sub] = await Promise.all([
        contentService.getLibraryItems(user!.id, { search: search || undefined, subject_id: subjectFilter || undefined, tags: selectedTags.length ? selectedTags : undefined }),
        contentService.getSubjects(),
      ]);
      setItems(lib); setSubjects(sub || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleUseItem(item: ContentLibraryItem) {
    if (!user) return;
    try {
      const activity = await contentService.createFromLibrary(user.id, item);
      navigate(`/teacher/activities/${activity.id}`);
    } catch (err) { console.error(err); }
  }

  // Collect all unique tags
  const allTags = [...new Set(items.flatMap(i => i.tags || []))].sort();
  const formatIcons: Record<string, string> = { 'live-seminar': '🎥', 'discussion-board': '💬', 'choice-board': '🎯', 'independent-project': '📋', 'partner-quest': '🤝', 'one-on-one': '👤', 'practice-arena': '⚔️' };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📚 Content Library</h1>
          <p className="text-sm text-gray-500">Saved activities and templates. Click "Use" to create a new copy.</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search library..." className="flex-1 px-3 py-2 border rounded-lg" />
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {allTags.map(tag => (
            <button key={tag} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} className={`px-2 py-1 rounded-full text-xs ${selectedTags.includes(tag) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading library...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-4xl mb-2">📚</p>
          <p className="text-gray-500 mb-3">Your library is empty. Save activities here to reuse them!</p>
          <button onClick={() => navigate('/teacher/activities')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">View Activities</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.learning_format?.slug ? formatIcons[item.learning_format.slug] || '📄' : '📄'}</span>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                </div>
                {item.is_template && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Template</span>}
              </div>
              
              {item.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>}
              
              <div className="flex flex-wrap gap-1 mb-3">
                {item.subject && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.subject.icon} {item.subject.name}</span>}
                {item.learning_format && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.learning_format.name}</span>}
                <span className="text-xs text-gray-400">Used {item.usage_count}x</span>
              </div>
              
              {item.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.slice(0, 4).map(tag => <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>)}
                  {item.tags.length > 4 && <span className="text-xs text-gray-400">+{item.tags.length - 4}</span>}
                </div>
              )}
              
              <button onClick={() => handleUseItem(item)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Use This Activity</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
