import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import type { CurriculumUnit } from '../../../types/content';

export default function CurriculumPlanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTier, setNewTier] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const [u, s, t] = await Promise.all([contentService.getCurriculumUnits(user!.id), contentService.getSubjects(), contentService.getTiers()]);
      setUnits(u); setSubjects(s || []); setTiers(t || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!user || !newTitle) return;
    try {
      await contentService.createCurriculumUnit(user.id, {
        title: newTitle, description: newDescription || undefined,
        subject_id: newSubject || undefined, tier_id: newTier || undefined,
      });
      setShowCreate(false); setNewTitle(''); setNewDescription('');
      loadData();
    } catch (err) { console.error(err); }
  }

  const statusColors: Record<string, string> = { draft: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', archived: 'bg-gray-100 text-gray-600' };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📖 Curriculum Planner</h1>
          <p className="text-sm text-gray-500">Organize lessons and activities into units and courses</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New Unit</button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold mb-3">Create New Unit</h2>
          <div className="space-y-3">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Unit title..." className="w-full px-3 py-2 border rounded-lg" />
            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description (optional)..." rows={2} className="w-full px-3 py-2 border rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <select value={newSubject} onChange={e => setNewSubject(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="">Subject (optional)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <select value={newTier} onChange={e => setNewTier(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="">Tier (optional)</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading curriculum...</div>
      ) : units.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-4xl mb-2">📖</p>
          <p className="text-gray-500 mb-3">No curriculum units yet. Create your first one to organize your content!</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create Unit</button>
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit, i) => (
            <div key={unit.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/teacher/curriculum/${unit.id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-300 w-8 text-center">{i + 1}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{unit.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[unit.status]}`}>{unit.status}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      {unit.subject && <span>{unit.subject.icon} {unit.subject.name}</span>}
                      {unit.tier && <span>{unit.tier.name}</span>}
                      <span>{unit.items?.length || 0} items</span>
                    </div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
