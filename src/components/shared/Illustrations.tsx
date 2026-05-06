import React from 'react';
// Re-export Pepper the Penguin (Academy mascot)
export { PepperPenguin, PenguinLineDance, PenguinMascot, PenguinFace } from './PepperPenguin';
// Re-export new visual polish components
export { LoadingState } from './LoadingState';
export { EmptyStatePenguin } from './EmptyStatePenguin';
export { ConfettiEffect } from './ConfettiEffect';
export { SoundToggle } from './SoundToggle';
export { SparkPointsDisplay } from './SparkPointsDisplay';

/* ────────────────────────────────────────────
   A² Compass — Illustration Component Library
   Inline SVG illustrations for the kids' UI
   ──────────────────────────────────────────── */

// ────── Compass Buddy (Main Mascot) ──────
interface BuddyProps {
  size?: number;
  mood?: 'happy' | 'thinking' | 'celebrating' | 'waving';
  className?: string;
}

export function CompassBuddy({ size = 120, mood = 'happy', className = '' }: BuddyProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={`${className}`} aria-label="Compass Buddy">
      <defs>
        <radialGradient id="buddyGlow" cx="50%" cy="50%"><stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="transparent" /></radialGradient>
        <radialGradient id="buddyBody" cx="50%" cy="40%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4338ca" /></radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="url(#buddyGlow)" opacity="0.3" />
      <circle cx="60" cy="60" r="48" fill="url(#buddyBody)" stroke="#4338ca" strokeWidth="3" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="6 4" className="illust-spin-slow" />
      <g className="illust-wobble" style={{ transformOrigin: '60px 60px' }}>
        <polygon points="60,28 56,60 64,60" fill="#ef4444" />
        <polygon points="60,92 56,60 64,60" fill="#3b82f6" />
        <circle cx="60" cy="60" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
      </g>
      <g transform="translate(60,55)">
        {mood === 'celebrating' ? (
          <>
            <path d="M-15,-5 Q-12,-10 -9,-5" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M9,-5 Q12,-10 15,-5" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="-12" cy="-6" r="5" fill="white" />
            <circle cx="12" cy="-6" r="5" fill="white" />
            <circle cx={mood === 'thinking' ? -10 : -12} cy="-6" r="2.5" fill="#1e1b4b" />
            <circle cx={mood === 'thinking' ? 14 : 12} cy="-6" r="2.5" fill="#1e1b4b" />
            <circle cx="-13" cy="-8" r="1.2" fill="white" />
            <circle cx="11" cy="-8" r="1.2" fill="white" />
          </>
        )}
        <circle cx="-18" cy="4" r="5" fill="#fca5a5" opacity="0.5" />
        <circle cx="18" cy="4" r="5" fill="#fca5a5" opacity="0.5" />
        {mood === 'happy' || mood === 'waving' ? (
          <path d="M-8,6 Q0,16 8,6" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'celebrating' ? (
          <ellipse cx="0" cy="10" rx="8" ry="6" fill="#1e1b4b" />
        ) : (
          <circle cx="0" cy="8" r="3" fill="#1e1b4b" opacity="0.5" />
        )}
      </g>
    </svg>
  );
}

// ────── Rocket Ship ──────
interface RocketProps { size?: number; className?: string; launched?: boolean; }
export function RocketShip({ size = 80, className = '', launched = false }: RocketProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`${launched ? 'float-animation' : ''} ${className}`} aria-label="Rocket">
      <g transform="translate(50,50)">
        {launched && <><circle cx="0" cy="35" r="6" fill="#f97316" opacity="0.8"><animate attributeName="r" values="6;10;6" dur="0.4s" repeatCount="indefinite"/></circle><circle cx="0" cy="40" r="4" fill="#fbbf24" opacity="0.6"><animate attributeName="r" values="4;8;4" dur="0.3s" repeatCount="indefinite"/></circle></>}
        <path d="M-12,15 L0,-35 L12,15 Q0,20 -12,15" fill="url(#rocketBody)" stroke="#4338ca" strokeWidth="1.5" />
        <ellipse cx="0" cy="0" rx="7" ry="7" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" />
        <circle cx="0" cy="0" r="4" fill="#dbeafe" />
        <path d="M-12,10 Q-22,15 -15,25 L-10,15" fill="#ef4444" />
        <path d="M12,10 Q22,15 15,25 L10,15" fill="#ef4444" />
      </g>
      <defs>
        <linearGradient id="rocketBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e0e7ff" /><stop offset="100%" stopColor="#c7d2fe" /></linearGradient>
      </defs>
    </svg>
  );
}

// ────── Floating Stars ──────
export function FloatingStars({ count = 8, className = '' }: { count?: number; className?: string }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    x: 10 + (i * 80 / count) + Math.random() * 10,
    y: 10 + Math.random() * 80,
    size: 8 + Math.random() * 12,
    delay: Math.random() * 3,
    dur: 2 + Math.random() * 2,
    type: Math.random() > 0.5 ? '⭐' : '✨',
  }));
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      {stars.map((s, i) => (
        <span key={i} className="absolute float-animation" style={{
          left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size,
          animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`, opacity: 0.6,
        }}>{s.type}</span>
      ))}
    </div>
  );
}

// ────── Domain Illustration ──────
const DOMAIN_EMOJIS: Record<string, string> = {
  math: '🔢', reading: '📖', science: '🔬', writing: '✍️',
  'social-studies': '🌍', art: '🎨', music: '🎵', pe: '⚽',
  technology: '💻', language: '🗣️', default: '📚',
};

export function DomainIllustration({ domain, size = 48, className = '' }: { domain: string; size?: number; className?: string }) {
  const emoji = DOMAIN_EMOJIS[domain?.toLowerCase()] || DOMAIN_EMOJIS.default;
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 skill-icon ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {emoji}
    </div>
  );
}

// ────── Empty State ──────
export function EmptyState({ title = 'Nothing here yet', message = 'Check back soon!', icon = '📋', className = '' }: {
  title?: string; message?: string; icon?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 page-enter ${className}`}>
      <div className="text-5xl mb-4 float-animation">{icon}</div>
      <h3 className="text-lg font-bold text-gray-600 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

// ────── Confetti Burst (legacy — simple version) ──────
export function ConfettiBurst({ active = false }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => (
        <div key={i} className="confetti-piece" style={{
          left: `${Math.random() * 100}%`,
          background: ['#f56565','#48bb78','#4299e1','#ecc94b','#ed64a6','#9f7aea'][i % 6],
          width: 8 + Math.random() * 6,
          height: 5 + Math.random() * 4,
          animationDelay: `${Math.random() * 0.5}s`,
          animationDuration: `${1.5 + Math.random() * 1.5}s`,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        }} />
      ))}
    </div>
  );
}

// ────── Floating Clouds ──────
export function FloatingClouds({ count = 5, className = '' }: { count?: number; className?: string }) {
  const clouds = Array.from({ length: count }, (_, i) => ({
    x: -10 + (i * 100 / count),
    y: 10 + Math.random() * 30,
    scale: 0.6 + Math.random() * 0.6,
    dur: 20 + Math.random() * 15,
    delay: Math.random() * 10,
    opacity: 0.3 + Math.random() * 0.3,
  }));
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      {clouds.map((c, i) => (
        <svg key={i} className="absolute" style={{
          left: `${c.x}%`, top: `${c.y}%`, width: 120 * c.scale, height: 60 * c.scale,
          opacity: c.opacity,
          animation: `cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
        }} viewBox="0 0 120 60">
          <ellipse cx="60" cy="35" rx="50" ry="18" fill="white" />
          <ellipse cx="40" cy="28" rx="30" ry="18" fill="white" />
          <ellipse cx="80" cy="28" rx="25" ry="15" fill="white" />
          <ellipse cx="55" cy="22" rx="22" ry="14" fill="white" />
        </svg>
      ))}
      <style>{`@keyframes cloud-drift { from { transform: translateX(-150px); } to { transform: translateX(calc(100vw + 150px)); } }`}</style>
    </div>
  );
}

// ────── Book Stack ──────
export function BookStack({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      📚
    </div>
  );
}

// ────── Trophy ──────
export function Trophy({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      🏆
    </div>
  );
}

// ────── Graduation Cap ──────
export function GraduationCap({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      🎓
    </div>
  );
}

// ────── Certificate Badge ──────
export function CertificateBadge({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      📜
    </div>
  );
}

// ────── Target / Bullseye ──────  
export function TargetBullseye({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      🎯
    </div>
  );
}

// ────── Magnifying Glass ──────
export function MagnifyingGlass({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      🔍
    </div>
  );
}

// ────── Map with Pin ──────
export function MapWithPin({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      🗺️
    </div>
  );
}

// ────── Number Blocks ──────
export function NumberBlocks({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      🔢
    </div>
  );
}

// ────── Growth Plant ──────
export function GrowthPlant({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
      🌱
    </div>
  );
}
