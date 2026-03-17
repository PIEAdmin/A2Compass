// ============================================================
// A² Compass — Item Bank Review (Teacher)
// Browse, preview, edit, and approve AI-drafted assessment items
// ============================================================
import { useState, useEffect } from 'react';
import { Header } from '../../components/layout';
import { LoadingSpinner } from '../../components/common';
import { useItemBank } from '../../hooks/useAssessment';
import { supabase } from '../../services/supabase';
import type { AssessmentItem, QuestionType } from '../../types/assessment';

// ---------- Question type labels ----------
const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  tap_select: 'Tap to Select',
  drag_drop: 'Drag & Drop',
  sequence: 'Sequence / Order',
  counting: 'Counting',
  fill_blank: 'Fill in the Blank',
  matching: 'Matching',
  audio_response: 'Audio Response',
  teacher_observed: 'Teacher Observed',
};

// ==========================================================
// Main Component
// ==========================================================
export default function ItemBankReview() {
  // Domain / Skill navigation
  const [domains, setDomains] = useState<{ id: string; name: string }[]>([]);
  const [skills, setSkills] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<AssessmentItem | null>(null);
  const [navLoading, setNavLoading] = useState(true);

  const { items, loading, error, updateItem, toggleActive, refresh } =
    useItemBank(selectedSkillId ?? undefined);

  // Load domains on mount
  useEffect(() => {
    loadDomains();
  }, []);

  // Load skills when domain changes
  useEffect(() => {
    if (selectedDomainId) loadSkills(selectedDomainId);
  }, [selectedDomainId]);

  async function loadDomains() {
    setNavLoading(true);
    try {
      const { data, error } = await supabase
        .from('domains')
        .select('id, name')
        .order('sort_order');
      if (error) throw error;
      setDomains(data || []);
      if (data && data.length > 0) setSelectedDomainId(data[0].id);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setNavLoading(false);
    }
  }

  async function loadSkills(domainId: string) {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('id, code, name')
        .eq('domain_id', domainId)
        .order('sort_order');
      if (error) throw error;
      setSkills(data || []);
      setSelectedSkillId(null);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  }

  // Filtered items
  const filteredItems = items.filter((item) => {
    // Filter by active status
    if (filter === 'active' && !(item as any).is_active) return false;
    if (filter === 'inactive' && (item as any).is_active !== false) return false;

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const qText = JSON.stringify(item.question_data).toLowerCase();
      return qText.includes(term) || item.question_type.includes(term);
    }
    return true;
  });

  // Bulk approve (activate all items for selected skill)
  async function handleBulkApprove() {
    if (!selectedSkillId) return;
    const inactiveItems = items.filter((i) => !(i as any).is_active);
    for (const item of inactiveItems) {
      await toggleActive(item.id, true);
    }
    refresh();
  }

  if (navLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="📝 Item Bank Review"
        subtitle="Review, edit, and approve assessment items"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ---------- Left Nav: Domains & Skills ---------- */}
          <div className="lg:col-span-1 space-y-4">
            {/* Domain Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">
                Domains
              </h3>
              <div className="space-y-1">
                {domains.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDomainId(d.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${
                        d.id === selectedDomainId
                          ? 'bg-indigo-100 text-indigo-800 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill Selector */}
            {skills.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">
                  Skills
                </h3>
                <button
                  onClick={() => setSelectedSkillId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors
                    ${
                      !selectedSkillId
                        ? 'bg-indigo-100 text-indigo-800 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  All Skills
                </button>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {skills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSkillId(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors
                        ${
                          s.id === selectedSkillId
                            ? 'bg-indigo-100 text-indigo-800 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <span className="font-mono text-gray-400 mr-1">{s.code}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------- Main Content ---------- */}
          <div className="lg:col-span-4 space-y-4">
            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg border border-gray-200
                             focus:border-indigo-400 outline-none"
                />
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(['all', 'active', 'inactive'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-2 text-xs font-medium capitalize transition-colors
                        ${
                          filter === f
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {selectedSkillId && (
                  <button
                    onClick={handleBulkApprove}
                    className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg
                               hover:bg-green-700 transition-colors"
                  >
                    ✓ Approve All
                  </button>
                )}
                <span className="text-xs text-gray-400">
                  {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Items List */}
            {loading ? (
              <LoadingSpinner size="md" />
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-3">📦</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  No items found
                </h3>
                <p className="text-gray-500 text-sm">
                  {selectedSkillId
                    ? 'No items exist for this skill yet.'
                    : 'Select a skill to browse its items.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => setEditingItem(item)}
                    onToggle={(active) => toggleActive(item.id, active)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Edit Modal ---------- */}
      {editingItem && (
        <ItemEditModal
          item={editingItem}
          onSave={async (updates) => {
            await updateItem(editingItem.id, updates);
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl shadow-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Item Card — Preview + Actions
// ==========================================================
function ItemCard({
  item,
  onEdit,
  onToggle,
}: {
  item: AssessmentItem;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
}) {
  const qd = item.question_data;
  const isActive = (item as any).is_active !== false;
  const questionText = qd.questionText || qd.prompt || qd.instructions || '';
  const options = qd.options || qd.items || [];
  const correctAnswer = qd.correctAnswer || qd.answer || qd.correctOrder;

  return (
    <div
      className={`bg-white rounded-xl border p-5 transition-colors ${
        isActive ? 'border-gray-200' : 'border-orange-200 bg-orange-50/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {QUESTION_TYPE_LABELS[item.question_type] || item.question_type}
            </span>
            <span className="text-xs text-gray-400">
              Difficulty: {item.difficulty}
            </span>
            {item.is_practice && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Practice
              </span>
            )}
            {!isActive && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Inactive
              </span>
            )}
          </div>

          {/* Question preview */}
          <p className="text-gray-800 font-medium text-sm mb-1">
            {questionText || '(No question text)'}
          </p>

          {/* Options / Answer preview */}
          {Array.isArray(options) && options.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {options.slice(0, 6).map((opt: string, idx: number) => (
                <span
                  key={idx}
                  className={`text-xs px-2 py-1 rounded-lg border ${
                    String(correctAnswer) === String(opt) ||
                    (Array.isArray(correctAnswer) && correctAnswer.includes(opt))
                      ? 'border-green-300 bg-green-50 text-green-700 font-semibold'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  {opt}
                </span>
              ))}
            </div>
          )}

          {item.hint_text && (
            <p className="text-xs text-amber-600 mt-2">💡 {item.hint_text}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200
                       rounded-lg hover:bg-indigo-50 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => onToggle(!isActive)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isActive
                ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                : 'text-green-600 border-green-200 hover:bg-green-50'
            }`}
          >
            {isActive ? '⏸ Disable' : '✓ Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// Item Edit Modal
// ==========================================================
function ItemEditModal({
  item,
  onSave,
  onClose,
}: {
  item: AssessmentItem;
  onSave: (updates: Partial<AssessmentItem>) => Promise<void>;
  onClose: () => void;
}) {
  const [questionData, setQuestionData] = useState(
    JSON.stringify(item.question_data, null, 2)
  );
  const [hintText, setHintText] = useState(item.hint_text || '');
  const [explanation, setExplanation] = useState(item.explanation || '');
  const [difficulty, setDifficulty] = useState(item.difficulty);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(questionData);
      setParseError(null);
      setSaving(true);
      await onSave({
        question_data: parsed,
        hint_text: hintText || undefined,
        explanation: explanation || undefined,
        difficulty,
      });
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setParseError('Invalid JSON in question data');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Edit Item</h3>

        <div className="space-y-4">
          {/* Question Type (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Question Type
            </label>
            <p className="text-sm text-gray-700">
              {QUESTION_TYPE_LABELS[item.question_type]}
            </p>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Difficulty (1-5)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-20 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-indigo-400 outline-none"
            />
          </div>

          {/* Question Data JSON */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Question Data (JSON)
            </label>
            <textarea
              value={questionData}
              onChange={(e) => {
                setQuestionData(e.target.value);
                setParseError(null);
              }}
              rows={10}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-200
                         focus:border-indigo-400 outline-none resize-y"
            />
            {parseError && (
              <p className="text-xs text-red-500 mt-1">{parseError}</p>
            )}
          </div>

          {/* Hint Text */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Hint Text
            </label>
            <input
              type="text"
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-indigo-400 outline-none"
              placeholder="Optional hint for students..."
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Explanation (shown after wrong answer)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200
                         focus:border-indigo-400 outline-none resize-y"
              placeholder="Why this answer is correct..."
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-indigo-600 text-white font-semibold rounded-lg
                       hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-500 border border-gray-200 rounded-lg
                       hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
