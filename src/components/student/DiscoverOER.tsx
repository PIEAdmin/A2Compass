// src/components/student/DiscoverOER.tsx
// OER Commons Discovery panel for A² Compass Library page

import React, { useState, useCallback } from 'react';
import { searchOerCommons } from '../../services/externalApi.service';

// ─── Interfaces ────────────────────────────────────────────────

interface OerResult {
  title: string;
  description: string;
  author: string;
  license: string;
  url: string;
}

interface SearchParams {
  subject: string;
  grade: string;
  keyword: string;
}

// ─── Constants ─────────────────────────────────────────────────

const SUBJECTS = [
  { value: '', label: 'All Subjects' },
  { value: 'Mathematics', label: '🔢 Math' },
  { value: 'Language Arts', label: '📖 ELA' },
  { value: 'Science', label: '🔬 Science' },
  { value: 'Social Studies', label: '🌎 Social Studies' },
  { value: 'Arts', label: '🎨 Arts' },
];

const GRADES = [
  { value: '', label: 'All Grades' },
  { value: '-1', label: 'Pre-K' },
  { value: '0', label: 'Kindergarten' },
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
  { value: '4', label: 'Grade 4' },
];

// ─── License Badge Component ───────────────────────────────────

const LicenseBadge: React.FC<{ license: string }> = ({ license }) => {
  const isCCBY = license.toLowerCase().includes('cc-by-sa') || license.toLowerCase().includes('cc by-sa');
  const label = isCCBY ? 'CC BY-SA' : 'CC BY';
  const bg = isCCBY ? '#dbeafe' : '#dcfce7';
  const color = isCCBY ? '#1e40af' : '#166534';

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 6,
        background: bg,
        color,
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
};

// ─── Component ─────────────────────────────────────────────────

const DiscoverOER: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [params, setParams] = useState<SearchParams>({
    subject: '',
    grade: '',
    keyword: '',
  });
  const [results, setResults] = useState<OerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setResults([]);
    setSearched(true);

    const searchParams: { subject?: string; grade?: number; keyword?: string } = {};
    if (params.subject) searchParams.subject = params.subject;
    if (params.grade) searchParams.grade = parseInt(params.grade, 10);
    if (params.keyword) searchParams.keyword = params.keyword;

    const result = await searchOerCommons(searchParams);

    if ('error' in result && result.error) {
      setErrorMsg(result.message ?? 'Unable to search OER Commons right now.');
      setLoading(false);
      return;
    }

    if (result.fallback && result.searchUrl) {
      // Open OER Commons in a new tab with pre-filled filters
      window.open(result.searchUrl, '_blank', 'noopener,noreferrer');
      setLoading(false);
      setSearched(false);
      return;
    }

    setResults(result.results ?? []);
    setLoading(false);
  }, [params]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  // ── Collapsed state: just a button ──
  if (!expanded) {
    return (
      <div style={styles.card}>
        <button onClick={() => setExpanded(true)} style={styles.expandButton}>
          <span style={styles.expandEmoji}>📚</span>
          <span style={styles.expandText}>Discover Free Resources</span>
          <span style={styles.expandArrow}>▼</span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerEmoji}>📚</span>
        <span style={styles.headerText}>Discover Free Resources</span>
        <button onClick={() => setExpanded(false)} style={styles.collapseBtn} aria-label="Collapse">
          ✕
        </button>
      </div>

      {/* Search form */}
      <div style={styles.searchForm}>
        {/* Subject dropdown */}
        <select
          value={params.subject}
          onChange={(e) => setParams((p) => ({ ...p, subject: e.target.value }))}
          style={styles.select}
          aria-label="Subject"
        >
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Grade dropdown */}
        <select
          value={params.grade}
          onChange={(e) => setParams((p) => ({ ...p, grade: e.target.value }))}
          style={styles.select}
          aria-label="Grade"
        >
          {GRADES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        {/* Keyword input */}
        <div style={styles.inputRow}>
          <input
            type="text"
            placeholder="Search keywords…"
            value={params.keyword}
            onChange={(e) => setParams((p) => ({ ...p, keyword: e.target.value }))}
            onKeyDown={handleKeyDown}
            style={styles.input}
            aria-label="Search keyword"
          />
          <button onClick={handleSearch} disabled={loading} style={styles.searchBtn}>
            {loading ? '⏳' : '🔍'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={styles.resultsArea}>
        {/* Loading */}
        {loading && (
          <div style={styles.statusContainer}>
            <p style={styles.statusText}>Searching for great resources… ⏳</p>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div style={styles.statusContainer}>
            <p style={styles.errorText}>{errorMsg}</p>
          </div>
        )}

        {/* Empty */}
        {searched && !loading && !errorMsg && results.length === 0 && (
          <div style={styles.statusContainer}>
            <p style={styles.statusText}>No results found. Try different keywords! 🤔</p>
          </div>
        )}

        {/* Results list */}
        {results.map((item, idx) => (
          <div key={idx} style={styles.resultCard}>
            <div style={styles.resultHeader}>
              <h4 style={styles.resultTitle}>{item.title}</h4>
              <LicenseBadge license={item.license} />
            </div>
            {item.description && (
              <p style={styles.resultDesc}>
                {item.description.length > 150
                  ? item.description.substring(0, 150) + '…'
                  : item.description}
              </p>
            )}
            <div style={styles.resultFooter}>
              <span style={styles.resultAuthor}>By {item.author}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.viewLink}
              >
                View on OER Commons →
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Attribution */}
      <div style={styles.attribution}>
        <span style={styles.attributionText}>From OER Commons — CC BY 4.0</span>
      </div>
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    outline: '3px solid #16a34a',
    boxShadow: '0 4px 20px rgba(22, 163, 74, 0.12)',
    width: '100%',
    maxWidth: 480,
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  expandButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #166534, #16a34a)',
    border: 'none',
    cursor: 'pointer',
    color: '#ffffff',
  },
  expandEmoji: {
    fontSize: 24,
  },
  expandText: {
    fontSize: 16,
    fontWeight: 700,
    flex: 1,
    textAlign: 'left' as const,
  },
  expandArrow: {
    fontSize: 12,
    opacity: 0.7,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px 10px',
    background: 'linear-gradient(135deg, #166534, #16a34a)',
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
    flex: 1,
  },
  collapseBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    width: 28,
    height: 28,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchForm: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '2px solid #d1fae5',
    fontSize: 14,
    fontFamily: "'Nunito', sans-serif",
    color: '#166534',
    background: '#f0fdf4',
    outline: 'none',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '2px solid #d1fae5',
    fontSize: 14,
    fontFamily: "'Nunito', sans-serif",
    outline: 'none',
  },
  searchBtn: {
    background: '#16a34a',
    border: 'none',
    borderRadius: 8,
    width: 42,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsArea: {
    padding: '0 16px 8px',
    maxHeight: 360,
    overflowY: 'auto' as const,
  },
  statusContainer: {
    padding: '16px 0',
    textAlign: 'center' as const,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  resultCard: {
    background: '#f0fdf4',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 8,
    border: '1px solid #d1fae5',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  resultTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: '#166534',
    flex: 1,
    lineHeight: 1.3,
  },
  resultDesc: {
    margin: '4px 0 8px',
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  resultFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  resultAuthor: {
    fontSize: 11,
    color: '#9ca3af',
  },
  viewLink: {
    fontSize: 12,
    fontWeight: 700,
    color: '#16a34a',
    textDecoration: 'none',
  },
  attribution: {
    padding: '8px 16px 12px',
    borderTop: '1px solid #d1fae5',
    textAlign: 'center' as const,
  },
  attributionText: {
    fontSize: 11,
    color: '#9ca3af',
  },
};

export default DiscoverOER;
