import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentEquipment, type StudentEquipment } from '../../services/inventory.service';

interface PepperAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  clickable?: boolean;
  showBackground?: boolean;
  equipment?: StudentEquipment | null;
  className?: string;
}

const SLOT_POSITIONS: Record<string, { top: string; left: string; fontSize: string }> = {
  hat:        { top: '-8%',  left: '50%', fontSize: '1.3em' },
  glasses:    { top: '25%',  left: '50%', fontSize: '0.9em' },
  scarf:      { top: '60%',  left: '50%', fontSize: '0.9em' },
  wings:      { top: '35%',  left: '5%',  fontSize: '1.1em' },
  sticker:    { top: '10%',  left: '85%', fontSize: '0.7em' },
  special:    { top: '75%',  left: '75%', fontSize: '0.8em' },
};

const SIZE_MAP = {
  sm: { container: 'w-10 h-10', penguin: 'text-2xl', ring: 'ring-2' },
  md: { container: 'w-16 h-16', penguin: 'text-4xl', ring: 'ring-2' },
  lg: { container: 'w-24 h-24', penguin: 'text-5xl', ring: 'ring-3' },
  xl: { container: 'w-40 h-40', penguin: 'text-7xl', ring: 'ring-4' },
};

// Map item IDs to emojis - we'll fetch from DB
const useEquippedEmojis = (equipment: StudentEquipment | null) => {
  const [emojis, setEmojis] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!equipment) return;
    const slots = ['hat', 'glasses', 'scarf', 'wings', 'background', 'sticker', 'special'];
    const itemIds = slots
      .map(s => ({ slot: s, id: (equipment as Record<string, unknown>)[`${s}_item_id`] as string }))
      .filter(s => s.id);

    if (itemIds.length === 0) { setEmojis({}); return; }

    import('../../services/supabase').then(({ supabase }) => {
      supabase
        .from('reward_items')
        .select('id, emoji')
        .in('id', itemIds.map(i => i.id))
        .then(({ data }) => {
          if (!data) return;
          const map: Record<string, string> = {};
          for (const item of data) {
            const slot = itemIds.find(i => i.id === item.id)?.slot;
            if (slot) map[slot] = item.emoji;
          }
          setEmojis(map);
        });
    });
  }, [equipment]);

  return emojis;
};

export default function PepperAvatar({ size = 'md', clickable = true, showBackground = true, equipment: externalEquipment, className = '' }: PepperAvatarProps) {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<StudentEquipment | null>(externalEquipment || null);
  const [isHovered, setIsHovered] = useState(false);
  const sizes = SIZE_MAP[size];
  const equippedEmojis = useEquippedEmojis(equipment);

  useEffect(() => {
    if (externalEquipment !== undefined) {
      setEquipment(externalEquipment);
      return;
    }
    getStudentEquipment().then(setEquipment);
  }, [externalEquipment]);

  const backgroundEmoji = equippedEmojis['background'];
  const bgColors: Record<string, string> = {
    '🌻': 'from-yellow-200 to-green-200',
    '🌟': 'from-indigo-900 to-purple-900',
    '🌈': 'from-red-200 via-yellow-200 to-blue-200',
    '🛸': 'from-gray-900 to-blue-900',
    '🐠': 'from-blue-300 to-cyan-400',
  };
  const bgGradient = backgroundEmoji ? (bgColors[backgroundEmoji] || 'from-blue-100 to-indigo-100') : 'from-blue-100 to-indigo-100';

  // Bounce on hover
  const bounceClass = isHovered ? 'animate-bounce' : '';

  return (
    <div
      className={`relative ${sizes.container} rounded-full ${sizes.ring} ring-amber-300 bg-gradient-to-br ${bgGradient} flex items-center justify-center overflow-visible cursor-${clickable ? 'pointer' : 'default'} transition-all duration-200 ${isHovered ? 'scale-110 shadow-lg' : ''} ${className}`}
      onClick={() => clickable && navigate('/student/locker')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="My Locker — Customize Pepper!"
      role={clickable ? 'button' : undefined}
      aria-label="Pepper avatar — click to open My Locker"
    >
      {/* Pepper the Penguin */}
      <span className={`${sizes.penguin} ${bounceClass} select-none`} role="img" aria-label="Pepper the Penguin">
        🐧
      </span>

      {/* Equipped accessories overlaid */}
      {Object.entries(equippedEmojis).filter(([slot]) => slot !== 'background').map(([slot, emoji]) => {
        const pos = SLOT_POSITIONS[slot];
        if (!pos) return null;
        const scaleFactor = size === 'sm' ? 0.6 : size === 'md' ? 0.8 : size === 'lg' ? 1.0 : 1.3;
        return (
          <span
            key={slot}
            className="absolute select-none pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, 0)',
              fontSize: `calc(${pos.fontSize} * ${scaleFactor})`,
              zIndex: 10,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
            }}
            role="img"
            aria-label={`Equipped ${slot}: ${emoji}`}
          >
            {emoji}
          </span>
        );
      })}

      {/* Sparkle effect when fully equipped */}
      {Object.keys(equippedEmojis).length >= 3 && (
        <div className="absolute -top-1 -right-1 animate-pulse">
          <span className="text-xs">✨</span>
        </div>
      )}
    </div>
  );
}
