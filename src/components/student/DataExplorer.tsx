// src/components/student/DataExplorer.tsx
// Data.gov Dataset Search widget for A² Compass — grades 3-4 / teachers

import React, { useState, useCallback } from 'react';
import { searchDataGov } from '../../services/externalApi.service';

// ─── Interfaces ────────────────────────────────────────────────

interface DataGovResult {
  title: string;
  description: string;
  publisher: string;
  keywords: string[];
  landingPage: string;
}

interface TopicButton {
  emoji: string;
  label: string;
  query: string;
}

// ─── Constants ─────────────────────────────────────────────────

const TOPIC_BUTTONS: TopicButton[] = [
  { emoji: '🌤️', label: 'Weather', query: 'weather climate' },
  { emoji: '🏙️', label: 'Cities', query: 'cities population urban' },
  { emoji: '🌍', label: 'Environment', query: 'environment conservation' },
  { emoji: '🐾', label: 'Animals', query: 'animals wildlife species' },
  { emoji: '📈', label: 'Population', query: 'population census demographics' },
];

// ─── Component ─────────────────────────────────────────────────

const DataExplorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DataGovResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setResults([]);
    setSearched(true);
    setQuery(searchQuery);

    const result = await searchDataGov(searchQuery, 5);

    if ('error' in result && result.error) {
      setErrorMsg(result.message ?? 'Unable to search Data.gov right now.');
    } else {
      setResults(result.results ?? []);
    }

    setLoading(false);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      doSearch(query);
    },
    [query, doSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') doSearch(query);
    },
    [query, doSearch]
  );

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerEmoji}>📊</span>
        <span style={styles.headerText}>Real-World Data Explorer</span>
      </div>

      {/* Search bar */}
      <div style={styles.searchSection}>
        <div style={styles.searchRow}>
          <input
            type="text"
            placeholder="Search datasets (weather, population, animals...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.searchInput}
            aria-label="Search datasets"
          />
          <button onClick={() => doSearch(query)} disabled={loading} style={styles.searchBtn}>
            {loading ? '⏳' : '🔍'}
          </button>
        </div>

        {/* Topic buttons */}
        <div style={styles.topicRow}>
          {TOPIC_BUTTONS.map((topic) => (
            <button
              key={topic.label}
              onClick={() => doSearch(topic.query)}
              disabled={loading}
              style={styles.topicBtn}
              aria-label={`Search for ${topic.label}`}
            >
              <span>{topic.emoji}</span>
              <span style={styles.topicLabel}>{topic.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={styles.resultsArea}>
        {/* Loading */}
        {loading && (
          <div style={styles.statusContainer}>
            <p style={styles.statusText}>Searching real-world data… 📊</p>
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
            <p style={styles.statusText}>No datasets found. Try a different search! 🤔</p>
          </div>
        )}

        {/* Result cards */}
        {results.map((dataset, idx) => (
          <div key={idx} style={styles.resultCard}>
            <h4 style={styles.resultTitle}>{dataset.title}</h4>
            <p style={styles.resultPublisher}>📋 {dataset.publisher}</p>
            {dataset.description && (
              <p style={styles.resultDesc}>
                {dataset.description.length > 180
                  ? dataset.description.substring(0, 180) + '…'
                  : dataset.description}
              </p>
            )}
            {/* Keywords as pills */}
            {dataset.keywords.length > 0 && (
              <div style={styles.keywordsRow}>
                {dataset.keywords.map((kw, ki) => (
                  <span key={ki} style={styles.keywordPill}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
            <a
              href={dataset.landingPage}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.viewLink}
            >
              View Dataset →
            </a>
          </div>
        ))}
      </div>

      {/* Attribution */}
      <div style={styles.attribution}>
        <span style={styles.attributionText}>Data from Data.gov — No API key needed!</span>
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
    outline: '3px solid #2563eb',
    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.12)',
    width: '100%',
    maxWidth: 520,
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px 10px',
    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
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
  searchSection: {
    padding: '12px 16px',
  },
  searchRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 10,
    border: '2px solid #dbeafe',
    fontSize: 14,
    fontFamily: "'Nunito', sans-serif",
    outline: 'none',
    color: '#1e3a8a',
  },
  searchBtn: {
    background: '#2563eb',
    border: 'none',
    borderRadius: 10,
    width: 44,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
  topicRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  topicBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 20,
    border: '2px solid #dbeafe',
    background: '#eff6ff',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: "'Nunito', sans-serif",
    color: '#1e40af',
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: 600,
  },
  resultsArea: {
    padding: '0 16px 8px',
    maxHeight: 420,
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
    background: '#eff6ff',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 8,
    border: '1px solid #dbeafe',
  },
  resultTitle: {
    margin: '0 0 4px',
    fontSize: 14,
    fontWeight: 700,
    color: '#1e3a8a',
    lineHeight: 1.3,
  },
  resultPublisher: {
    margin: '0 0 6px',
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 600,
  },
  resultDesc: {
    margin: '0 0 8px',
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  keywordsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginBottom: 8,
  },
  keywordPill: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
    background: '#dbeafe',
    color: '#1e40af',
  },
  viewLink: {
    display: 'inline-block',
    fontSize: 13,
    fontWeight: 700,
    color: '#2563eb',
    textDecoration: 'none',
  },
  attribution: {
    padding: '8px 16px 12px',
    borderTop: '1px solid #dbeafe',
    textAlign: 'center' as const,
  },
  attributionText: {
    fontSize: 11,
    color: '#9ca3af',
  },
};

export default DataExplorer;
