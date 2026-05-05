// src/pages/admin/ApiSettings.tsx
// Admin page for managing external API integrations in A² Compass

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { clearCache } from '../../services/externalApi.service';

// ─── Interfaces ────────────────────────────────────────────────

interface ApiSettingRow {
  id?: string;
  api_source: string;
  label: string;
  description: string;
  enabled: boolean;
  api_key: string;
  requires_key: boolean;
  last_error: string | null;
  request_count_today: number;
}

interface CacheStats {
  totalItems: number;
  oldestEntry: string | null;
}

// ─── API Definitions ───────────────────────────────────────────

const API_DEFINITIONS: Omit<ApiSettingRow, 'id' | 'enabled' | 'api_key' | 'last_error' | 'request_count_today'>[] = [
  {
    api_source: 'nasa_apod',
    label: '🚀 NASA — Astronomy Picture of the Day',
    description: 'Daily space image from NASA. Uses free DEMO_KEY by default — no setup needed.',
    requires_key: false,
  },
  {
    api_source: 'nasa_images',
    label: '🔭 NASA — Image & Video Library',
    description: 'Search NASA\'s vast collection of space photos. No API key required.',
    requires_key: false,
  },
  {
    api_source: 'oer_commons',
    label: '📚 OER Commons',
    description: 'Open Educational Resources with CC-BY / CC-BY-SA licenses. API token optional — falls back to web search.',
    requires_key: true,
  },
  {
    api_source: 'data_gov',
    label: '📊 Data.gov',
    description: 'U.S. government open datasets. No API key required — works immediately!',
    requires_key: false,
  },
  {
    api_source: 'europeana',
    label: '🏛️ Europeana',
    description: 'European cultural heritage images and artifacts. API key (wskey) optional — falls back to web search.',
    requires_key: true,
  },
];

// ─── Status Indicator ──────────────────────────────────────────

type StatusColor = 'green' | 'yellow' | 'red' | 'gray';

function getStatusInfo(setting: ApiSettingRow): { color: StatusColor; label: string } {
  if (!setting.enabled) return { color: 'gray', label: 'Disabled' };
  if (setting.last_error) return { color: 'red', label: 'Error' };
  if (setting.requires_key && !setting.api_key) return { color: 'yellow', label: 'No Key' };
  return { color: 'green', label: 'Active' };
}

const STATUS_COLORS: Record<StatusColor, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  gray: '#9ca3af',
};

// ─── Component ─────────────────────────────────────────────────

const ApiSettings: React.FC = () => {
  const [settings, setSettings] = useState<ApiSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [cacheStats, setCacheStats] = useState<CacheStats>({ totalItems: 0, oldestEntry: null });
  const [clearingCache, setClearingCache] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // ── Load settings from Supabase ──
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_settings')
        .select('*');

      const existingMap = new Map<string, any>();
      if (!error && data) {
        data.forEach((row: any) => existingMap.set(row.api_source, row));
      }

      // Merge definitions with existing settings
      const merged: ApiSettingRow[] = API_DEFINITIONS.map((def) => {
        const existing = existingMap.get(def.api_source);
        return {
          ...def,
          id: existing?.id,
          enabled: existing?.enabled ?? true,
          api_key: existing?.api_key ?? '',
          last_error: existing?.last_error ?? null,
          request_count_today: existing?.request_count_today ?? 0,
        };
      });

      setSettings(merged);
    } catch (err) {
      console.error('Failed to load API settings:', err);
    }
    setLoading(false);
  }, []);

  // ── Load cache stats ──
  const loadCacheStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('api_cache')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      const { count } = await supabase
        .from('api_cache')
        .select('*', { count: 'exact', head: true });

      setCacheStats({
        totalItems: count ?? 0,
        oldestEntry: data?.[0]?.created_at ?? null,
      });
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadCacheStats();
  }, [loadSettings, loadCacheStats]);

  // ── Save all settings ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      for (const setting of settings) {
        const payload = {
          api_source: setting.api_source,
          enabled: setting.enabled,
          api_key: setting.api_key || null,
          updated_at: new Date().toISOString(),
        };

        if (setting.id) {
          await supabase.from('api_settings').update(payload).eq('id', setting.id);
        } else {
          await supabase.from('api_settings').upsert(
            { ...payload, request_count_today: 0 },
            { onConflict: 'api_source' }
          );
        }
      }

      setSaveMessage('✅ Settings saved successfully!');
      await loadSettings();
    } catch (err) {
      setSaveMessage('❌ Failed to save settings. Please try again.');
      console.error('Save failed:', err);
    }

    setSaving(false);
    setTimeout(() => setSaveMessage(null), 4000);
  }, [settings, loadSettings]);

  // ── Clear cache ──
  const handleClearCache = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear all cached API data? This will cause fresh API calls on the next request.')) {
      return;
    }

    setClearingCache(true);
    try {
      // Clear all sources
      for (const def of API_DEFINITIONS) {
        await clearCache(def.api_source);
      }
      await loadCacheStats();
    } catch {
      // Handled silently
    }
    setClearingCache(false);
  }, [loadCacheStats]);

  // ── Toggle enabled ──
  const toggleEnabled = (apiSource: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.api_source === apiSource ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // ── Update API key ──
  const updateKey = (apiSource: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.api_source === apiSource ? { ...s, api_key: value } : s))
    );
  };

  // ── Toggle key visibility ──
  const toggleKeyVisibility = (apiSource: string) => {
    setShowKeys((prev) => ({ ...prev, [apiSource]: !prev[apiSource] }));
  };

  // ── Format the oldest date ──
  const formatDate = (iso: string | null): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.headerBar}>
          <h1 style={styles.pageTitle}>🔌 External API Settings</h1>
        </div>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>Loading API settings… ⏳</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Page header */}
      <div style={styles.headerBar}>
        <h1 style={styles.pageTitle}>🔌 External API Settings</h1>
        <p style={styles.pageSubtitle}>
          Manage external data sources that power Space Explorer, History Corner, and more.
        </p>
      </div>

      {/* Cache stats bar */}
      <div style={styles.cacheBar}>
        <div style={styles.cacheStats}>
          <span style={styles.cacheStat}>
            📦 <strong>{cacheStats.totalItems}</strong> cached items
          </span>
          <span style={styles.cacheStat}>
            🕐 Oldest: <strong>{formatDate(cacheStats.oldestEntry)}</strong>
          </span>
        </div>
        <button
          onClick={handleClearCache}
          disabled={clearingCache}
          style={styles.clearCacheBtn}
        >
          {clearingCache ? '⏳ Clearing…' : '🗑️ Clear Cache'}
        </button>
      </div>

      {/* API Settings Cards */}
      <div style={styles.settingsList}>
        {settings.map((setting) => {
          const status = getStatusInfo(setting);
          const keyVisible = showKeys[setting.api_source] ?? false;

          return (
            <div key={setting.api_source} style={styles.settingCard}>
              {/* Card header row */}
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleRow}>
                  {/* Status dot */}
                  <span
                    style={{
                      ...styles.statusDot,
                      backgroundColor: STATUS_COLORS[status.color],
                    }}
                    title={status.label}
                  />
                  <h3 style={styles.cardTitle}>{setting.label}</h3>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => toggleEnabled(setting.api_source)}
                  style={{
                    ...styles.toggleTrack,
                    backgroundColor: setting.enabled ? '#22c55e' : '#d1d5db',
                  }}
                  aria-label={`Toggle ${setting.label}`}
                >
                  <span
                    style={{
                      ...styles.toggleThumb,
                      transform: setting.enabled ? 'translateX(20px)' : 'translateX(2px)',
                    }}
                  />
                </button>
              </div>

              <p style={styles.cardDescription}>{setting.description}</p>

              {/* API key field */}
              {setting.requires_key && (
                <div style={styles.keyRow}>
                  <input
                    type={keyVisible ? 'text' : 'password'}
                    value={setting.api_key}
                    onChange={(e) => updateKey(setting.api_source, e.target.value)}
                    placeholder="Paste API key here…"
                    style={styles.keyInput}
                    aria-label={`API key for ${setting.label}`}
                  />
                  <button
                    onClick={() => toggleKeyVisibility(setting.api_source)}
                    style={styles.showHideBtn}
                    aria-label={keyVisible ? 'Hide key' : 'Show key'}
                  >
                    {keyVisible ? '🙈' : '👁️'}
                  </button>
                </div>
              )}

              {/* Status row */}
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>
                  Status: <strong style={{ color: STATUS_COLORS[status.color] }}>{status.label}</strong>
                </span>
                <span style={styles.requestCount}>
                  Requests today: <strong>{setting.request_count_today}</strong>
                </span>
              </div>

              {/* Error display */}
              {setting.last_error && (
                <div style={styles.errorBox}>
                  <span style={styles.errorIcon}>⚠️</span>
                  <span style={styles.errorMessage}>{setting.last_error}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div style={styles.saveBar}>
        {saveMessage && <span style={styles.saveMessage}>{saveMessage}</span>}
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? '⏳ Saving…' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  headerBar: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  loadingContainer: {
    textAlign: 'center' as const,
    padding: 48,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  // Cache bar
  cacheBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 20,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  cacheStats: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
  },
  cacheStat: {
    fontSize: 13,
    color: '#475569',
  },
  clearCacheBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '2px solid #e2e8f0',
    background: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    color: '#dc2626',
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
  },
  // Settings list
  settingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  settingCard: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '16px 20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1e293b',
  },
  // Toggle switch
  toggleTrack: {
    position: 'relative' as const,
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
    padding: 0,
  },
  toggleThumb: {
    display: 'block',
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s',
  },
  cardDescription: {
    margin: '0 0 10px',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.5,
  },
  // Key input
  keyRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
  },
  keyInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '2px solid #e2e8f0',
    fontSize: 13,
    fontFamily: "'Courier New', monospace",
    outline: 'none',
    color: '#334155',
  },
  showHideBtn: {
    background: '#f1f5f9',
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    width: 40,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Status row
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#64748b',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
  },
  requestCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  // Error box
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    padding: '8px 12px',
    marginTop: 8,
    borderRadius: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
  },
  errorIcon: {
    fontSize: 14,
    flexShrink: 0,
  },
  errorMessage: {
    fontSize: 12,
    color: '#b91c1c',
    lineHeight: 1.4,
  },
  // Save bar
  saveBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    padding: '16px 0',
    borderTop: '1px solid #e2e8f0',
  },
  saveMessage: {
    fontSize: 14,
    fontWeight: 600,
  },
  saveBtn: {
    padding: '12px 28px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
  },
};

export default ApiSettings;
