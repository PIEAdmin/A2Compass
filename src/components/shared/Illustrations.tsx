import React from 'react';

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
  const eyeShape = mood === 'celebrating' ? 'M-3,-1 Q0,-5 3,-1' : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={`${className}`} aria-label="Compass Buddy">
      {/* Body glow */}
      <circle cx="60" cy="60" r="54" fill="url(#buddyGlow)" opacity="0.3" />
      {/* Body */}
      <circle cx="60" cy="60" r="48" fill="url(#buddyBody)" stroke="#4338ca" strokeWidth="3" />
      {/* Compass ring */}
      <circle cx="60" cy="60" r="38" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="6 4" className="illust-spin-slow" />
      {/* Compass needle */}
      <g className="illust-wobble" style={{ transformOrigin: '60px 60px' }}>
        <polygon points="60,28 56,60 64,60" fill="#ef4444" />
        <polygon points="60,92 56,60 64,60" fill="#3b82f6" />
        <circle cx="60" cy="60" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
      </g>
      {/* Face */}
      <g transform="translate(60,55)">
        {/* Eyes */}
        {mood === 'celebrating' ? (
          <>
            <path d="-15,-5 Q-12,-10 -9,-5" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="9,-5 Q12,-10 15,-5" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="-12" cy="-6" r="5" fill="white" />
            <circle cx="12" cy="-6" r="5" fill="white" />
            <circle cx={mood === 'thinking' ? -10 : -12} cy="-6" r="2.5" fill="#1e1b4b" />
            <circle cx={mood === 'thinking' ? 14 : 12} cy="-6" r="2.5" fill="#1e1b4b" />
            {/* Eye highlights */}
            <circle cx="-13" cy="-8" r="1.2" fill="white" />
            <circle cx="11" cy="-8" r="1.2" fill="white" />
          </>
        )}
        {/* Cheeks */}
        <circle cx="-18" cy="4" r="5" fill="#fca5a5" opacity="0.5" />
        <circle cx="18" cy="4" r="5" fill="#fca5a5" opacity="0.5" />
        {/* Mouth */}
        {mood === 'happy' || mood === 'waving' ? (
          <path d="M-8,6 Q0,16 8,6" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'celebrating' ? (
          <ellipse cx="0" cy="10" rx="8" ry="6" fill="#1e1b4b" />
        ) : (
          <circle cx="6" cy="8" r="4" fill="#1e1b4b" />
        )}
      </g>
      {/* Waving hand */}
      {mood === 'waving' && (
        <g className="illust-wave" style={{ transformOrigin: '95px 35px' }}>
          <circle cx="98" cy="30" r="8" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
          <rect x="90" y="35" width="4" height="12" rx="2" fill="#fde68a" stroke="#f59e0b" strokeWidth="1" />
        </g>
      )}
      {/* Celebrating sparkles */}
      {mood === 'celebrating' && (
        <>
          <circle cx="20" cy="20" r="3" fill="#fbbf24" className="illust-twinkle" />
          <circle cx="100" cy="15" r="2.5" fill="#f472b6" className="illust-twinkle" style={{ animationDelay: '0.3s' }} />
          <circle cx="95" cy="95" r="2" fill="#34d399" className="illust-twinkle" style={{ animationDelay: '0.6s' }} />
          <circle cx="25" cy="90" r="3" fill="#60a5fa" className="illust-twinkle" style={{ animationDelay: '0.9s' }} />
        </>
      )}
      <defs>
        <radialGradient id="buddyBody" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </radialGradient>
        <radialGradient id="buddyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ────── Rocket Ship ──────
export function RocketShip({ size = 100, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`${className}`} aria-label="Rocket">
      {/* Flame */}
      <g className="illust-flicker" style={{ transformOrigin: '50px 85px' }}>
        <ellipse cx="50" cy="88" rx="8" ry="10" fill="#f97316" opacity="0.8" />
        <ellipse cx="50" cy="86" rx="5" ry="8" fill="#fbbf24" />
        <ellipse cx="50" cy="84" rx="3" ry="5" fill="#fef3c7" />
      </g>
      {/* Body */}
      <path d="M40,75 L40,40 Q50,15 60,40 L60,75 Z" fill="url(#rocketBody)" stroke="#3b82f6" strokeWidth="2" />
      {/* Nose cone */}
      <path d="M40,40 Q50,15 60,40" fill="#ef4444" />
      {/* Window */}
      <circle cx="50" cy="48" r="8" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="2" />
      <circle cx="50" cy="48" r="5" fill="#dbeafe" />
      <circle cx="48" cy="45" r="2" fill="white" opacity="0.7" />
      {/* Fins */}
      <path d="M40,65 L30,80 L40,75 Z" fill="#ef4444" />
      <path d="M60,65 L70,80 L60,75 Z" fill="#ef4444" />
      {/* Stripe */}
      <rect x="40" y="60" width="20" height="4" fill="#fbbf24" rx="1" />
      {/* Stars around */}
      <circle cx="15" cy="25" r="2" fill="#fbbf24" className="illust-twinkle" />
      <circle cx="85" cy="35" r="1.5" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '0.5s' }} />
      <circle cx="20" cy="60" r="1.5" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '1s' }} />
      <circle cx="80" cy="55" r="2" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '0.7s' }} />
      <defs>
        <linearGradient id="rocketBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="50%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ────── Book Stack ──────
export function BookStack({ size = 100, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`${className}`} aria-label="Books">
      {/* Bottom book - red */}
      <g>
        <rect x="15" y="65" width="70" height="14" rx="2" fill="#ef4444" />
        <rect x="15" y="65" width="6" height="14" rx="1" fill="#dc2626" />
        <rect x="40" y="68" width="30" height="2" rx="1" fill="#fca5a5" />
        <rect x="45" y="72" width="20" height="2" rx="1" fill="#fca5a5" />
      </g>
      {/* Middle book - blue (slightly rotated) */}
      <g transform="rotate(-5, 50, 55)">
        <rect x="18" y="49" width="65" height="14" rx="2" fill="#3b82f6" />
        <rect x="18" y="49" width="6" height="14" rx="1" fill="#2563eb" />
        <rect x="40" y="52" width="25" height="2" rx="1" fill="#93c5fd" />
        <rect x="42" y="56" width="18" height="2" rx="1" fill="#93c5fd" />
      </g>
      {/* Top book - green */}
      <g transform="rotate(3, 50, 40)">
        <rect x="20" y="33" width="60" height="14" rx="2" fill="#22c55e" />
        <rect x="20" y="33" width="6" height="14" rx="1" fill="#16a34a" />
        <rect x="38" y="36" width="28" height="2" rx="1" fill="#86efac" />
        <rect x="40" y="40" width="22" height="2" rx="1" fill="#86efac" />
      </g>
      {/* Floating letters */}
      <text x="30" y="25" fontSize="14" fontWeight="bold" fill="#6366f1" className="illust-float" style={{ animationDelay: '0s' }}>A</text>
      <text x="48" y="20" fontSize="12" fontWeight="bold" fill="#f472b6" className="illust-float" style={{ animationDelay: '0.5s' }}>B</text>
      <text x="65" y="25" fontSize="14" fontWeight="bold" fill="#f59e0b" className="illust-float" style={{ animationDelay: '1s' }}>C</text>
      {/* Bookmark */}
      <polygon points="72,33 72,22 76,27 80,22 80,33" fill="#f97316" />
    </svg>
  );
}

// ────── Number Blocks ──────
export function NumberBlocks({ size = 100, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`${className}`} aria-label="Math Blocks">
      {/* Block 1 - blue */}
      <g className="illust-float" style={{ animationDelay: '0s' }}>
        <rect x="10" y="55" width="28" height="28" rx="5" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
        <text x="24" y="75" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">1</text>
      </g>
      {/* Block 2 - green */}
      <g className="illust-float" style={{ animationDelay: '0.3s' }}>
        <rect x="36" y="45" width="28" height="28" rx="5" fill="#22c55e" stroke="#16a34a" strokeWidth="2" />
        <text x="50" y="65" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">2</text>
      </g>
      {/* Block 3 - purple */}
      <g className="illust-float" style={{ animationDelay: '0.6s' }}>
        <rect x="62" y="55" width="28" height="28" rx="5" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
        <text x="76" y="75" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">3</text>
      </g>
      {/* Plus sign */}
      <g>
        <circle cx="35" cy="35" r="10" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
        <text x="35" y="41" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">+</text>
      </g>
      {/* Equals sign */}
      <g>
        <circle cx="70" cy="35" r="10" fill="#f472b6" stroke="#ec4899" strokeWidth="2" />
        <text x="70" y="41" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">=</text>
      </g>
      {/* Stars */}
      <circle cx="15" cy="20" r="2" fill="#fbbf24" className="illust-twinkle" />
      <circle cx="85" cy="25" r="1.5" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '0.5s' }} />
      <circle cx="50" cy="15" r="2" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '1s' }} />
    </svg>
  );
}

// ────── Trophy ──────
export function Trophy({ size = 100, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`${className}`} aria-label="Trophy">
      {/* Glow */}
      <circle cx="50" cy="45" r="40" fill="url(#trophyGlow)" opacity="0.25" />
      {/* Cup */}
      <path d="M30,25 L30,50 Q30,70 50,70 Q70,70 70,50 L70,25 Z" fill="url(#trophyGold)" stroke="#b45309" strokeWidth="2" />
      {/* Handles */}
      <path d="M30,30 Q15,30 15,45 Q15,55 30,55" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <path d="M70,30 Q85,30 85,45 Q85,55 70,55" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      {/* Shine */}
      <path d="M38,30 L38,50 Q38,60 45,62" fill="none" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Star on cup */}
      <polygon points="50,35 53,43 62,43 55,49 58,57 50,52 42,57 45,49 38,43 47,43" fill="#fef3c7" />
      {/* Base */}
      <rect x="42" y="70" width="16" height="6" rx="2" fill="#b45309" />
      <rect x="36" y="76" width="28" height="6" rx="2" fill="#92400e" />
      {/* Sparkles */}
      <circle cx="20" cy="20" r="2.5" fill="#fbbf24" className="illust-twinkle" />
      <circle cx="80" cy="18" r="2" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '0.4s' }} />
      <circle cx="85" cy="65" r="2" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '0.8s' }} />
      <circle cx="15" cy="60" r="1.5" fill="#fbbf24" className="illust-twinkle" style={{ animationDelay: '1.2s' }} />
      <defs>
        <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <radialGradient id="trophyGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ────── Growing Seedling ──────
export function GrowthPlant({ size = 100, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`${className}`} aria-label="Growing Plant">
      {/* Sun */}
      <circle cx="80" cy="20" r="12" fill="#fbbf24" className="illust-pulse" />
      <g className="illust-spin-slow" style={{ transformOrigin: '80px 20px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line key={angle} x1="80" y1="5" x2="80" y2="0" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${angle}, 80, 20)`} />
        ))}
      </g>
      {/* Pot */}
      <path d="M30,75 L35,90 L65,90 L70,75 Z" fill="#a16207" />
      <rect x="27" y="72" width="46" height="6" rx="2" fill="#b45309" />
      <rect x="38" y="78" width="24" height="3" rx="1" fill="#92400e" opacity="0.3" />
      {/* Stem */}
      <path d="M50,72 Q50,50 50,38" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Leaves */}
      <g className="illust-sway">
        <path d="M50,55 Q35,45 40,38 Q50,45 50,55" fill="#22c55e" />
        <path d="M50,55 Q37,47 41,39" stroke="#16a34a" strokeWidth="1" fill="none" />
      </g>
      <g className="illust-sway" style={{ animationDelay: '0.5s' }}>
        <path d="M50,45 Q65,35 60,28 Q50,35 50,45" fill="#4ade80" />
        <path d="M50,45 Q63,37 59,29" stroke="#16a34a" strokeWidth="1" fill="none" />
      </g>
      {/* Flower/sprout at top */}
      <circle cx="50" cy="33" r="6" fill="#f472b6" className="illust-pulse" style={{ animationDelay: '0.3s' }} />
      <circle cx="50" cy="33" r="3" fill="#fbbf24" />
      {/* Small sprouts beside pot */}
      <path d="M25,82 Q22,75 28,72" stroke="#86efac" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="71" r="2" fill="#86efac" />
      <path d="M75,80 Q78,73 72,70" stroke="#86efac" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="72" cy="69" r="2" fill="#86efac" />
    </svg>
  );
}

// ────── Floating Stars Background ──────
export function FloatingStars({ count = 12, className = '' }: { count?: number; className?: string }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 5 + (i * 67) % 90,
    y: 5 + (i * 43) % 85,
    size: 6 + (i % 3) * 4,
    delay: (i * 0.4) % 2,
    color: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'][i % 6],
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {stars.map((star) => (
        <svg
          key={star.id}
          className="absolute illust-twinkle"
          style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${star.delay}s` }}
          width={star.size}
          height={star.size}
          viewBox="0 0 20 20"
        >
          <polygon
            points="10,0 12.5,7 20,7.5 14,12.5 16,20 10,15 4,20 6,12.5 0,7.5 7.5,7"
            fill={star.color}
            opacity="0.6"
          />
        </svg>
      ))}
    </div>
  );
}

// ────── Floating Clouds ──────
export function FloatingClouds({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <svg className="absolute illust-drift" style={{ top: '10%', left: '-5%', opacity: 0.15 }} width="120" height="50" viewBox="0 0 120 50">
        <ellipse cx="60" cy="35" rx="50" ry="15" fill="white" />
        <ellipse cx="40" cy="25" rx="25" ry="18" fill="white" />
        <ellipse cx="75" cy="22" rx="30" ry="20" fill="white" />
      </svg>
      <svg className="absolute illust-drift" style={{ top: '30%', right: '-8%', opacity: 0.12, animationDelay: '3s', animationDuration: '25s' }} width="100" height="40" viewBox="0 0 100 40">
        <ellipse cx="50" cy="28" rx="40" ry="12" fill="white" />
        <ellipse cx="35" cy="20" rx="22" ry="15" fill="white" />
        <ellipse cx="65" cy="18" rx="25" ry="16" fill="white" />
      </svg>
      <svg className="absolute illust-drift" style={{ top: '60%', left: '10%', opacity: 0.1, animationDelay: '7s', animationDuration: '30s' }} width="80" height="35" viewBox="0 0 80 35">
        <ellipse cx="40" cy="22" rx="35" ry="13" fill="white" />
        <ellipse cx="28" cy="15" rx="20" ry="14" fill="white" />
      </svg>
    </div>
  );
}

// ────── Wavy Divider ──────
export function WavyDivider({ color = '#e0e7ff', className = '' }: { color?: string; className?: string }) {
  return (
    <svg className={`w-full ${className}`} height="24" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,12 Q150,0 300,12 T600,12 T900,12 T1200,12 V24 H0 Z" fill={color} />
    </svg>
  );
}

// ────── Domain Illustration (picks the right visual for a subject) ──────
export function DomainIllustration({ domain, size = 60, className = '' }: { domain: string; size?: number; className?: string }) {
  const d = domain.toLowerCase();
  if (d.includes('liter') || d.includes('read') || d.includes('phon') || d.includes('vocab') || d.includes('writ') || d.includes('fluen') || d.includes('compr') || d.includes('gramm') || d.includes('speak')) {
    return <BookStack size={size} className={className} />;
  }
  if (d.includes('num') || d.includes('math') || d.includes('alg') || d.includes('geo') || d.includes('meas') || d.includes('data') || d.includes('count')) {
    return <NumberBlocks size={size} className={className} />;
  }
  if (d.includes('daily') || d.includes('life') || d.includes('living')) {
    return <GrowthPlant size={size} className={className} />;
  }
  // Default: compass buddy
  return <CompassBuddy size={size} mood="happy" className={className} />;
}

// ────── Confetti Burst (for celebrations) ──────
export function ConfettiBurst({ className = '' }: { className?: string }) {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    delay: Math.random() * 0.5,
    color: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'][i % 6],
    size: 4 + Math.random() * 4,
    rotation: Math.random() * 360,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute illust-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            animationDelay: `${p.delay}s`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: '2px',
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ────── Scene Background (gradient + pattern for page backdrops) ──────
type SceneTheme = 'sky' | 'forest' | 'space' | 'sunset' | 'ocean';

const SCENE_GRADIENTS: Record<SceneTheme, string> = {
  sky: 'from-blue-50 via-indigo-50 to-purple-50',
  forest: 'from-green-50 via-emerald-50 to-teal-50',
  space: 'from-indigo-100 via-purple-50 to-pink-50',
  sunset: 'from-orange-50 via-rose-50 to-purple-50',
  ocean: 'from-cyan-50 via-blue-50 to-indigo-50',
};

export function SceneBackground({ theme = 'sky', children, className = '' }: { theme?: SceneTheme; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-gradient-to-br ${SCENE_GRADIENTS[theme]} min-h-screen ${className}`}>
      <FloatingStars count={8} />
      {children}
    </div>
  );
}

// ────── Illustrated Empty State ──────
export function EmptyState({ title, message, illustration = 'compass' }: { title: string; message: string; illustration?: 'compass' | 'rocket' | 'books' | 'trophy' }) {
  const IllustMap = {
    compass: <CompassBuddy size={100} mood="thinking" />,
    rocket: <RocketShip size={100} />,
    books: <BookStack size={100} />,
    trophy: <Trophy size={100} />,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
      <div className="flex justify-center mb-4">
        {IllustMap[illustration]}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

// ────── Illustrated Page Header ──────
export function PageHeader({
  title,
  subtitle,
  illustration,
  gradient = 'from-indigo-500 to-purple-600',
  children,
}: {
  title: string;
  subtitle?: string;
  illustration?: React.ReactNode;
  gradient?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${gradient} rounded-2xl shadow-lg p-6 text-white`}>
      <FloatingStars count={6} />
      <div className="relative z-10 flex items-center gap-4">
        {illustration && <div className="flex-shrink-0">{illustration}</div>}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-white/80 mt-1">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
