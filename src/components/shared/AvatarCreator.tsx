import { useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AvatarData {
  color: string;
  colorName: string;
  hat: string;
  eyewear: string;
  accessory: string;
}

interface AvatarCreatorProps {
  initialData?: AvatarData;
  onSave: (data: AvatarData) => void;
  onChange?: (data: AvatarData) => void;
  showSaveButton?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PENGUIN_COLORS = [
  { name: 'Classic', hex: '#2D3436' },
  { name: 'Ocean Blue', hex: '#0984E3' },
  { name: 'Royal Purple', hex: '#6C5CE7' },
  { name: 'Sunset Orange', hex: '#E17055' },
  { name: 'Forest Green', hex: '#00B894' },
  { name: 'Sunny Yellow', hex: '#FDCB6E' },
  { name: 'Cotton Candy Pink', hex: '#FD79A8' },
  { name: 'Cherry Red', hex: '#D63031' },
];

const HATS = [
  { id: 'none', label: 'None', emoji: '🚫' },
  { id: 'baseball', label: 'Baseball Cap', emoji: '🧢' },
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'wizard', label: 'Wizard Hat', emoji: '🧙' },
  { id: 'party', label: 'Party Hat', emoji: '🎉' },
  { id: 'bow', label: 'Bow', emoji: '🎀' },
];

const EYEWEAR = [
  { id: 'sunglasses', label: 'Sunglasses', emoji: '😎' },
  { id: 'round', label: 'Round Glasses', emoji: '🤓' },
  { id: 'star', label: 'Star Glasses', emoji: '⭐' },
  { id: 'none', label: 'None', emoji: '🚫' },
];

const ACCESSORIES = [
  { id: 'none', label: 'None', emoji: '🚫' },
  { id: 'scarf', label: 'Scarf', emoji: '🧣' },
  { id: 'backpack', label: 'Backpack', emoji: '🎒' },
  { id: 'cape', label: 'Cape', emoji: '🦸' },
  { id: 'bowtie', label: 'Bowtie', emoji: '🎩' },
];

type TabKey = 'hats' | 'eyewear' | 'accessories';

const DEFAULT_AVATAR: AvatarData = {
  color: '#2D3436',
  colorName: 'Classic',
  hat: 'none',
  eyewear: 'sunglasses', // Sandra loves penguins with sunglasses!
  accessory: 'none',
};

// ─── SVG Sub-components ──────────────────────────────────────────────────────

function PenguinHat({ hat, color }: { hat: string; color: string }) {
  switch (hat) {
    case 'baseball':
      return (
        <g>
          {/* Brim */}
          <ellipse cx="100" cy="42" rx="38" ry="8" fill="#E74C3C" />
          {/* Cap dome */}
          <path d="M62 42 Q65 15 100 12 Q135 15 138 42 Z" fill="#E74C3C" />
          {/* Button on top */}
          <circle cx="100" cy="14" r="4" fill="#C0392B" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <polygon
            points="68,42 72,10 82,28 92,5 100,25 108,5 118,28 128,10 132,42"
            fill="#F1C40F"
            stroke="#E67E22"
            strokeWidth="1.5"
          />
          {/* Jewels */}
          <circle cx="82" cy="32" r="3" fill="#E74C3C" />
          <circle cx="100" cy="28" r="3.5" fill="#3498DB" />
          <circle cx="118" cy="32" r="3" fill="#2ECC71" />
        </g>
      );
    case 'wizard':
      return (
        <g>
          {/* Brim */}
          <ellipse cx="100" cy="42" rx="40" ry="8" fill="#8E44AD" />
          {/* Cone */}
          <polygon points="65,44 100,-20 135,44" fill="#8E44AD" />
          {/* Stars decoration */}
          <text x="88" y="18" fontSize="10" fill="#F1C40F">✦</text>
          <text x="102" y="32" fontSize="8" fill="#F1C40F">✦</text>
          <text x="78" y="36" fontSize="7" fill="#F1C40F">✦</text>
        </g>
      );
    case 'party':
      return (
        <g>
          {/* Cone */}
          <polygon points="78,44 100,0 122,44" fill="#E74C3C" />
          {/* Stripes */}
          <line x1="86" y1="30" x2="114" y2="30" stroke="#F1C40F" strokeWidth="3" />
          <line x1="82" y1="37" x2="118" y2="37" stroke="#3498DB" strokeWidth="3" />
          {/* Pom-pom */}
          <circle cx="100" cy="0" r="6" fill="#F1C40F" />
          {/* String */}
          <line x1="78" y1="44" x2="122" y2="44" stroke="#E74C3C" strokeWidth="2" />
        </g>
      );
    case 'bow':
      return (
        <g>
          {/* Left loop */}
          <ellipse cx="82" cy="38" rx="16" ry="10" fill="#FD79A8" />
          {/* Right loop */}
          <ellipse cx="118" cy="38" rx="16" ry="10" fill="#FD79A8" />
          {/* Center knot */}
          <circle cx="100" cy="38" r="6" fill="#E84393" />
          {/* Tails */}
          <path d="M94 44 L86 60 L92 44" fill="#FD79A8" />
          <path d="M106 44 L114 60 L108 44" fill="#FD79A8" />
        </g>
      );
    default:
      return null;
  }
}

function PenguinEyewear({ eyewear }: { eyewear: string }) {
  switch (eyewear) {
    case 'sunglasses':
      return (
        <g>
          {/* Bridge */}
          <path d="M88 82 Q100 78 112 82" stroke="#2C3E50" strokeWidth="2.5" fill="none" />
          {/* Left lens */}
          <rect x="72" y="76" width="20" height="14" rx="4" fill="#2C3E50" opacity="0.85" />
          {/* Right lens */}
          <rect x="108" y="76" width="20" height="14" rx="4" fill="#2C3E50" opacity="0.85" />
          {/* Lens shine */}
          <rect x="75" y="78" width="6" height="3" rx="1.5" fill="white" opacity="0.3" />
          <rect x="111" y="78" width="6" height="3" rx="1.5" fill="white" opacity="0.3" />
          {/* Arms */}
          <line x1="72" y1="82" x2="62" y2="80" stroke="#2C3E50" strokeWidth="2" />
          <line x1="128" y1="82" x2="138" y2="80" stroke="#2C3E50" strokeWidth="2" />
        </g>
      );
    case 'round':
      return (
        <g>
          {/* Bridge */}
          <path d="M90 82 Q100 79 110 82" stroke="#8B6914" strokeWidth="2" fill="none" />
          {/* Left frame */}
          <circle cx="82" cy="82" r="12" fill="none" stroke="#8B6914" strokeWidth="2.5" />
          {/* Right frame */}
          <circle cx="118" cy="82" r="12" fill="none" stroke="#8B6914" strokeWidth="2.5" />
          {/* Lens tint */}
          <circle cx="82" cy="82" r="10" fill="#E8F4FD" opacity="0.3" />
          <circle cx="118" cy="82" r="10" fill="#E8F4FD" opacity="0.3" />
          {/* Arms */}
          <line x1="70" y1="82" x2="62" y2="80" stroke="#8B6914" strokeWidth="2" />
          <line x1="130" y1="82" x2="138" y2="80" stroke="#8B6914" strokeWidth="2" />
        </g>
      );
    case 'star':
      return (
        <g>
          {/* Bridge */}
          <path d="M89 82 Q100 79 111 82" stroke="#E74C3C" strokeWidth="2" fill="none" />
          {/* Left star lens */}
          <polygon
            points="82,70 85,78 93,78 87,83 89,91 82,86 75,91 77,83 71,78 79,78"
            fill="#F1C40F"
            stroke="#E74C3C"
            strokeWidth="1.5"
          />
          {/* Right star lens */}
          <polygon
            points="118,70 121,78 129,78 123,83 125,91 118,86 111,91 113,83 107,78 115,78"
            fill="#F1C40F"
            stroke="#E74C3C"
            strokeWidth="1.5"
          />
          {/* Arms */}
          <line x1="71" y1="80" x2="62" y2="79" stroke="#E74C3C" strokeWidth="2" />
          <line x1="129" y1="80" x2="138" y2="79" stroke="#E74C3C" strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}

function PenguinAccessory({ accessory, color }: { accessory: string; color: string }) {
  switch (accessory) {
    case 'scarf':
      return (
        <g>
          {/* Scarf wrapping around neck */}
          <path
            d="M68 108 Q72 115 100 118 Q128 115 132 108 Q130 120 100 122 Q70 120 68 108"
            fill="#E74C3C"
          />
          {/* Scarf tail */}
          <path d="M80 118 L74 145 L82 143 L78 118" fill="#E74C3C" />
          <path d="M74 145 L72 148 M77 144 L75 147" stroke="#C0392B" strokeWidth="1" />
          {/* Stripes */}
          <path d="M75 112 Q100 116 125 112" stroke="#F1C40F" strokeWidth="2" fill="none" />
        </g>
      );
    case 'backpack':
      return (
        <g>
          {/* Straps (visible from front) */}
          <path d="M78 108 L75 148" stroke="#E67E22" strokeWidth="4" strokeLinecap="round" />
          <path d="M122 108 L125 148" stroke="#E67E22" strokeWidth="4" strokeLinecap="round" />
          {/* Backpack peeking from sides */}
          <rect x="56" y="110" width="12" height="30" rx="4" fill="#E67E22" />
          <rect x="132" y="110" width="12" height="30" rx="4" fill="#E67E22" />
          {/* Buckle details */}
          <rect x="58" y="122" width="8" height="5" rx="1" fill="#D35400" />
          <rect x="134" y="122" width="8" height="5" rx="1" fill="#D35400" />
        </g>
      );
    case 'cape':
      return (
        <g>
          {/* Cape flowing behind/around */}
          <path
            d="M70 108 Q50 140 55 185 L100 175 L145 185 Q150 140 130 108"
            fill="#9B59B6"
            opacity="0.7"
          />
          {/* Cape clasp */}
          <circle cx="76" cy="110" r="4" fill="#F1C40F" stroke="#E67E22" strokeWidth="1" />
          <circle cx="124" cy="110" r="4" fill="#F1C40F" stroke="#E67E22" strokeWidth="1" />
          <path d="M80 110 Q100 105 120 110" stroke="#F1C40F" strokeWidth="2" fill="none" />
          {/* Star on cape */}
          <text x="90" y="155" fontSize="16" fill="#F1C40F" opacity="0.8">⭐</text>
        </g>
      );
    case 'bowtie':
      return (
        <g>
          {/* Left triangle */}
          <polygon points="86,112 100,118 86,124" fill="#E74C3C" />
          {/* Right triangle */}
          <polygon points="114,112 100,118 114,124" fill="#E74C3C" />
          {/* Center knot */}
          <circle cx="100" cy="118" r="4" fill="#C0392B" />
          {/* Polka dots */}
          <circle cx="90" cy="117" r="1.5" fill="#F5B7B1" />
          <circle cx="110" cy="117" r="1.5" fill="#F5B7B1" />
          <circle cx="90" cy="121" r="1" fill="#F5B7B1" />
          <circle cx="110" cy="121" r="1" fill="#F5B7B1" />
        </g>
      );
    default:
      return null;
  }
}

// ─── Main Penguin SVG ────────────────────────────────────────────────────────

export function PenguinSVG({
  data,
  size = 200,
}: {
  data: AvatarData;
  size?: number;
}) {
  const { color, hat, eyewear, accessory } = data;

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
    >
      {/* Cape goes behind the body */}
      {accessory === 'cape' && (
        <PenguinAccessory accessory="cape" color={color} />
      )}

      {/* Body */}
      <ellipse cx="100" cy="120" rx="48" ry="62" fill={color} />

      {/* Belly */}
      <ellipse cx="100" cy="128" rx="32" ry="48" fill="white" />

      {/* Left flipper/wing */}
      <ellipse
        cx="54" cy="125"
        rx="12" ry="32"
        fill={color}
        transform="rotate(-10 54 125)"
      />
      {/* Right flipper/wing */}
      <ellipse
        cx="146" cy="125"
        rx="12" ry="32"
        fill={color}
        transform="rotate(10 146 125)"
      />

      {/* Feet */}
      <ellipse cx="82" cy="183" rx="16" ry="7" fill="#E17055" />
      <ellipse cx="118" cy="183" rx="16" ry="7" fill="#E17055" />

      {/* Head */}
      <ellipse cx="100" cy="72" rx="38" ry="34" fill={color} />

      {/* White face patch */}
      <ellipse cx="100" cy="78" rx="26" ry="22" fill="white" />

      {/* Eyes (base — hidden if wearing eyewear) */}
      {eyewear === 'none' && (
        <>
          <ellipse cx="85" cy="76" rx="6" ry="7" fill="white" />
          <ellipse cx="115" cy="76" rx="6" ry="7" fill="white" />
          <circle cx="86" cy="75" r="4" fill="#2D3436" />
          <circle cx="116" cy="75" r="4" fill="#2D3436" />
          {/* Eye shine */}
          <circle cx="88" cy="73" r="1.5" fill="white" />
          <circle cx="118" cy="73" r="1.5" fill="white" />
        </>
      )}

      {/* Eyes behind eyewear */}
      {eyewear !== 'none' && (
        <>
          <ellipse cx="85" cy="80" rx="5" ry="6" fill="white" />
          <ellipse cx="115" cy="80" rx="5" ry="6" fill="white" />
          <circle cx="86" cy="79" r="3.5" fill="#2D3436" />
          <circle cx="116" cy="79" r="3.5" fill="#2D3436" />
          <circle cx="87.5" cy="77.5" r="1.2" fill="white" />
          <circle cx="117.5" cy="77.5" r="1.2" fill="white" />
        </>
      )}

      {/* Beak */}
      <polygon points="95,90 100,98 105,90" fill="#E17055" />

      {/* Cheeks (blush) */}
      <ellipse cx="74" cy="88" rx="8" ry="5" fill="#FECDD3" opacity="0.5" />
      <ellipse cx="126" cy="88" rx="8" ry="5" fill="#FECDD3" opacity="0.5" />

      {/* Accessories (non-cape, rendered on top of body) */}
      {accessory !== 'cape' && accessory !== 'none' && (
        <PenguinAccessory accessory={accessory} color={color} />
      )}

      {/* Eyewear */}
      <PenguinEyewear eyewear={eyewear} />

      {/* Hat */}
      <PenguinHat hat={hat} color={color} />
    </svg>
  );
}

// ─── AvatarCreator Component ─────────────────────────────────────────────────

export default function AvatarCreator({
  initialData,
  onSave,
  onChange,
  showSaveButton = true,
}: AvatarCreatorProps) {
  const [avatar, setAvatar] = useState<AvatarData>(initialData ?? DEFAULT_AVATAR);
  const [activeTab, setActiveTab] = useState<TabKey>('hats');

  const updateAvatar = useCallback((partial: Partial<AvatarData>) => {
    setAvatar((prev) => {
      const next = { ...prev, ...partial };
      // Fire onChange on every update so parent stays in sync
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const handleSave = () => onSave(avatar);

  const tabItems: { key: TabKey; label: string; emoji: string }[] = [
    { key: 'hats', label: 'Hats', emoji: '🎩' },
    { key: 'eyewear', label: 'Eyewear', emoji: '👓' },
    { key: 'accessories', label: 'Extras', emoji: '✨' },
  ];

  const currentOptions =
    activeTab === 'hats'
      ? HATS
      : activeTab === 'eyewear'
      ? EYEWEAR
      : ACCESSORIES;

  const currentValue =
    activeTab === 'hats'
      ? avatar.hat
      : activeTab === 'eyewear'
      ? avatar.eyewear
      : avatar.accessory;

  const handleOptionSelect = (id: string) => {
    if (activeTab === 'hats') updateAvatar({ hat: id });
    else if (activeTab === 'eyewear') updateAvatar({ eyewear: id });
    else updateAvatar({ accessory: id });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      {/* Penguin Preview */}
      <div
        style={{
          background: 'linear-gradient(135deg, #E8F8F5 0%, #EBF5FB 50%, #F5EEF8 100%)',
          borderRadius: '24px',
          padding: '24px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ transition: 'transform 0.3s ease' }}>
          <PenguinSVG data={avatar} size={200} />
        </div>
      </div>

      {/* Color Name */}
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: avatar.color,
          transition: 'color 0.3s ease',
        }}
      >
        {avatar.colorName} Penguin
      </div>

      {/* Color Palette */}
      <div style={{ width: '100%' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '10px',
            color: '#636E72',
            textAlign: 'center',
          }}
        >
          🎨 Pick a Color
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            justifyItems: 'center',
          }}
        >
          {PENGUIN_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => updateAvatar({ color: c.hex, colorName: c.name })}
              title={c.name}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: c.hex,
                border:
                  avatar.color === c.hex
                    ? '4px solid #2D3436'
                    : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: avatar.color === c.hex ? 'scale(1.15)' : 'scale(1)',
                boxShadow:
                  avatar.color === c.hex
                    ? `0 0 0 3px white, 0 0 0 5px ${c.hex}`
                    : '0 2px 6px rgba(0,0,0,0.15)',
              }}
              aria-label={c.name}
            />
          ))}
        </div>
      </div>

      {/* Accessory Tabs */}
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '12px',
            background: '#F1F2F6',
            borderRadius: '12px',
            padding: '4px',
          }}
        >
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                background: activeTab === tab.key ? 'white' : 'transparent',
                color: activeTab === tab.key ? '#2D3436' : '#636E72',
                boxShadow:
                  activeTab === tab.key
                    ? '0 2px 8px rgba(0,0,0,0.1)'
                    : 'none',
              }}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* Options Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          {currentOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleOptionSelect(opt.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px 8px',
                borderRadius: '12px',
                border:
                  currentValue === opt.id
                    ? '2px solid #6C5CE7'
                    : '2px solid #E0E0E0',
                background:
                  currentValue === opt.id ? '#F3F0FF' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform:
                  currentValue === opt.id ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: '24px' }}>{opt.emoji}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: currentValue === opt.id ? 700 : 500,
                  color: currentValue === opt.id ? '#6C5CE7' : '#636E72',
                }}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      {showSaveButton && (
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(108, 92, 231, 0.35)',
          }}
        >
          Save My Penguin! 🐧
        </button>
      )}
    </div>
  );
}
