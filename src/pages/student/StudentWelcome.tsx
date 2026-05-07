import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks';
import PepperAvatar from '../../components/shared/PepperAvatar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StarterItem {
  id: string;
  name: string;
  emoji: string;
  slot: string;
  category: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const THEME_COLORS = [
  { name: 'Blue', hex: '#0984E3' },
  { name: 'Purple', hex: '#6C5CE7' },
  { name: 'Green', hex: '#00B894' },
  { name: 'Orange', hex: '#E17055' },
  { name: 'Pink', hex: '#FD79A8' },
  { name: 'Red', hex: '#D63031' },
];

const INTERESTS = [
  { id: 'space', label: 'Stars & Space', emoji: '⭐' },
  { id: 'animals', label: 'Animals', emoji: '🐾' },
  { id: 'art', label: 'Art & Drawing', emoji: '🎨' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'music', label: 'Music & Dance', emoji: '🎵' },
];

const SLOT_LABELS: Record<string, string> = {
  hat: '🎩 Pick a Hat',
  glasses: '👓 Pick Glasses',
  scarf: '🧣 Pick a Scarf',
  background: '🎨 Pick a Background',
};

const SLOT_ORDER = ['hat', 'glasses', 'scarf', 'background'];

// ─── Confetti Component ──────────────────────────────────────────────────────

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6', '#E67E22', '#FD79A8', '#00CEC9'];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      shape: i % 3,
    }));
  }, []);

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
        {pieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-20px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '2px' : '0',
              clipPath: p.shape === 2 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s infinite`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// ─── Waving Pepper ───────────────────────────────────────────────────────────

function WavingPepper() {
  return (
    <>
      <style>{`
        @keyframes pepper-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes pepper-wave { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(25deg); } }
      `}</style>
      <div style={{ animation: 'pepper-bounce 2s ease-in-out infinite' }}>
        <svg viewBox="0 0 200 220" width={220} height={242} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }}>
          <ellipse cx="100" cy="120" rx="48" ry="62" fill="#2D3436" />
          <ellipse cx="100" cy="128" rx="32" ry="48" fill="white" />
          <ellipse cx="54" cy="125" rx="12" ry="32" fill="#2D3436" transform="rotate(-10 54 125)" />
          <g style={{ transformOrigin: '146px 105px', animation: 'pepper-wave 1s ease-in-out infinite' }}>
            <ellipse cx="146" cy="108" rx="12" ry="32" fill="#2D3436" transform="rotate(-40 146 108)" />
          </g>
          <ellipse cx="82" cy="183" rx="16" ry="7" fill="#E17055" />
          <ellipse cx="118" cy="183" rx="16" ry="7" fill="#E17055" />
          <ellipse cx="100" cy="72" rx="38" ry="34" fill="#2D3436" />
          <ellipse cx="100" cy="78" rx="26" ry="22" fill="white" />
          <ellipse cx="85" cy="76" rx="6" ry="7" fill="white" />
          <ellipse cx="115" cy="76" rx="6" ry="7" fill="white" />
          <circle cx="86" cy="75" r="4" fill="#2D3436" />
          <circle cx="116" cy="75" r="4" fill="#2D3436" />
          <circle cx="88" cy="73" r="1.5" fill="white" />
          <circle cx="118" cy="73" r="1.5" fill="white" />
          <polygon points="95,90 100,98 105,90" fill="#E17055" />
          <path d="M92 96 Q100 102 108 96" stroke="#E17055" strokeWidth="2" fill="none" />
          <ellipse cx="74" cy="88" rx="8" ry="5" fill="#FECDD3" opacity="0.6" />
          <ellipse cx="126" cy="88" rx="8" ry="5" fill="#FECDD3" opacity="0.6" />
          <polygon points="78,44 100,2 122,44" fill="#6C5CE7" />
          <line x1="86" y1="30" x2="114" y2="30" stroke="#F1C40F" strokeWidth="3" />
          <line x1="82" y1="37" x2="118" y2="37" stroke="#FD79A8" strokeWidth="3" />
          <circle cx="100" cy="2" r="5" fill="#F1C40F" />
        </svg>
      </div>
    </>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '16px 0' }}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isComplete = step < current;
        return (
          <div
            key={step}
            style={{
              width: isActive ? '36px' : '12px',
              height: '12px',
              borderRadius: '6px',
              background: isActive ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)' : isComplete ? '#6C5CE7' : '#DFE6E9',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? '0 2px 8px rgba(108,92,231,0.4)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StudentWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [themeColor, setThemeColor] = useState('#0984E3');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [studentName, setStudentName] = useState('');
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in');

  // Starter items from DB
  const [starterItems, setStarterItems] = useState<StarterItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, string | null>>({
    hat: null, glasses: null, scarf: null, background: null,
  });
  const [avatarKey, setAvatarKey] = useState(0); // force re-render

  // Load profile + starter items
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Get student profile
      const { data: sp } = await supabase
        .from('student_profiles')
        .select('id, welcome_completed, first_name, theme_color, interests')
        .eq('user_id', user.id)
        .single();

      if (sp?.welcome_completed) {
        navigate('/student', { replace: true });
        return;
      }

      if (sp) {
        setStudentProfileId(sp.id);
        if (sp.first_name) setStudentName(sp.first_name);
        if (sp.theme_color) setThemeColor(sp.theme_color);
        if (sp.interests) setSelectedInterests(sp.interests as string[]);
      }

      // Load free starter items
      const { data: items } = await supabase
        .from('reward_items')
        .select('id, name, emoji, slot, category')
        .eq('cost', 0)
        .eq('is_active', true)
        .order('slot')
        .order('name');

      if (items) setStarterItems(items);
    };

    load();
  }, [user, navigate]);

  const goNext = useCallback(() => {
    setSlideDirection('out');
    setTimeout(() => {
      setStep(s => Math.min(s + 1, TOTAL_STEPS));
      setSlideDirection('in');
    }, 200);
  }, []);

  const goBack = useCallback(() => {
    setSlideDirection('out');
    setTimeout(() => {
      setStep(s => Math.max(s - 1, 1));
      setSlideDirection('in');
    }, 200);
  }, []);

  const toggleInterest = useCallback((id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  // Select/deselect a starter item for a slot — also writes to DB for live preview
  const selectItem = useCallback(async (slot: string, itemId: string) => {
    const newValue = (selectedItems[slot] === itemId || itemId === '__none__') ? null : itemId;
    setSelectedItems(prev => ({
      ...prev,
      [slot]: newValue,
    }));
    setAvatarKey(k => k + 1);

    // Write to student_equipment so PepperAvatar picks it up
    if (studentProfileId) {
      const col = `${slot}_item_id`;
      await supabase.from('student_equipment').upsert({
        student_id: studentProfileId,
        [col]: newValue,
      }, { onConflict: 'student_id' });
    }
  }, [selectedItems, studentProfileId]);

  // Grant starter items + equip selected ones + save profile
  const handleFinish = async () => {
    if (!user || !studentProfileId) return;
    setIsSaving(true);

    try {
      // 1. Grant ALL free starter items to inventory
      const inventoryRows = starterItems.map(item => ({
        student_id: studentProfileId,
        item_id: item.id,
        equipped: selectedItems[item.slot] === item.id, // equip if selected
      }));

      if (inventoryRows.length > 0) {
        await supabase.from('student_inventory').upsert(inventoryRows, {
          onConflict: 'student_id,item_id',
          ignoreDuplicates: true,
        });
      }

      // 2. Create/update equipment row with selected items
      const equipmentRow: Record<string, string | null> = {
        student_id: studentProfileId,
        hat_item_id: selectedItems.hat || null,
        glasses_item_id: selectedItems.glasses || null,
        scarf_item_id: selectedItems.scarf || null,
        wings_item_id: null,
        background_item_id: selectedItems.background || null,
        sticker_item_id: null,
        special_item_id: null,
      };

      await supabase.from('student_equipment').upsert(equipmentRow, {
        onConflict: 'student_id',
      });

      // 3. Update student profile
      await supabase
        .from('student_profiles')
        .update({
          theme_color: themeColor,
          interests: selectedInterests,
          welcome_completed: true,
        })
        .eq('user_id', user.id);

      navigate('/student', { replace: true });
    } catch (err) {
      console.error('Error finishing onboarding:', err);
      navigate('/student', { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  // Group starter items by slot
  const itemsBySlot = useMemo(() => {
    const grouped: Record<string, StarterItem[]> = {};
    starterItems.forEach(item => {
      if (!grouped[item.slot]) grouped[item.slot] = [];
      grouped[item.slot].push(item);
    });
    return grouped;
  }, [starterItems]);

  const stepBackgrounds: Record<number, string> = {
    1: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 30%, #0984E3 100%)',
    2: 'linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)',
    3: 'linear-gradient(135deg, #A8E6CF 0%, #88D8A8 50%, #6CB4EE 100%)',
    4: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 50%, #FFCC80 100%)',
    5: 'linear-gradient(135deg, #E8F8F5 0%, #D5F5E3 50%, #ABEBC6 100%)',
  };

  return (
    <>
      <style>{`
        @keyframes slide-in { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-30px); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(108,92,231,0.3); } 50% { box-shadow: 0 0 40px rgba(108,92,231,0.6); } }
        @keyframes item-pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1.05); } }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: stepBackgrounds[step],
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'background 0.6s ease',
          fontFamily: "'Inter', 'Nunito', system-ui, sans-serif",
          overflow: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '500px', paddingTop: '20px' }}>
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </div>

        <div
          key={step}
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: step === 2 ? 'flex-start' : 'center',
            animation: slideDirection === 'in' ? 'slide-in 0.4s ease forwards' : 'slide-out 0.2s ease forwards',
          }}
        >

          {/* ── Step 1: Welcome ─────────────────────────────────── */}
          {step === 1 && (
            <>
              <WavingPepper />
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '12px', textShadow: '0 2px 10px rgba(0,0,0,0.15)', lineHeight: 1.3 }}>
                  Welcome to A² Compass! <br />I'm Pepper the Penguin! 🐧
                </h1>
                <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginBottom: '32px', lineHeight: 1.5 }}>
                  I'll be your learning buddy on this awesome adventure!
                </p>
                <button
                  onClick={goNext}
                  style={{
                    padding: '16px 48px', borderRadius: '50px', border: 'none',
                    background: 'white', color: '#6C5CE7', fontSize: '20px', fontWeight: 800,
                    cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  }}
                >
                  Let's Go! 🚀
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Dress Up Pepper ───────────────────────────── */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#2D3436', textAlign: 'center', marginBottom: '8px' }}>
                Dress up your Pepper! 🐧✨
              </h2>
              <p style={{ fontSize: '15px', color: '#636E72', textAlign: 'center', marginBottom: '16px' }}>
                Pick accessories — you can change them anytime in My Locker!
              </p>

              {/* Live preview */}
              <div style={{
                background: 'white', borderRadius: '24px', padding: '20px',
                width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  {studentProfileId ? (
                    <PepperAvatar key={avatarKey} studentProfileId={studentProfileId} size="lg" showName={false} />
                  ) : (
                    <div style={{ width: 120, height: 120, background: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                      🐧
                    </div>
                  )}
                </div>

                {/* Item picker by slot */}
                {SLOT_ORDER.map(slot => {
                  const items = itemsBySlot[slot] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={slot} style={{ marginBottom: '14px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#2D3436', marginBottom: '8px' }}>
                        {SLOT_LABELS[slot] || slot}
                      </p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {/* "None" option */}
                        <button
                          onClick={() => selectItem(slot, '__none__')}
                          style={{
                            padding: '8px 14px', borderRadius: '12px', border: '2px solid',
                            borderColor: !selectedItems[slot] ? '#6C5CE7' : '#DFE6E9',
                            background: !selectedItems[slot] ? '#F3F0FF' : 'white',
                            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                            color: !selectedItems[slot] ? '#6C5CE7' : '#636E72',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          None
                        </button>
                        {items.map(item => {
                          const isSelected = selectedItems[slot] === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => selectItem(slot, item.id)}
                              style={{
                                padding: '8px 14px', borderRadius: '12px', border: '2px solid',
                                borderColor: isSelected ? '#6C5CE7' : '#DFE6E9',
                                background: isSelected ? '#F3F0FF' : 'white',
                                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                color: isSelected ? '#6C5CE7' : '#2D3436',
                                transition: 'all 0.2s ease',
                                animation: isSelected ? 'item-pop 0.3s ease' : 'none',
                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                              }}
                            >
                              <span style={{ marginRight: '4px' }}>{item.emoji}</span>
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button onClick={goBack} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '2px solid rgba(0,0,0,0.1)', background: 'white', color: '#636E72', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
                  ← Back
                </button>
                <button onClick={goNext} style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(108,92,231,0.35)' }}>
                  Next →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Pick Colors ──────────────────────────────── */}
          {step === 3 && (
            <>
              <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
                {studentProfileId && <PepperAvatar studentProfileId={studentProfileId} size="md" showName={false} />}
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#2D3436', textAlign: 'center', marginBottom: '8px' }}>
                What's your favorite color? 🌈
              </h2>
              <p style={{ fontSize: '15px', color: '#636E72', textAlign: 'center', marginBottom: '24px' }}>
                This will make your learning space look awesome!
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '320px', marginBottom: '24px' }}>
                {THEME_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setThemeColor(c.hex)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      padding: '16px 8px', borderRadius: '16px',
                      border: themeColor === c.hex ? `3px solid ${c.hex}` : '3px solid transparent',
                      background: themeColor === c.hex ? 'white' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer', transition: 'all 0.25s ease',
                      transform: themeColor === c.hex ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: themeColor === c.hex ? `0 4px 20px ${c.hex}44` : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: c.hex, boxShadow: `0 4px 12px ${c.hex}55` }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: themeColor === c.hex ? c.hex : '#636E72' }}>{c.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px' }}>
                <button onClick={goBack} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '2px solid rgba(0,0,0,0.1)', background: 'white', color: '#636E72', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                <button onClick={goNext} style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(108,92,231,0.35)' }}>Next →</button>
              </div>
            </>
          )}

          {/* ── Step 4: Interests ────────────────────────────────── */}
          {step === 4 && (
            <>
              <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
                {studentProfileId && <PepperAvatar studentProfileId={studentProfileId} size="md" showName={false} />}
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#2D3436', textAlign: 'center', marginBottom: '8px' }}>
                What do you love? 💖
              </h2>
              <p style={{ fontSize: '15px', color: '#636E72', textAlign: 'center', marginBottom: '24px' }}>Pick as many as you like!</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px', marginBottom: '24px' }}>
                {INTERESTS.map(item => {
                  const isSelected = selectedInterests.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleInterest(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '16px',
                        border: isSelected ? '3px solid #6C5CE7' : '3px solid transparent',
                        background: isSelected ? 'linear-gradient(135deg, #F3F0FF, #EDE7FF)' : 'rgba(255,255,255,0.85)',
                        cursor: 'pointer', transition: 'all 0.25s ease',
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        boxShadow: isSelected ? '0 4px 20px rgba(108,92,231,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      <span style={{ fontSize: '32px' }}>{item.emoji}</span>
                      <span style={{ fontSize: '17px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#6C5CE7' : '#2D3436' }}>{item.label}</span>
                      {isSelected && <span style={{ marginLeft: 'auto', fontSize: '20px', color: '#6C5CE7' }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '360px' }}>
                <button onClick={goBack} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '2px solid rgba(0,0,0,0.1)', background: 'white', color: '#636E72', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                <button onClick={goNext} style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(108,92,231,0.35)' }}>Next →</button>
              </div>
            </>
          )}

          {/* ── Step 5: Ready! ───────────────────────────────────── */}
          {step === 5 && (
            <>
              <Confetti />
              <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
                {studentProfileId && <PepperAvatar studentProfileId={studentProfileId} size="lg" showName={false} />}
              </div>

              <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#2D3436', textAlign: 'center', marginBottom: '12px', lineHeight: 1.3 }}>
                Awesome{studentName ? `, ${studentName}` : ''}! 🎉<br />You're all set!
              </h2>
              <p style={{ fontSize: '16px', color: '#636E72', textAlign: 'center', marginBottom: '32px' }}>
                Your penguin looks amazing! You can buy more accessories in the Reward Shop and change your look in My Locker anytime! 🌟
              </p>

              <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '360px' }}>
                <button onClick={goBack} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '2px solid rgba(0,0,0,0.1)', background: 'white', color: '#636E72', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                <button
                  onClick={handleFinish}
                  disabled={isSaving}
                  style={{
                    flex: 2, padding: '16px', borderRadius: '50px', border: 'none',
                    background: isSaving ? '#B2BEC3' : 'linear-gradient(135deg, #00B894, #00CEC9)',
                    color: 'white', fontSize: '18px', fontWeight: 800,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 30px rgba(0,184,148,0.35)',
                    animation: isSaving ? 'none' : 'pulse-glow 2s ease-in-out infinite',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Start Learning! 🚀'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
