// src/components/student/HistoryCorner.tsx
// Europeana Cultural Heritage rotating image widget for A² Compass

import React, { useEffect, useState, useCallback } from 'react';
import { searchEuropeana } from '../../services/externalApi.service';

// ─── Interfaces ────────────────────────────────────────────────

interface EuropeanaItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  provider: string;
  dataProvider: string;
  rights: string;
  edmIsShownAt: string;
}

interface FallbackArtwork {
  title: string;
  artist: string;
  year: string;
  color: string;
  europeanaUrl: string;
}

// ─── Fallback Data ─────────────────────────────────────────────

const FALLBACK_ARTWORKS: FallbackArtwork[] = [
  {
    title: 'Mona Lisa',
    artist: 'Leonardo da Vinci',
    year: '1503–1519',
    color: '#8B7355',
    europeanaUrl: 'https://www.europeana.eu/en/search?query=mona+lisa',
  },
  {
    title: 'Starry Night',
    artist: 'Vincent van Gogh',
    year: '1889',
    color: '#1a3a5c',
    europeanaUrl: 'https://www.europeana.eu/en/search?query=starry+night+van+gogh',
  },
  {
    title: 'Girl with a Pearl Earring',
    artist: 'Johannes Vermeer',
    year: '1665',
    color: '#2d4a3e',
    europeanaUrl: 'https://www.europeana.eu/en/search?query=girl+pearl+earring+vermeer',
  },
  {
    title: 'The Great Wave',
    artist: 'Katsushika Hokusai',
    year: '1831',
    color: '#1e3a5f',
    europeanaUrl: 'https://www.europeana.eu/en/search?query=great+wave+hokusai',
  },
  {
    title: 'Birth of Venus',
    artist: 'Sandro Botticelli',
    year: '1485',
    color: '#6b8f71',
    europeanaUrl: 'https://www.europeana.eu/en/search?query=birth+venus+botticelli',
  },
];

// ─── Component ─────────────────────────────────────────────────

const HistoryCorner: React.FC = () => {
  const [items, setItems] = useState<EuropeanaItem[]>([]);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      const result = await searchEuropeana('famous painting artwork', 10);

      if (cancelled) return;

      if ('error' in result && result.error) {
        setErrorMsg(result.message ?? 'Unable to load history content.');
        setFallback(true);
      } else if (result.fallback) {
        setFallback(true);
      } else if (result.items && result.items.length > 0) {
        setItems(result.items);
      } else {
        setFallback(true);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalItems = fallback ? FALLBACK_ARTWORKS.length : items.length;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(totalItems, 1));
  }, [totalItems]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
  }, [totalItems]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🏛️</span>
          <span style={styles.headerText}>History Corner</span>
        </div>
        <div style={styles.body}>
          <div style={styles.skeletonImage} />
          <div style={{ ...styles.skeletonLine, width: '60%' }} />
          <div style={{ ...styles.skeletonLine, width: '80%' }} />
        </div>
      </div>
    );
  }

  // ── Error with no fallback data ──
  if (errorMsg && !fallback) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🏛️</span>
          <span style={styles.headerText}>History Corner</span>
        </div>
        <div style={styles.errorBody}>
          <p style={styles.errorText}>
            We're having trouble loading extra content – but your lesson is ready below! 🐧
          </p>
        </div>
      </div>
    );
  }

  // ── Fallback — static famous artworks ──
  if (fallback) {
    const artwork = FALLBACK_ARTWORKS[currentIndex] ?? FALLBACK_ARTWORKS[0];
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🏛️</span>
          <span style={styles.headerText}>History Corner</span>
        </div>
        <div style={styles.body}>
          {/* Placeholder colored div */}
          <a href={artwork.europeanaUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div
              style={{
                ...styles.placeholderImage,
                backgroundColor: artwork.color,
              }}
            >
              <span style={styles.placeholderEmoji}>🎨</span>
              <span style={styles.placeholderTitle}>{artwork.title}</span>
            </div>
          </a>

          <h3 style={styles.title}>{artwork.title}</h3>
          <p style={styles.subtitle}>
            {artwork.artist} · {artwork.year}
          </p>

          {/* Navigation */}
          <div style={styles.nav}>
            <button onClick={goPrev} style={styles.navButton} aria-label="Previous artwork">
              ◀
            </button>
            <span style={styles.navCounter}>
              {currentIndex + 1} / {FALLBACK_ARTWORKS.length}
            </span>
            <button onClick={goNext} style={styles.navButton} aria-label="Next artwork">
              ▶
            </button>
          </div>

          {/* Attribution */}
          <div style={styles.attribution}>
            <span style={styles.attributionText}>
              Explore on{' '}
              <a href={artwork.europeanaUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
                Europeana
              </a>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Loaded — Europeana API items ──
  const item = items[currentIndex] ?? items[0];
  if (!item) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🏛️</span>
        <span style={styles.headerText}>History Corner</span>
      </div>
      <div style={styles.body}>
        {/* Image */}
        {item.thumbnail ? (
          <a
            href={item.edmIsShownAt || '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <img src={item.thumbnail} alt={item.title} style={styles.image} loading="lazy" />
          </a>
        ) : (
          <div style={{ ...styles.placeholderImage, backgroundColor: '#d97706' }}>
            <span style={styles.placeholderEmoji}>🏛️</span>
          </div>
        )}

        <h3 style={styles.title}>{item.title}</h3>
        {item.description && (
          <p style={styles.description}>
            {item.description.length > 120
              ? item.description.substring(0, 120) + '…'
              : item.description}
          </p>
        )}
        <p style={styles.provider}>From: {item.dataProvider}</p>

        {/* Navigation */}
        <div style={styles.nav}>
          <button onClick={goPrev} style={styles.navButton} aria-label="Previous item">
            ◀
          </button>
          <span style={styles.navCounter}>
            {currentIndex + 1} / {items.length}
          </span>
          <button onClick={goNext} style={styles.navButton} aria-label="Next item">
            ▶
          </button>
        </div>

        {/* Attribution */}
        <div style={styles.attribution}>
          <span style={styles.attributionText}>Image from Europeana</span>
        </div>
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
    outline: '3px solid #d97706',
    boxShadow: '0 4px 20px rgba(217, 119, 6, 0.12)',
    width: '100%',
    maxWidth: 420,
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px 10px',
    background: 'linear-gradient(135deg, #92400e, #d97706)',
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
  body: {
    padding: '0 0 4px',
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    maxHeight: 240,
  },
  placeholderImage: {
    width: '100%',
    height: 180,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  placeholderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    textAlign: 'center' as const,
    padding: '0 16px',
    textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  title: {
    margin: '12px 16px 2px',
    fontSize: 16,
    fontWeight: 700,
    color: '#78350f',
    lineHeight: 1.3,
  },
  subtitle: {
    margin: '0 16px 8px',
    fontSize: 13,
    color: '#92400e',
    fontWeight: 600,
  },
  description: {
    margin: '4px 16px 8px',
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  provider: {
    margin: '0 16px 8px',
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '8px 16px',
  },
  navButton: {
    background: '#fef3c7',
    border: '2px solid #d97706',
    borderRadius: 8,
    width: 36,
    height: 36,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#92400e',
    fontWeight: 700,
  },
  navCounter: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 600,
  },
  attribution: {
    padding: '8px 16px 12px',
    borderTop: '1px solid #fef3c7',
    textAlign: 'center' as const,
  },
  attributionText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  link: {
    color: '#d97706',
    textDecoration: 'underline',
  },
  // Skeleton
  skeletonImage: {
    width: '100%',
    height: 160,
    background: '#fef3c7',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    background: '#fde68a',
    margin: '10px 16px',
  },
  // Error
  errorBody: {
    padding: '24px 16px',
    textAlign: 'center' as const,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.6,
  },
};

export default HistoryCorner;
