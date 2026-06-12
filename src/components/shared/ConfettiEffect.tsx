import React, { useEffect, useState } from 'react';

interface ConfettiEffectProps {
  active: boolean;
  duration?: number;
  count?: number;
  variant?: 'confetti' | 'stars' | 'mixed';
}

const COLORS = ['#f56565', '#48bb78', '#4299e1', '#ecc94b', '#ed64a6', '#9f7aea', '#f6ad55', '#38b2ac'];
const STARS = ['⭐', '✨', '🌟', '💫'];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  char?: string;
  size: number;
  rotation: number;
}

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  active,
  duration = 2500,
  count = 40,
  variant = 'confetti',
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  const prevActiveRef = React.useRef(false);

  useEffect(() => {
    // Only trigger on rising edge (false → true)
    if (!active) { prevActiveRef.current = false; return; }
    if (prevActiveRef.current) return; // Already active, skip
    prevActiveRef.current = true;
    setVisible(true);

    const ps: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      char: variant === 'stars' ? STARS[Math.floor(Math.random() * STARS.length)] :
            variant === 'mixed' && Math.random() > 0.5 ? STARS[Math.floor(Math.random() * STARS.length)] : undefined,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
    setParticles(ps);

    const timer = setTimeout(() => {
      setVisible(false);
      setParticles([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [active]);

  if (!visible || particles.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map((p) =>
        p.char ? (
          <span
            key={p.id}
            className="star-rain"
            style={{
              left: `${p.x}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              fontSize: p.size * 2,
            }}
          >
            {p.char}
          </span>
        ) : (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left: `${p.x}%`,
              width: p.size,
              height: p.size * 0.6,
              background: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          />
        )
      )}
    </div>
  );
};

export default ConfettiEffect;
