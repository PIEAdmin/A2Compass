import React, { useState, useEffect } from 'react';

/* ───────────────────────────────────────────────────────────
   🐧  PEPPER THE PENGUIN  — A² Compass Academy Mascot
   A cool, sunglasses-wearing penguin who dances and cheers!
   ─────────────────────────────────────────────────────────── */

export type PenguinMood =
  | 'idle'
  | 'waving'
  | 'thinking'
  | 'celebrating'
  | 'dancing'
  | 'line-dance';

interface PenguinMascotProps {
  mood?: PenguinMood;
  size?: number;
  className?: string;
  /** Show speech bubble with text */
  speech?: string;
  /** Click handler */
  onClick?: () => void;
}

export const PenguinMascot: React.FC<PenguinMascotProps> = ({
  mood = 'idle',
  size = 120,
  className = '',
  speech,
  onClick,
}) => {
  const [blink, setBlink] = useState(false);

  // Blink every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const moodClass = `penguin-mascot penguin-${mood}`;

  return (
    <div
      className={`${moodClass} ${className}`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {/* Speech bubble */}
      {speech && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translate(-50%, -100%)',
            background: 'white',
            borderRadius: 16,
            padding: '6px 14px',
            fontSize: Math.max(11, size * 0.1),
            fontWeight: 600,
            color: '#1e293b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
            zIndex: 10,
            animation: 'speech-pop 0.3s ease-out',
          }}
        >
          {speech}
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid white',
            }}
          />
        </div>
      )}

      <svg
        viewBox="0 0 200 220"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Body gradient */}
          <radialGradient id="penguinBody" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#1a202c" />
          </radialGradient>
          {/* Belly gradient */}
          <radialGradient id="penguinBelly" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8ecf1" />
          </radialGradient>
          {/* Sunglasses lens gradient */}
          <linearGradient id="lensGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="40%" stopColor="#16213e" />
            <stop offset="100%" stopColor="#0f3460" />
          </linearGradient>
          {/* Lens shine */}
          <linearGradient id="lensShine" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* Beak gradient */}
          <linearGradient id="beakGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6ad55" />
            <stop offset="100%" stopColor="#ed8936" />
          </linearGradient>
          {/* Feet gradient */}
          <linearGradient id="feetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6ad55" />
            <stop offset="100%" stopColor="#dd6b20" />
          </linearGradient>
        </defs>

        {/* === SHADOW === */}
        <ellipse cx="100" cy="210" rx="45" ry="8" fill="rgba(0,0,0,0.15)">
          {mood === 'dancing' || mood === 'line-dance' ? (
            <animate
              attributeName="rx"
              values="45;35;45"
              dur="0.6s"
              repeatCount="indefinite"
            />
          ) : null}
        </ellipse>

        {/* === GROUP for body animations === */}
        <g className="penguin-body-group">
          {/* === FEET === */}
          <g className="penguin-feet">
            {/* Left foot */}
            <ellipse cx="78" cy="200" rx="18" ry="7" fill="url(#feetGrad)" stroke="#c05621" strokeWidth="1">
              {(mood === 'dancing' || mood === 'line-dance') && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-5,78,200;5,78,200;-5,78,200"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
              )}
            </ellipse>
            {/* Right foot */}
            <ellipse cx="122" cy="200" rx="18" ry="7" fill="url(#feetGrad)" stroke="#c05621" strokeWidth="1">
              {(mood === 'dancing' || mood === 'line-dance') && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="5,122,200;-5,122,200;5,122,200"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
              )}
            </ellipse>
          </g>

          {/* === BODY (oval) === */}
          <ellipse cx="100" cy="135" rx="55" ry="70" fill="url(#penguinBody)" />

          {/* === WHITE BELLY === */}
          <ellipse cx="100" cy="145" rx="38" ry="52" fill="url(#penguinBelly)" />

          {/* === WINGS / FLIPPERS === */}
          {/* Left wing */}
          <g className="penguin-left-wing">
            <path
              d="M48,110 Q30,140 42,175 Q46,180 50,175 Q55,145 52,115 Z"
              fill="#2d3748"
              stroke="#1a202c"
              strokeWidth="1"
            />
            {mood === 'waving' && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0,48,110;-35,48,110;0,48,110"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
            {mood === 'celebrating' && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0,48,110;-50,48,110;0,48,110"
                dur="0.5s"
                repeatCount="indefinite"
              />
            )}
            {(mood === 'dancing' || mood === 'line-dance') && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0,48,110;-30,48,110;0,48,110;15,48,110;0,48,110"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </g>
          {/* Right wing */}
          <g className="penguin-right-wing">
            <path
              d="M152,110 Q170,140 158,175 Q154,180 150,175 Q145,145 148,115 Z"
              fill="#2d3748"
              stroke="#1a202c"
              strokeWidth="1"
            />
            {mood === 'waving' && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0,152,110;35,152,110;0,152,110"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
            {mood === 'celebrating' && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0,152,110;50,152,110;0,152,110"
                dur="0.5s"
                repeatCount="indefinite"
              />
            )}
            {(mood === 'dancing' || mood === 'line-dance') && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0,152,110;30,152,110;0,152,110;-15,152,110;0,152,110"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </g>

          {/* === HEAD === */}
          <ellipse cx="100" cy="72" rx="42" ry="40" fill="url(#penguinBody)" />

          {/* White face patch */}
          <ellipse cx="100" cy="78" rx="30" ry="24" fill="white" opacity="0.95" />

          {/* === EYES (behind glasses) === */}
          {/* We show eyes peeking above the glasses for expressiveness */}
          <g className="penguin-eyes">
            {blink ? (
              <>
                <line x1="82" y1="68" x2="92" y2="68" stroke="#1a202c" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="108" y1="68" x2="118" y2="68" stroke="#1a202c" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="87" cy="68" r="5" fill="#1a202c" />
                <circle cx="113" cy="68" r="5" fill="#1a202c" />
                {/* Eye shine */}
                <circle cx="89" cy="66" r="1.8" fill="white" />
                <circle cx="115" cy="66" r="1.8" fill="white" />
              </>
            )}
          </g>

          {/* === SUNGLASSES === */}
          <g className="penguin-sunglasses">
            {/* Bridge */}
            <path d="M93,73 Q100,76 107,73" stroke="#1a1a2e" strokeWidth="3" fill="none" />
            {/* Left lens */}
            <rect x="72" y="66" width="24" height="16" rx="5" fill="url(#lensGrad)" stroke="#0a0a15" strokeWidth="1.5" />
            <rect x="73" y="67" width="10" height="6" rx="3" fill="url(#lensShine)" />
            {/* Right lens */}
            <rect x="104" y="66" width="24" height="16" rx="5" fill="url(#lensGrad)" stroke="#0a0a15" strokeWidth="1.5" />
            <rect x="105" y="67" width="10" height="6" rx="3" fill="url(#lensShine)" />
            {/* Temple arms */}
            <line x1="72" y1="72" x2="60" y2="68" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="128" y1="72" x2="140" y2="68" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* === BEAK === */}
          <path
            d="M92,86 L100,96 L108,86 Z"
            fill="url(#beakGrad)"
            stroke="#c05621"
            strokeWidth="0.8"
          />

          {/* === SMILE === */}
          <path
            d="M90,94 Q100,100 110,94"
            stroke="#c05621"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            opacity={mood === 'thinking' ? 0 : 1}
          />
          {/* Thinking mouth — small O */}
          {mood === 'thinking' && (
            <ellipse cx="100" cy="96" rx="4" ry="3" fill="#c05621" opacity="0.7" />
          )}

          {/* === BLUSH CHEEKS === */}
          <circle cx="76" cy="84" r="6" fill="#feb2b2" opacity="0.5" />
          <circle cx="124" cy="84" r="6" fill="#feb2b2" opacity="0.5" />

          {/* === THINKING BUBBLES === */}
          {mood === 'thinking' && (
            <>
              <circle cx="140" cy="55" r="4" fill="white" opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="148" cy="42" r="6" fill="white" opacity="0.5">
                <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="158" cy="28" r="9" fill="white" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="158" y="32" textAnchor="middle" fontSize="10" fill="#4a5568">?</text>
            </>
          )}

          {/* === CELEBRATION CONFETTI === */}
          {mood === 'celebrating' && (
            <>
              {['#f56565','#48bb78','#4299e1','#ecc94b','#ed64a6','#9f7aea'].map((c, i) => (
                <circle key={i} cx={65 + i * 15} cy={20} r="3" fill={c}>
                  <animate
                    attributeName="cy"
                    values={`${10 + (i % 3) * 8};${-10 + (i % 3) * 5};${10 + (i % 3) * 8}`}
                    dur={`${0.8 + i * 0.1}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur={`${0.8 + i * 0.1}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
              {/* Stars */}
              <text x="55" y="30" fontSize="14" opacity="0.8">⭐</text>
              <text x="130" y="25" fontSize="12" opacity="0.8">✨</text>
            </>
          )}

          {/* === BOW TIE (always cool) === */}
          <g transform="translate(100,108)">
            <polygon points="-10,-5 0,0 -10,5" fill="#e53e3e" />
            <polygon points="10,-5 0,0 10,5" fill="#e53e3e" />
            <circle cx="0" cy="0" r="2.5" fill="#c53030" />
          </g>
        </g>

        {/* === BOUNCE animation for the whole penguin === */}
        {(mood === 'dancing' || mood === 'celebrating') && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0;0,-8;0,0"
            dur="0.6s"
            repeatCount="indefinite"
            xlinkHref=".penguin-body-group"
          />
        )}
      </svg>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────
   🐧🐧🐧  LINE DANCE COMPONENT
   Shows multiple penguins doing a synchronized line dance.
   The dance is a simple 8-count pattern kids can learn:
   1-2: Step Right, Step Right
   3-4: Step Left, Step Left
   5-6: Kick Forward, Clap
   7-8: Quarter Turn, Stomp
   ─────────────────────────────────────────────────────────── */

interface PenguinLineDanceProps {
  count?: number;
  size?: number;
  showSteps?: boolean;
  className?: string;
}

export const PenguinLineDance: React.FC<PenguinLineDanceProps> = ({
  count = 3,
  size = 100,
  showSteps = true,
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { label: '👉 Step Right', icon: '👉' },
    { label: '👉 Step Right', icon: '👉' },
    { label: '👈 Step Left', icon: '👈' },
    { label: '👈 Step Left', icon: '👈' },
    { label: '🦵 Kick!', icon: '🦵' },
    { label: '👏 Clap!', icon: '👏' },
    { label: '🔄 Turn!', icon: '🔄' },
    { label: '🦶 Stomp!', icon: '🦶' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((s) => (s + 1) % steps.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`penguin-line-dance ${className}`} style={{ textAlign: 'center' }}>
      {/* Dance step indicator */}
      {showSteps && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          padding: '8px 20px',
          marginBottom: 12,
          display: 'inline-block',
          boxShadow: '0 4px 15px rgba(102,126,234,0.3)',
        }}>
          <span style={{
            color: 'white',
            fontSize: Math.max(14, size * 0.16),
            fontWeight: 700,
            letterSpacing: 1,
          }}>
            {steps[currentStep].icon} {steps[currentStep].label}
          </span>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === currentStep ? '#ffd700' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.3s',
                  transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Row of dancing penguins */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: size * 0.15,
        alignItems: 'flex-end',
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="line-dance-penguin"
            style={{
              animationDelay: `${i * 0.15}s`,
            }}
          >
            <PenguinMascot
              mood="line-dance"
              size={size}
            />
          </div>
        ))}
      </div>

      {/* "Dance with Pepper!" label */}
      <p style={{
        marginTop: 8,
        fontSize: Math.max(12, size * 0.13),
        color: '#6b7280',
        fontWeight: 600,
      }}>
        🎵 Dance with Pepper! Follow the steps above! 🎵
      </p>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────
   Mini helper: a small penguin face for inline use
   ─────────────────────────────────────────────────────────── */
interface PenguinFaceProps {
  size?: number;
  className?: string;
}

export const PenguinFace: React.FC<PenguinFaceProps> = ({ size = 32, className = '' }) => (
  <svg viewBox="0 0 60 60" width={size} height={size} className={className}>
    <circle cx="30" cy="30" r="28" fill="#2d3748" />
    <ellipse cx="30" cy="34" rx="18" ry="15" fill="white" />
    {/* Sunglasses */}
    <rect x="14" y="24" width="14" height="9" rx="3" fill="#1a1a2e" stroke="#0a0a15" strokeWidth="1" />
    <rect x="32" y="24" width="14" height="9" rx="3" fill="#1a1a2e" stroke="#0a0a15" strokeWidth="1" />
    <path d="M28,28 Q30,30 32,28" stroke="#0a0a15" strokeWidth="1.5" fill="none" />
    <line x1="14" y1="27" x2="6" y2="24" stroke="#1a1a2e" strokeWidth="1.5" />
    <line x1="46" y1="27" x2="54" y2="24" stroke="#1a1a2e" strokeWidth="1.5" />
    {/* Beak */}
    <path d="M26,37 L30,43 L34,37 Z" fill="#f6ad55" />
    {/* Smile */}
    <path d="M25,41 Q30,44 35,41" stroke="#c05621" strokeWidth="1" fill="none" />
    {/* Blush */}
    <circle cx="18" cy="36" r="3" fill="#feb2b2" opacity="0.5" />
    <circle cx="42" cy="36" r="3" fill="#feb2b2" opacity="0.5" />
  </svg>
);

export default PenguinMascot;

// Alias exports for page compatibility
// Maps 'happy' mood to 'idle' for simpler API
type SimpleMood = 'happy' | 'waving' | 'thinking' | 'celebrating' | 'dancing';

interface PepperPenguinProps {
  mood?: SimpleMood;
  size?: number;
  className?: string;
  speech?: string;
  onClick?: () => void;
}

const moodMap: Record<SimpleMood, PenguinMood> = {
  happy: 'idle',
  waving: 'waving',
  thinking: 'thinking',
  celebrating: 'celebrating',
  dancing: 'dancing',
};

export const PepperPenguin: React.FC<PepperPenguinProps> = ({ mood = 'happy', ...props }) => (
  <PenguinMascot mood={moodMap[mood] ?? 'idle'} {...props} />
);
