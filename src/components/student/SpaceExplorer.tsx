// src/components/student/SpaceExplorer.tsx
// NASA Astronomy Picture of the Day — dashboard widget for A² Compass

import React, { useEffect, useState } from 'react';
import { getNasaApod } from '../../services/externalApi.service';

// ─── Interfaces ────────────────────────────────────────────────

interface ApodData {
  title: string;
  explanation: string;
  url: string;
  hdurl: string;
  media_type: string;
  date: string;
  copyright?: string;
}

interface ApodError {
  error: true;
  message: string;
}

type ApodResult = ApodData | ApodError;

function isApodError(result: ApodResult): result is ApodError {
  return 'error' in result && result.error === true;
}

// ─── Component ─────────────────────────────────────────────────

const SpaceExplorer: React.FC = () => {
  const [apod, setApod] = useState<ApodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      const result: ApodResult = await getNasaApod();

      if (cancelled) return;

      if (isApodError(result)) {
        setErrorMsg(result.message);
      } else {
        setApod(result);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Truncate explanation to 150 characters
  const shortExplanation =
    apod && apod.explanation.length > 150
      ? apod.explanation.substring(0, 150) + '…'
      : apod?.explanation ?? '';

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🚀</span>
          <span style={styles.headerText}>Space Explorer</span>
        </div>
        <div style={styles.skeletonImage} />
        <div style={{ ...styles.skeletonLine, width: '70%' }} />
        <div style={{ ...styles.skeletonLine, width: '100%' }} />
        <div style={{ ...styles.skeletonLine, width: '85%' }} />
      </div>
    );
  }

  // ── Error state ──
  if (errorMsg || !apod) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🚀</span>
          <span style={styles.headerText}>Space Explorer</span>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>
            We're having trouble loading extra content – but your lesson is ready below! 🐧
          </p>
        </div>
      </div>
    );
  }

  // ── Loaded state ──
  const isVideo = apod.media_type === 'video';

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🚀</span>
        <span style={styles.headerText}>Space Explorer</span>
        <span style={styles.dateBadge}>{apod.date}</span>
      </div>

      {/* Image / Video */}
      {isVideo ? (
        <a href={apod.url} target="_blank" rel="noopener noreferrer" style={styles.imageLink}>
          <div style={styles.videoPlaceholder}>
            <span style={styles.playIcon}>▶️</span>
            <span style={styles.videoLabel}>Watch today's space video!</span>
          </div>
        </a>
      ) : (
        <a href={apod.hdurl || apod.url} target="_blank" rel="noopener noreferrer" style={styles.imageLink}>
          <img
            src={apod.url}
            alt={apod.title}
            style={styles.image}
            loading="lazy"
          />
        </a>
      )}

      {/* Title */}
      <h3 style={styles.title}>{apod.title}</h3>

      {/* Explanation */}
      <p style={styles.explanation}>{shortExplanation}</p>

      {/* Attribution */}
      <div style={styles.attribution}>
        <span style={styles.attributionText}>Image courtesy of NASA</span>
        {apod.copyright && (
          <span style={styles.copyrightText}> · © {apod.copyright}</span>
        )}
      </div>
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
    border: '3px solid transparent',
    backgroundClip: 'padding-box',
    boxShadow: '0 4px 20px rgba(88, 28, 135, 0.12)',
    position: 'relative',
    // Gradient border trick: we'll use outline + boxShadow as a fallback
    // because inline styles can't do background-image on borders.
    outline: '3px solid',
    outlineColor: '#7c3aed',
    width: '100%',
    maxWidth: 420,
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px 10px',
    background: 'linear-gradient(135deg, #4c1d95, #2563eb)',
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
  dateBadge: {
    fontSize: 11,
    color: '#c4b5fd',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '2px 8px',
    fontWeight: 600,
  },
  imageLink: {
    display: 'block',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    maxHeight: 260,
  },
  videoPlaceholder: {
    width: '100%',
    height: 180,
    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playIcon: {
    fontSize: 40,
  },
  videoLabel: {
    color: '#c4b5fd',
    fontSize: 14,
    fontWeight: 600,
  },
  title: {
    margin: '12px 16px 4px',
    fontSize: 16,
    fontWeight: 700,
    color: '#1e1b4b',
    lineHeight: 1.3,
  },
  explanation: {
    margin: '0 16px 12px',
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  attribution: {
    padding: '8px 16px 12px',
    borderTop: '1px solid #f3f4f6',
  },
  attributionText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  copyrightText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  // Skeleton styles
  skeletonImage: {
    width: '100%',
    height: 180,
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    background: '#e5e7eb',
    margin: '10px 16px',
  },
  // Error styles
  errorContainer: {
    padding: '24px 16px',
    textAlign: 'center' as const,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.6,
  },
};

export default SpaceExplorer;
